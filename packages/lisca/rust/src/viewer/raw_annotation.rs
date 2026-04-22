use std::fs;
use std::io::Cursor;

use base64::prelude::{Engine as _, BASE64_STANDARD};
use png::{BitDepth, ColorType, Decoder as PngDecoder};
use serde::{Deserialize, Serialize};

use crate::viewer::domain::{
    current_timestamp, workspace_annotation_raw_pos_dir_path, workspace_annotation_raw_source_path,
    workspace_raw_annotation_json_path, workspace_raw_annotation_mask_path,
    workspace_relative_path, FrameRequest, LoadedRawFrameAnnotation, RawFrameAnnotation,
    RawFrameAnnotationPayload, RawFrameRequest, ViewerSource,
};
use crate::viewer::image::load_frame;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct RawAnnotationSourceFile {
    source: ViewerSource,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct RawFrameAnnotationFile {
    #[serde(default = "annotation_schema_version")]
    schema_version: u32,
    classification_label_id: Option<String>,
    mask_file_name: Option<String>,
    updated_at: String,
}

fn annotation_schema_version() -> u32 {
    1
}

fn empty_annotation() -> RawFrameAnnotation {
    RawFrameAnnotation {
        classification_label_id: None,
        mask_path: None,
        updated_at: None,
    }
}

fn to_frame_request(request: &RawFrameRequest) -> FrameRequest {
    FrameRequest {
        pos: request.pos,
        channel: request.channel,
        time: request.time,
        z: request.z,
    }
}

fn decode_png_mask(bytes: &[u8]) -> Result<(u32, u32, Vec<u8>), String> {
    let decoder = PngDecoder::new(Cursor::new(bytes));
    let mut reader = decoder.read_info().map_err(|err| err.to_string())?;
    let mut buffer = vec![0; reader.output_buffer_size()];
    let info = reader
        .next_frame(&mut buffer)
        .map_err(|err| err.to_string())?;
    if info.bit_depth != BitDepth::Eight {
        return Err(format!(
            "Unsupported annotation mask bit depth {:?}; expected 8-bit PNG",
            info.bit_depth
        ));
    }

    let data = &buffer[..info.buffer_size()];
    let mut mask = Vec::with_capacity((info.width * info.height) as usize);
    match info.color_type {
        ColorType::Grayscale => mask.extend_from_slice(data),
        ColorType::GrayscaleAlpha => {
            for chunk in data.chunks_exact(2) {
                mask.push(chunk[0]);
            }
        }
        ColorType::Rgb => {
            for chunk in data.chunks_exact(3) {
                mask.push(chunk[0]);
            }
        }
        ColorType::Rgba => {
            for chunk in data.chunks_exact(4) {
                mask.push(chunk[0]);
            }
        }
        ColorType::Indexed => return Err("Indexed PNG masks are not supported".to_string()),
    }

    Ok((info.width, info.height, mask))
}

fn validate_mask_pixels(
    mask: &[u8],
    width: u32,
    height: u32,
    label_count: usize,
) -> Result<(), String> {
    let expected = (width as usize).saturating_mul(height as usize);
    if mask.len() != expected {
        return Err(format!(
            "Annotation mask pixel count {} does not match expected frame size {}",
            mask.len(),
            expected
        ));
    }

    let max_allowed = label_count.min(u8::MAX as usize) as u8;
    if let Some(value) = mask.iter().copied().find(|value| *value > max_allowed) {
        return Err(format!(
            "Annotation mask contains class index {} beyond configured label range {}",
            value, max_allowed
        ));
    }

    Ok(())
}

fn read_raw_annotation_source(workspace_path: &str) -> Result<Option<ViewerSource>, String> {
    let path = workspace_annotation_raw_source_path(workspace_path);
    let bytes = match fs::read(&path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => {
            return Err(format!(
                "Failed to read raw annotation source at {}: {error}",
                path.display()
            ))
        }
    };
    let parsed = serde_json::from_slice::<RawAnnotationSourceFile>(&bytes)
        .map_err(|err| format!("{}: {err}", path.display()))?;
    Ok(Some(parsed.source))
}

fn ensure_workspace_source(workspace_path: &str, source: &ViewerSource) -> Result<(), String> {
    if let Some(existing) = read_raw_annotation_source(workspace_path)? {
        if existing != *source {
            return Err(format!(
                "Workspace raw annotations are bound to a different source ({}).",
                source_path(&existing)
            ));
        }
    }
    Ok(())
}

fn write_raw_annotation_source(workspace_path: &str, source: &ViewerSource) -> Result<(), String> {
    let path = workspace_annotation_raw_source_path(workspace_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let bytes = serde_json::to_vec_pretty(&RawAnnotationSourceFile {
        source: source.clone(),
    })
    .map_err(|err| err.to_string())?;
    fs::write(path, bytes).map_err(|err| err.to_string())
}

fn source_path(source: &ViewerSource) -> &str {
    match source {
        ViewerSource::Tif { path }
        | ViewerSource::Jpg { path }
        | ViewerSource::Nd2 { path }
        | ViewerSource::Czi { path } => path,
    }
}

pub fn load_raw_annotation_source(workspace_path: String) -> Result<Option<ViewerSource>, String> {
    read_raw_annotation_source(&workspace_path)
}

pub fn load_raw_frame_annotation(
    workspace_path: String,
    source: ViewerSource,
    request: RawFrameRequest,
) -> Result<LoadedRawFrameAnnotation, String> {
    ensure_workspace_source(&workspace_path, &source)?;

    let annotation_path = workspace_raw_annotation_json_path(&workspace_path, &request);
    if !annotation_path.is_file() {
        return Ok(LoadedRawFrameAnnotation {
            annotation: empty_annotation(),
            mask_base64_png: None,
        });
    }

    let frame = load_frame(source, to_frame_request(&request))?;
    let bytes = fs::read(&annotation_path).map_err(|err| err.to_string())?;
    let annotation = serde_json::from_slice::<RawFrameAnnotationFile>(&bytes)
        .map_err(|err| format!("{}: {err}", annotation_path.display()))?;

    let (mask_path, mask_base64_png) =
        if let Some(mask_file_name) = annotation.mask_file_name.clone() {
            let path = workspace_annotation_raw_pos_dir_path(&workspace_path, request.pos)
                .join(mask_file_name);
            let mask_bytes = fs::read(&path).map_err(|err| err.to_string())?;
            let (mask_width, mask_height, _) = decode_png_mask(&mask_bytes)?;
            if mask_width != frame.width || mask_height != frame.height {
                return Err(format!(
                    "Annotation mask {} dimensions {}x{} do not match raw frame {}x{}",
                    path.display(),
                    mask_width,
                    mask_height,
                    frame.width,
                    frame.height
                ));
            }
            (
                Some(workspace_relative_path(&workspace_path, &path)),
                Some(BASE64_STANDARD.encode(mask_bytes)),
            )
        } else {
            (None, None)
        };

    Ok(LoadedRawFrameAnnotation {
        annotation: RawFrameAnnotation {
            classification_label_id: annotation.classification_label_id,
            mask_path,
            updated_at: Some(annotation.updated_at),
        },
        mask_base64_png,
    })
}

pub fn save_raw_frame_annotation(
    workspace_path: String,
    source: ViewerSource,
    request: RawFrameRequest,
    annotation: RawFrameAnnotationPayload,
) -> Result<RawFrameAnnotation, String> {
    ensure_workspace_source(&workspace_path, &source)?;

    let labels = crate::viewer::roi::load_annotation_labels(workspace_path.clone())?;
    if let Some(label_id) = annotation.classification_label_id.as_ref() {
        if !labels.iter().any(|label| label.id == *label_id) {
            return Err(format!("Unknown annotation label id '{}'", label_id));
        }
    }

    let annotation_dir = workspace_annotation_raw_pos_dir_path(&workspace_path, request.pos);
    let annotation_path = workspace_raw_annotation_json_path(&workspace_path, &request);
    let mask_path = workspace_raw_annotation_mask_path(&workspace_path, &request);

    if annotation.classification_label_id.is_none() && annotation.mask_base64_png.is_none() {
        if annotation_path.exists() {
            fs::remove_file(&annotation_path).map_err(|err| err.to_string())?;
        }
        if mask_path.exists() {
            fs::remove_file(&mask_path).map_err(|err| err.to_string())?;
        }
        return Ok(empty_annotation());
    }

    let frame = load_frame(source.clone(), to_frame_request(&request))?;
    let label_count = labels.len();

    fs::create_dir_all(&annotation_dir).map_err(|err| err.to_string())?;
    if read_raw_annotation_source(&workspace_path)?.is_none() {
        write_raw_annotation_source(&workspace_path, &source)?;
    }

    let mask_file_name = if let Some(mask_base64_png) = annotation.mask_base64_png.as_ref() {
        let mask_bytes = BASE64_STANDARD
            .decode(mask_base64_png)
            .map_err(|err| format!("Invalid annotation PNG payload: {err}"))?;
        let (mask_width, mask_height, mask_pixels) = decode_png_mask(&mask_bytes)?;
        if mask_width != frame.width || mask_height != frame.height {
            return Err(format!(
                "Annotation mask dimensions {}x{} do not match raw frame {}x{}",
                mask_width, mask_height, frame.width, frame.height
            ));
        }
        validate_mask_pixels(&mask_pixels, mask_width, mask_height, label_count)?;
        fs::write(&mask_path, mask_bytes).map_err(|err| err.to_string())?;
        Some(
            mask_path
                .file_name()
                .ok_or_else(|| "Failed to resolve annotation mask file name".to_string())?
                .to_string_lossy()
                .to_string(),
        )
    } else {
        if mask_path.exists() {
            fs::remove_file(&mask_path).map_err(|err| err.to_string())?;
        }
        None
    };

    let updated_at = current_timestamp()?;
    let annotation_file = RawFrameAnnotationFile {
        schema_version: annotation_schema_version(),
        classification_label_id: annotation.classification_label_id.clone(),
        mask_file_name: mask_file_name.clone(),
        updated_at: updated_at.clone(),
    };
    let bytes = serde_json::to_vec_pretty(&annotation_file).map_err(|err| err.to_string())?;
    fs::write(&annotation_path, bytes).map_err(|err| err.to_string())?;

    Ok(RawFrameAnnotation {
        classification_label_id: annotation.classification_label_id,
        mask_path: mask_file_name.map(|_| workspace_relative_path(&workspace_path, &mask_path)),
        updated_at: Some(updated_at),
    })
}

#[cfg(test)]
mod tests {
    use std::fs::File;
    use std::io::BufWriter;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    use png::{BitDepth, ColorType, Encoder as PngEncoder};
    use tiff::encoder::{colortype, TiffEncoder};

    use super::*;

    fn unique_test_dir(name: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("lisca-{name}-{suffix}"));
        fs::create_dir_all(&path).expect("create test directory");
        path
    }

    fn write_tiff(path: &Path, width: u32, height: u32, data: &[u16]) {
        let file = File::create(path).expect("create tiff");
        let mut encoder = TiffEncoder::new(BufWriter::new(file)).expect("create encoder");
        encoder
            .write_image::<colortype::Gray16>(width, height, data)
            .expect("write image");
    }

    fn encode_png_base64(width: u32, height: u32, data: &[u8]) -> String {
        let mut bytes = Vec::new();
        {
            let mut encoder = PngEncoder::new(&mut bytes, width, height);
            encoder.set_color(ColorType::Grayscale);
            encoder.set_depth(BitDepth::Eight);
            let mut writer = encoder.write_header().expect("write png header");
            writer.write_image_data(data).expect("write png data");
        }
        BASE64_STANDARD.encode(bytes)
    }

    fn create_workspace_source(root: &Path, suffix: &str) -> ViewerSource {
        let source_path = root.join(format!("source-{suffix}"));
        let pos_dir = source_path.join("Pos0");
        fs::create_dir_all(&pos_dir).expect("create source position dir");
        write_tiff(
            &pos_dir.join("img_channel0_position0_time0_z0.tif"),
            2,
            2,
            &[1, 2, 3, 4],
        );
        ViewerSource::Tif {
            path: source_path.to_string_lossy().to_string(),
        }
    }

    fn write_labels(workspace: &Path) {
        let labels_path = workspace.join("annotations").join("labels.json");
        fs::create_dir_all(labels_path.parent().expect("labels parent"))
            .expect("create labels dir");
        let bytes = serde_json::to_vec_pretty(&serde_json::json!({
            "labels": [
                { "id": "live", "name": "Live", "color": "#00ff00" }
            ]
        }))
        .expect("serialize labels");
        fs::write(labels_path, bytes).expect("write labels");
    }

    #[test]
    fn save_raw_frame_annotation_writes_source_and_round_trips() {
        let root = unique_test_dir("raw-annotation-roundtrip");
        let workspace = root.join("workspace");
        fs::create_dir_all(&workspace).expect("create workspace");
        let source = create_workspace_source(&root, "a");
        write_labels(&workspace);

        let request = RawFrameRequest {
            pos: 0,
            channel: 0,
            time: 0,
            z: 0,
        };
        let saved = save_raw_frame_annotation(
            workspace.to_string_lossy().to_string(),
            source.clone(),
            request.clone(),
            RawFrameAnnotationPayload {
                classification_label_id: Some("live".to_string()),
                mask_base64_png: Some(encode_png_base64(2, 2, &[1, 0, 0, 1])),
                instances: None,
            },
        )
        .expect("save raw annotation");

        assert_eq!(
            saved.mask_path.as_deref(),
            Some("annotations/raw/Pos0/C0_T0_Z0.png")
        );
        assert!(workspace
            .join("annotations")
            .join("raw")
            .join("source.json")
            .is_file());

        let loaded =
            load_raw_frame_annotation(workspace.to_string_lossy().to_string(), source, request)
                .expect("load raw annotation");

        assert_eq!(
            loaded.annotation.classification_label_id.as_deref(),
            Some("live")
        );
        assert!(loaded.mask_base64_png.is_some());

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn save_raw_frame_annotation_rejects_source_mismatch() {
        let root = unique_test_dir("raw-annotation-mismatch");
        let workspace = root.join("workspace");
        fs::create_dir_all(&workspace).expect("create workspace");
        let source_a = create_workspace_source(&root, "a");
        let source_b = create_workspace_source(&root, "b");
        write_labels(&workspace);

        let request = RawFrameRequest {
            pos: 0,
            channel: 0,
            time: 0,
            z: 0,
        };

        save_raw_frame_annotation(
            workspace.to_string_lossy().to_string(),
            source_a,
            request.clone(),
            RawFrameAnnotationPayload {
                classification_label_id: Some("live".to_string()),
                mask_base64_png: Some(encode_png_base64(2, 2, &[1, 0, 0, 1])),
                instances: None,
            },
        )
        .expect("save first raw annotation");

        let error = save_raw_frame_annotation(
            workspace.to_string_lossy().to_string(),
            source_b,
            request,
            RawFrameAnnotationPayload {
                classification_label_id: Some("live".to_string()),
                mask_base64_png: Some(encode_png_base64(2, 2, &[1, 0, 0, 1])),
                instances: None,
            },
        )
        .expect_err("source mismatch");

        assert!(error.contains("bound to a different source"));

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn save_raw_frame_annotation_rejects_mask_dimension_mismatch() {
        let root = unique_test_dir("raw-annotation-size");
        let workspace = root.join("workspace");
        fs::create_dir_all(&workspace).expect("create workspace");
        let source = create_workspace_source(&root, "a");
        write_labels(&workspace);

        let error = save_raw_frame_annotation(
            workspace.to_string_lossy().to_string(),
            source,
            RawFrameRequest {
                pos: 0,
                channel: 0,
                time: 0,
                z: 0,
            },
            RawFrameAnnotationPayload {
                classification_label_id: Some("live".to_string()),
                mask_base64_png: Some(encode_png_base64(1, 1, &[1])),
                instances: None,
            },
        )
        .expect_err("mask size mismatch");

        assert!(error.contains("do not match raw frame"));

        let _ = fs::remove_dir_all(root);
    }
}

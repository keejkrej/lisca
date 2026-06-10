use std::{
    collections::BTreeSet,
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use base64::prelude::{Engine as _, BASE64_STANDARD};
use image::GenericImageView;

use crate::{
    image_source::RawFrame,
    protocol::{
        AnnotationLabel, LoadedRoiFrameAnnotation, RoiFrameAnnotation, RoiFrameAnnotationPayload,
        RoiFrameRequest, RoiIndexFile, RoiPositionScan, RoiWorkspaceScan,
    },
    tiff_io,
};

#[derive(serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
enum AnnotationLabelsFile {
    Wrapped { labels: Vec<AnnotationLabel> },
    Array(Vec<AnnotationLabel>),
}

#[derive(serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct RoiFrameAnnotationFile {
    #[serde(default = "annotation_schema_version")]
    schema_version: u32,
    classification_label_id: Option<String>,
    mask_file_name: Option<String>,
    updated_at: String,
}

fn annotation_schema_version() -> u32 {
    1
}

pub fn scan_roi_workspace(workspace_path: &str) -> Result<RoiWorkspaceScan, String> {
    let root = workspace_roi_root_path(workspace_path);
    if !root.is_dir() {
        return Ok(RoiWorkspaceScan {
            positions: Vec::new(),
        });
    }

    let mut positions = Vec::new();
    for entry in fs::read_dir(&root).map_err(|error| error.to_string())?.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let Some(name) = entry.file_name().to_str().map(str::to_string) else {
            continue;
        };
        let Some(pos) = parse_pos_dir_name(&name) else {
            continue;
        };
        let index = read_roi_index(workspace_path, pos)?;
        positions.push(RoiPositionScan {
            pos,
            source: index.source.clone(),
            channels: axis_values(index.channel_count),
            times: axis_values(index.time_count),
            z_slices: axis_values(index.z_count),
            rois: index.rois,
        });
    }

    positions.sort_by_key(|entry| entry.pos);
    Ok(RoiWorkspaceScan { positions })
}

pub fn load_annotation_labels(workspace_path: &str) -> Result<Vec<AnnotationLabel>, String> {
    read_annotation_labels(workspace_path)
}

pub fn save_annotation_labels(
    workspace_path: &str,
    labels: Vec<AnnotationLabel>,
) -> Result<Vec<AnnotationLabel>, String> {
    validate_annotation_labels(&labels, &workspace_annotation_labels_path(workspace_path))?;
    fs::create_dir_all(workspace_annotations_dir_path(workspace_path))
        .map_err(|error| error.to_string())?;
    let path = workspace_annotation_labels_path(workspace_path);
    let bytes = serde_json::to_vec_pretty(&AnnotationLabelsFile::Wrapped {
        labels: labels.clone(),
    })
    .map_err(|error| error.to_string())?;
    fs::write(path, bytes).map_err(|error| error.to_string())?;
    Ok(labels)
}

pub fn load_roi_frame(workspace_path: &str, request: RoiFrameRequest) -> Result<RawFrame, String> {
    let index = read_roi_index(workspace_path, request.pos)?;
    let roi = index
        .rois
        .iter()
        .find(|entry| entry.roi == request.roi)
        .ok_or_else(|| format!("ROI {} not found for Pos{}", request.roi, request.pos))?;

    if request.time >= index.time_count {
        return Err(format!("Time index {} is out of range", request.time));
    }
    if request.channel >= index.channel_count {
        return Err(format!("Channel index {} is out of range", request.channel));
    }
    if request.z >= index.z_count {
        return Err(format!("Z index {} is out of range", request.z));
    }

    let page = ((request.time * index.channel_count + request.channel) * index.z_count + request.z)
        as usize;
    let frame = tiff_io::load_tiff_frame_page(
        &workspace_roi_tiff_path(workspace_path, request.pos, request.roi),
        page,
    )?;
    if frame.width != roi.bbox.w || frame.height != roi.bbox.h {
        return Err(format!(
            "ROI {} TIFF page dimensions {}x{} do not match index {}x{}",
            request.roi, frame.width, frame.height, roi.bbox.w, roi.bbox.h
        ));
    }

    Ok(RawFrame {
        width: frame.width,
        height: frame.height,
        data: frame.data,
        contrast_domain: crate::protocol::ContrastWindow {
            min: 0,
            max: frame.max_value,
        },
    })
}

pub fn load_roi_frame_annotation(
    workspace_path: &str,
    request: RoiFrameRequest,
) -> Result<LoadedRoiFrameAnnotation, String> {
    let index = read_roi_index(workspace_path, request.pos)?;
    let roi = index
        .rois
        .iter()
        .find(|entry| entry.roi == request.roi)
        .ok_or_else(|| format!("ROI {} not found for Pos{}", request.roi, request.pos))?;
    let annotation_path = workspace_annotation_json_path(workspace_path, &request);
    if !annotation_path.is_file() {
        return Ok(LoadedRoiFrameAnnotation {
            annotation: empty_annotation(),
            mask_base64_png: None,
        });
    }

    let bytes = fs::read(&annotation_path).map_err(|error| error.to_string())?;
    let annotation = serde_json::from_slice::<RoiFrameAnnotationFile>(&bytes)
        .map_err(|error| format!("{}: {error}", annotation_path.display()))?;

    let (mask_path, mask_base64_png) =
        if let Some(mask_file_name) = annotation.mask_file_name.clone() {
            let path = workspace_annotation_roi_dir_path(workspace_path, &request).join(mask_file_name);
            let mask_bytes = fs::read(&path).map_err(|error| error.to_string())?;
            let (width, height, _) = decode_png_mask(&mask_bytes)?;
            if width != roi.bbox.w || height != roi.bbox.h {
                return Err(format!(
                    "Annotation mask {} dimensions {}x{} do not match ROI {} frame {}x{}",
                    path.display(),
                    width,
                    height,
                    roi.roi,
                    roi.bbox.w,
                    roi.bbox.h
                ));
            }
            (
                Some(workspace_relative_path(workspace_path, &path)),
                Some(BASE64_STANDARD.encode(mask_bytes)),
            )
        } else {
            (None, None)
        };

    Ok(LoadedRoiFrameAnnotation {
        annotation: RoiFrameAnnotation {
            classification_label_id: annotation.classification_label_id,
            mask_path,
            updated_at: Some(annotation.updated_at),
        },
        mask_base64_png,
    })
}

pub fn save_roi_frame_annotation(
    workspace_path: &str,
    request: RoiFrameRequest,
    annotation: RoiFrameAnnotationPayload,
) -> Result<RoiFrameAnnotation, String> {
    let index = read_roi_index(workspace_path, request.pos)?;
    let roi = index
        .rois
        .iter()
        .find(|entry| entry.roi == request.roi)
        .ok_or_else(|| format!("ROI {} not found for Pos{}", request.roi, request.pos))?;
    let labels = read_annotation_labels(workspace_path)?;

    if let Some(label_id) = annotation.classification_label_id.as_ref() {
        if !labels.iter().any(|label| label.id == *label_id) {
            return Err(format!("Unknown annotation label id '{label_id}'"));
        }
    }

    let annotation_dir = workspace_annotation_roi_dir_path(workspace_path, &request);
    let annotation_path = workspace_annotation_json_path(workspace_path, &request);
    let mask_path = workspace_annotation_mask_path(workspace_path, &request);

    if annotation.classification_label_id.is_none() && annotation.mask_base64_png.is_none() {
        remove_if_exists(&annotation_path)?;
        remove_if_exists(&mask_path)?;
        return Ok(empty_annotation());
    }

    fs::create_dir_all(&annotation_dir).map_err(|error| error.to_string())?;
    let mask_file_name = if let Some(mask_base64_png) = annotation.mask_base64_png.as_ref() {
        let mask_bytes = BASE64_STANDARD
            .decode(mask_base64_png)
            .map_err(|error| format!("Invalid annotation PNG payload: {error}"))?;
        let (width, height, mask) = decode_png_mask(&mask_bytes)?;
        if width != roi.bbox.w || height != roi.bbox.h {
            return Err(format!(
                "Annotation mask dimensions {}x{} do not match ROI {} frame {}x{}",
                width, height, roi.roi, roi.bbox.w, roi.bbox.h
            ));
        }
        validate_mask_pixels(&mask, labels.len())?;
        fs::write(&mask_path, mask_bytes).map_err(|error| error.to_string())?;
        Some(
            mask_path
                .file_name()
                .ok_or_else(|| "Failed to resolve annotation mask file name".to_string())?
                .to_string_lossy()
                .to_string(),
        )
    } else {
        remove_if_exists(&mask_path)?;
        None
    };

    let updated_at = current_timestamp();
    let file = RoiFrameAnnotationFile {
        schema_version: annotation_schema_version(),
        classification_label_id: annotation.classification_label_id.clone(),
        mask_file_name: mask_file_name.clone(),
        updated_at: updated_at.clone(),
    };
    let bytes = serde_json::to_vec_pretty(&file).map_err(|error| error.to_string())?;
    fs::write(&annotation_path, bytes).map_err(|error| error.to_string())?;

    Ok(RoiFrameAnnotation {
        classification_label_id: annotation.classification_label_id,
        mask_path: mask_file_name.map(|_| workspace_relative_path(workspace_path, &mask_path)),
        updated_at: Some(updated_at),
    })
}

fn read_roi_index(workspace_path: &str, pos: u32) -> Result<RoiIndexFile, String> {
    let path = workspace_roi_index_path(workspace_path, pos);
    let bytes = fs::read(&path).map_err(|error| error.to_string())?;
    let index = serde_json::from_slice::<RoiIndexFile>(&bytes)
        .map_err(|error| format!("{}: {error}", path.display()))?;

    if index.position != pos {
        return Err(format!(
            "ROI index position {} does not match Pos{}",
            index.position, pos
        ));
    }
    if index.axis_order != "TCZYX" {
        return Err(format!(
            "Unsupported ROI axis order '{}' for Pos{}",
            index.axis_order, pos
        ));
    }
    if index.page_order != ["t", "c", "z"] {
        return Err(format!(
            "Unsupported ROI page order {:?} for Pos{}",
            index.page_order, pos
        ));
    }
    for roi in &index.rois {
        if roi.shape
            != [
                index.time_count,
                index.channel_count,
                index.z_count,
                roi.bbox.h,
                roi.bbox.w,
            ]
        {
            return Err(format!("ROI {} shape metadata does not match index", roi.roi));
        }
    }
    Ok(index)
}

fn read_annotation_labels(workspace_path: &str) -> Result<Vec<AnnotationLabel>, String> {
    let path = workspace_annotation_labels_path(workspace_path);
    let bytes = match fs::read(&path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(error.to_string()),
    };
    let parsed = serde_json::from_slice::<AnnotationLabelsFile>(&bytes)
        .map_err(|error| format!("{}: {error}", path.display()))?;
    let labels = match parsed {
        AnnotationLabelsFile::Wrapped { labels } | AnnotationLabelsFile::Array(labels) => labels,
    };
    validate_annotation_labels(&labels, &path)?;
    Ok(labels)
}

fn validate_annotation_labels(labels: &[AnnotationLabel], path: &Path) -> Result<(), String> {
    let mut ids = BTreeSet::new();
    for label in labels {
        if label.id.trim().is_empty() || label.name.trim().is_empty() || label.color.trim().is_empty()
        {
            return Err(format!("Annotation labels at {} contain empty fields", path.display()));
        }
        if !ids.insert(label.id.clone()) {
            return Err(format!(
                "Annotation labels at {} contain duplicate id '{}'",
                path.display(),
                label.id
            ));
        }
    }
    Ok(())
}

fn decode_png_mask(bytes: &[u8]) -> Result<(u32, u32, Vec<u8>), String> {
    let image = image::load_from_memory(bytes).map_err(|error| error.to_string())?;
    let (width, height) = image.dimensions();
    Ok((width, height, image.to_luma8().into_raw()))
}

fn validate_mask_pixels(mask: &[u8], label_count: usize) -> Result<(), String> {
    let max_allowed = label_count.min(u8::MAX as usize) as u8;
    if let Some(value) = mask.iter().copied().find(|value| *value > max_allowed) {
        return Err(format!(
            "Annotation mask contains class index {} beyond configured label range {}",
            value, max_allowed
        ));
    }
    Ok(())
}

fn empty_annotation() -> RoiFrameAnnotation {
    RoiFrameAnnotation {
        classification_label_id: None,
        mask_path: None,
        updated_at: None,
    }
}

fn axis_values(count: u32) -> Vec<u32> {
    (0..count).collect()
}

fn remove_if_exists(path: &Path) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

fn parse_pos_dir_name(name: &str) -> Option<u32> {
    let normalized: String = name.chars().filter(|c| !c.is_whitespace()).collect();
    let lower = normalized.to_ascii_lowercase();
    for prefix in ["position", "pos"] {
        if let Some(rest) = lower.strip_prefix(prefix) {
            let trimmed = rest.trim_start_matches(['-', '_']);
            if !trimmed.is_empty() && trimmed.chars().all(|c| c.is_ascii_digit()) {
                return trimmed.parse().ok();
            }
        }
    }
    None
}

fn workspace_roi_root_path(root: &str) -> PathBuf {
    Path::new(root).join("roi")
}

fn workspace_roi_pos_dir_path(root: &str, pos: u32) -> PathBuf {
    workspace_roi_root_path(root).join(format!("Pos{pos}"))
}

fn workspace_roi_tiff_path(root: &str, pos: u32, roi: u32) -> PathBuf {
    workspace_roi_pos_dir_path(root, pos).join(format!("Roi{roi}.tif"))
}

fn workspace_roi_index_path(root: &str, pos: u32) -> PathBuf {
    workspace_roi_pos_dir_path(root, pos).join("index.json")
}

fn workspace_annotations_dir_path(root: &str) -> PathBuf {
    Path::new(root).join("annotations")
}

fn workspace_annotation_labels_path(root: &str) -> PathBuf {
    workspace_annotations_dir_path(root).join("labels.json")
}

fn workspace_annotation_roi_dir_path(root: &str, request: &RoiFrameRequest) -> PathBuf {
    workspace_annotations_dir_path(root)
        .join("roi")
        .join(format!("Pos{}", request.pos))
        .join(format!("Roi{}", request.roi))
}

fn annotation_frame_stem(channel: u32, time: u32, z: u32) -> String {
    format!("C{channel}_T{time}_Z{z}")
}

fn annotation_roi_frame_stem(request: &RoiFrameRequest) -> String {
    annotation_frame_stem(request.channel, request.time, request.z)
}

fn workspace_annotation_json_path(root: &str, request: &RoiFrameRequest) -> PathBuf {
    workspace_annotation_roi_dir_path(root, request)
        .join(format!("{}.json", annotation_roi_frame_stem(request)))
}

fn workspace_annotation_mask_path(root: &str, request: &RoiFrameRequest) -> PathBuf {
    workspace_annotation_roi_dir_path(root, request)
        .join(format!("{}.png", annotation_roi_frame_stem(request)))
}

fn path_to_forward_slash_string(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn workspace_relative_path(root: &str, path: &Path) -> String {
    path.strip_prefix(root)
        .map(path_to_forward_slash_string)
        .unwrap_or_else(|_| path_to_forward_slash_string(path))
}

fn current_timestamp() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    format!("unix:{seconds}")
}

#[cfg(test)]
mod tests {
    use std::{fs::File, io::Cursor};

    use image::{DynamicImage, GrayImage, ImageFormat, Luma};
    use serde_json::json;
    use tiff::encoder::{colortype, TiffEncoder};

    use super::*;

    #[test]
    fn roi_workspace_roundtrip_loads_frame_and_annotation() {
        let workspace = std::env::temp_dir().join(format!(
            "lisca-roi-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ));
        fs::create_dir_all(workspace.join("roi").join("Pos0")).expect("roi dir");
        fs::create_dir_all(workspace.join("annotations")).expect("annotations dir");

        write_roi_tiff(&workspace.join("roi").join("Pos0").join("Roi0.tif"));
        fs::write(
            workspace.join("roi").join("Pos0").join("index.json"),
            serde_json::to_vec_pretty(&json!({
                "source": {
                    "kind": "folder",
                    "path": "source",
                    "subfolderTemplate": "Pos{p}",
                    "filenameTemplate": "img_channel{c}_position{p}_time{t}_z{z}"
                },
                "position": 0,
                "axisOrder": "TCZYX",
                "pageOrder": ["t", "c", "z"],
                "channelCount": 1,
                "timeCount": 1,
                "zCount": 1,
                "rois": [{
                    "roi": 0,
                    "fileName": "Roi0.tif",
                    "bbox": { "roi": 0, "x": 1, "y": 2, "w": 4, "h": 3 },
                    "shape": [1, 1, 1, 3, 4]
                }]
            }))
            .expect("index json"),
        )
        .expect("write index");
        fs::write(
            workspace.join("annotations").join("labels.json"),
            serde_json::to_vec_pretty(&json!({
                "labels": [{ "id": "cell", "name": "Cell", "color": "#22c55e" }]
            }))
            .expect("labels json"),
        )
        .expect("write labels");

        let saved_labels = save_annotation_labels(
            &workspace.to_string_lossy(),
            vec![AnnotationLabel {
                id: "cell".to_string(),
                name: "Cell".to_string(),
                color: "#22c55e".to_string(),
            }],
        )
        .expect("save labels");
        assert_eq!(saved_labels.len(), 1);

        let workspace_path = workspace.to_string_lossy();
        let scan = scan_roi_workspace(&workspace_path).expect("scan");
        assert_eq!(scan.positions.len(), 1);
        assert_eq!(scan.positions[0].rois[0].bbox.w, 4);

        let request = RoiFrameRequest {
            pos: 0,
            roi: 0,
            channel: 0,
            time: 0,
            z: 0,
        };
        let frame = load_roi_frame(&workspace_path, request.clone()).expect("frame");
        assert_eq!((frame.width, frame.height), (4, 3));
        assert_eq!(frame.data[0], 0);
        assert_eq!(frame.data[11], 11);

        let saved = save_roi_frame_annotation(
            &workspace_path,
            request.clone(),
            RoiFrameAnnotationPayload {
                classification_label_id: None,
                mask_base64_png: Some(BASE64_STANDARD.encode(write_mask_png())),
            },
        )
        .expect("save annotation");
        assert!(saved.mask_path.as_deref().unwrap_or_default().ends_with("C0_T0_Z0.png"));

        let loaded = load_roi_frame_annotation(&workspace_path, request).expect("load annotation");
        assert!(loaded.mask_base64_png.is_some());
        assert!(loaded.annotation.updated_at.is_some());

        fs::remove_dir_all(&workspace).expect("cleanup");
    }

    fn write_roi_tiff(path: &Path) {
        let file = File::create(path).expect("create tiff");
        let mut encoder = TiffEncoder::new(file).expect("encoder");
        let image = encoder
            .new_image::<colortype::Gray8>(4, 3)
            .expect("gray image");
        image
            .write_data(&(0_u8..12).collect::<Vec<_>>())
            .expect("write image");
    }

    fn write_mask_png() -> Vec<u8> {
        let image = GrayImage::from_fn(4, 3, |x, y| {
            if x == 1 && y == 1 {
                Luma([1])
            } else {
                Luma([0])
            }
        });
        let mut bytes = Cursor::new(Vec::new());
        DynamicImage::ImageLuma8(image)
            .write_to(&mut bytes, ImageFormat::Png)
            .expect("write png");
        bytes.into_inner()
    }
}

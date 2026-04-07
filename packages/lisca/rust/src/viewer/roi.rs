use std::collections::{BTreeSet, HashMap};
use std::fs::{self, File};
use std::io::{BufWriter, Cursor};
use std::path::{Path, PathBuf};

use base64::prelude::{Engine as _, BASE64_STANDARD};
use czi_rs::{CziFile, Dimension as CziDimension, PlaneIndex};
use nd2_rs::Nd2File;
use png::{BitDepth, ColorType, Decoder as PngDecoder};
use serde::{Deserialize, Serialize};
use tiff::encoder::{colortype, TiffEncoder};

use crate::viewer::domain::{
    current_timestamp, dimension_size, dimension_values, parse_bbox_csv_name, roi_axis_values,
    validate_request_index, workspace_annotation_json_path, workspace_annotation_labels_path,
    workspace_annotation_mask_path, workspace_annotation_roi_dir_path, workspace_bbox_csv_path,
    workspace_align_json_path, workspace_relative_path, workspace_roi_index_path, workspace_roi_pos_dir_path,
    workspace_roi_tiff_path, AnnotationLabel, CropOutputFormat, CropRoiResponse, CropRoiStatus,
    LoadedRoiFrameAnnotation, RoiBbox, RoiFrameAnnotation, RoiFrameAnnotationPayload,
    RoiFrameRequest, RoiIndexEntry, RoiIndexFile, RoiPositionScan, RoiWorkspaceScan,
    SaveBboxResponse, SavedAlignState, ViewerSource,
};
use crate::viewer::image::{
    collect_tiffs, czi_bitmap_to_u16, find_position_dir, load_tiff_frame, load_tiff_frame_page,
    RawFrame,
};

#[derive(Deserialize, Serialize)]
#[serde(untagged)]
enum AnnotationLabelsFile {
    Wrapped { labels: Vec<AnnotationLabel> },
    Array(Vec<AnnotationLabel>),
}

#[derive(Deserialize, Serialize)]
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

fn read_roi_index(workspace_path: &str, pos: u32) -> Result<RoiIndexFile, String> {
    let path = workspace_roi_index_path(workspace_path, pos);
    let bytes = fs::read(&path).map_err(|err| err.to_string())?;
    let index = serde_json::from_slice::<RoiIndexFile>(&bytes)
        .map_err(|err| format!("{}: {err}", path.display()))?;

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

    let has_supported_page_order = index.page_order.len() == 3
        && index.page_order[0] == "t"
        && index.page_order[1] == "c"
        && index.page_order[2] == "z";
    if !has_supported_page_order {
        return Err(format!(
            "Unsupported ROI page order {:?} for Pos{}",
            index.page_order, pos
        ));
    }

    for roi in &index.rois {
        if roi.shape[0] != index.time_count
            || roi.shape[1] != index.channel_count
            || roi.shape[2] != index.z_count
            || roi.shape[3] != roi.bbox.h
            || roi.shape[4] != roi.bbox.w
        {
            return Err(format!(
                "ROI {} shape metadata does not match index",
                roi.roi
            ));
        }
    }

    Ok(index)
}

fn read_annotation_labels(workspace_path: &str) -> Result<Vec<AnnotationLabel>, String> {
    let path = workspace_annotation_labels_path(workspace_path);
    let bytes = match fs::read(&path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => {
            return Err(format!(
                "Failed to read annotation labels at {}: {error}",
                path.display()
            ))
        }
    };

    let parsed = serde_json::from_slice::<AnnotationLabelsFile>(&bytes)
        .map_err(|err| format!("{}: {err}", path.display()))?;
    let labels = match parsed {
        AnnotationLabelsFile::Wrapped { labels } => labels,
        AnnotationLabelsFile::Array(labels) => labels,
    };

    validate_annotation_labels(&labels, &path)?;
    Ok(labels)
}

fn validate_annotation_labels(labels: &[AnnotationLabel], path: &Path) -> Result<(), String> {
    let mut ids = BTreeSet::new();
    for label in labels {
        if label.id.trim().is_empty() {
            return Err(format!(
                "Annotation labels at {} contain an empty id",
                path.display()
            ));
        }
        if label.name.trim().is_empty() {
            return Err(format!(
                "Annotation labels at {} contain an empty name for id '{}'",
                path.display(),
                label.id
            ));
        }
        if label.color.trim().is_empty() {
            return Err(format!(
                "Annotation labels at {} contain an empty color for id '{}'",
                path.display(),
                label.id
            ));
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

fn empty_annotation() -> RoiFrameAnnotation {
    RoiFrameAnnotation {
        classification_label_id: None,
        mask_path: None,
        updated_at: None,
    }
}

pub fn load_annotation_labels(workspace_path: String) -> Result<Vec<AnnotationLabel>, String> {
    read_annotation_labels(&workspace_path)
}

pub fn save_annotation_labels(
    workspace_path: String,
    labels: Vec<AnnotationLabel>,
) -> Result<Vec<AnnotationLabel>, String> {
    let path = workspace_annotation_labels_path(&workspace_path);
    validate_annotation_labels(&labels, &path)?;

    if labels.is_empty() {
        if path.exists() {
            fs::remove_file(&path).map_err(|err| err.to_string())?;
        }
        return Ok(Vec::new());
    }

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    let bytes = serde_json::to_vec_pretty(&AnnotationLabelsFile::Wrapped {
        labels: labels.clone(),
    })
    .map_err(|err| err.to_string())?;
    fs::write(&path, bytes).map_err(|err| err.to_string())?;
    Ok(labels)
}

pub fn load_roi_frame_annotation(
    workspace_path: String,
    request: RoiFrameRequest,
) -> Result<LoadedRoiFrameAnnotation, String> {
    let index = read_roi_index(&workspace_path, request.pos)?;
    let roi = index
        .rois
        .iter()
        .find(|entry| entry.roi == request.roi)
        .ok_or_else(|| format!("ROI {} not found for Pos{}", request.roi, request.pos))?;
    let annotation_path = workspace_annotation_json_path(&workspace_path, &request);
    if !annotation_path.is_file() {
        return Ok(LoadedRoiFrameAnnotation {
            annotation: empty_annotation(),
            mask_base64_png: None,
        });
    }

    let bytes = fs::read(&annotation_path).map_err(|err| err.to_string())?;
    let annotation = serde_json::from_slice::<RoiFrameAnnotationFile>(&bytes)
        .map_err(|err| format!("{}: {err}", annotation_path.display()))?;

    let (mask_path, mask_base64_png) =
        if let Some(mask_file_name) = annotation.mask_file_name.clone() {
            let path =
                workspace_annotation_roi_dir_path(&workspace_path, &request).join(mask_file_name);
            let mask_bytes = fs::read(&path).map_err(|err| err.to_string())?;
            let (mask_width, mask_height, _) = decode_png_mask(&mask_bytes)?;
            if mask_width != roi.bbox.w || mask_height != roi.bbox.h {
                return Err(format!(
                    "Annotation mask {} dimensions {}x{} do not match ROI {} frame {}x{}",
                    path.display(),
                    mask_width,
                    mask_height,
                    roi.roi,
                    roi.bbox.w,
                    roi.bbox.h
                ));
            }
            (
                Some(workspace_relative_path(&workspace_path, &path)),
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
    workspace_path: String,
    request: RoiFrameRequest,
    annotation: RoiFrameAnnotationPayload,
) -> Result<RoiFrameAnnotation, String> {
    let index = read_roi_index(&workspace_path, request.pos)?;
    let roi = index
        .rois
        .iter()
        .find(|entry| entry.roi == request.roi)
        .ok_or_else(|| format!("ROI {} not found for Pos{}", request.roi, request.pos))?;
    let labels = read_annotation_labels(&workspace_path)?;
    let label_count = labels.len();

    if let Some(label_id) = annotation.classification_label_id.as_ref() {
        if !labels.iter().any(|label| label.id == *label_id) {
            return Err(format!("Unknown annotation label id '{}'", label_id));
        }
    }

    let annotation_dir = workspace_annotation_roi_dir_path(&workspace_path, &request);
    let annotation_path = workspace_annotation_json_path(&workspace_path, &request);
    let mask_path = workspace_annotation_mask_path(&workspace_path, &request);

    if annotation.classification_label_id.is_none() && annotation.mask_base64_png.is_none() {
        if annotation_path.exists() {
            fs::remove_file(&annotation_path).map_err(|err| err.to_string())?;
        }
        if mask_path.exists() {
            fs::remove_file(&mask_path).map_err(|err| err.to_string())?;
        }
        return Ok(empty_annotation());
    }

    fs::create_dir_all(&annotation_dir).map_err(|err| err.to_string())?;

    let mask_file_name = if let Some(mask_base64_png) = annotation.mask_base64_png.as_ref() {
        let mask_bytes = BASE64_STANDARD
            .decode(mask_base64_png)
            .map_err(|err| format!("Invalid annotation PNG payload: {err}"))?;
        let (mask_width, mask_height, mask_pixels) = decode_png_mask(&mask_bytes)?;
        if mask_width != roi.bbox.w || mask_height != roi.bbox.h {
            return Err(format!(
                "Annotation mask dimensions {}x{} do not match ROI {} frame {}x{}",
                mask_width, mask_height, roi.roi, roi.bbox.w, roi.bbox.h
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
    let annotation_file = RoiFrameAnnotationFile {
        schema_version: annotation_schema_version(),
        classification_label_id: annotation.classification_label_id.clone(),
        mask_file_name: mask_file_name.clone(),
        updated_at: updated_at.clone(),
    };
    let bytes = serde_json::to_vec_pretty(&annotation_file).map_err(|err| err.to_string())?;
    fs::write(&annotation_path, bytes).map_err(|err| err.to_string())?;

    Ok(RoiFrameAnnotation {
        classification_label_id: annotation.classification_label_id,
        mask_path: mask_file_name.map(|_| workspace_relative_path(&workspace_path, &mask_path)),
        updated_at: Some(updated_at),
    })
}

fn parse_bbox_csv(path: &Path) -> Result<Vec<RoiBbox>, String> {
    let csv = fs::read_to_string(path).map_err(|err| err.to_string())?;
    let mut lines = csv.lines().filter(|line| !line.trim().is_empty());
    let header = lines
        .next()
        .ok_or_else(|| "BBox CSV is empty".to_string())?
        .split(',')
        .map(|value| value.trim().to_ascii_lowercase())
        .collect::<Vec<_>>();

    let roi_idx = header
        .iter()
        .position(|value| value == "roi" || value == "crop")
        .ok_or_else(|| "BBox CSV is missing roi/crop column".to_string())?;
    let x_idx = header
        .iter()
        .position(|value| value == "x")
        .ok_or_else(|| "BBox CSV is missing x column".to_string())?;
    let y_idx = header
        .iter()
        .position(|value| value == "y")
        .ok_or_else(|| "BBox CSV is missing y column".to_string())?;
    let w_idx = header
        .iter()
        .position(|value| value == "w")
        .ok_or_else(|| "BBox CSV is missing w column".to_string())?;
    let h_idx = header
        .iter()
        .position(|value| value == "h")
        .ok_or_else(|| "BBox CSV is missing h column".to_string())?;
    let required_idx = *[roi_idx, x_idx, y_idx, w_idx, h_idx]
        .iter()
        .max()
        .expect("bbox indices should exist");

    let mut bboxes = Vec::new();
    let mut seen_rois = BTreeSet::new();
    for (line_number, line) in lines.enumerate() {
        let parts = line
            .split(',')
            .map(|value| value.trim())
            .collect::<Vec<_>>();
        if parts.len() <= required_idx {
            return Err(format!("BBox CSV row {} is malformed", line_number + 2));
        }

        let bbox = RoiBbox {
            roi: parts[roi_idx]
                .parse()
                .map_err(|_| format!("Invalid roi value on row {}", line_number + 2))?,
            x: parts[x_idx]
                .parse()
                .map_err(|_| format!("Invalid x value on row {}", line_number + 2))?,
            y: parts[y_idx]
                .parse()
                .map_err(|_| format!("Invalid y value on row {}", line_number + 2))?,
            w: parts[w_idx]
                .parse()
                .map_err(|_| format!("Invalid w value on row {}", line_number + 2))?,
            h: parts[h_idx]
                .parse()
                .map_err(|_| format!("Invalid h value on row {}", line_number + 2))?,
        };

        if bbox.w == 0 || bbox.h == 0 {
            return Err(format!(
                "BBox row {} must have positive width and height",
                line_number + 2
            ));
        }
        if !seen_rois.insert(bbox.roi) {
            return Err(format!("Duplicate roi {} in bbox CSV", bbox.roi));
        }

        bboxes.push(bbox);
    }

    if bboxes.is_empty() {
        return Err("BBox CSV does not contain any ROI rows".to_string());
    }

    bboxes.sort_by_key(|bbox| bbox.roi);
    Ok(bboxes)
}

fn validate_bboxes(bboxes: &[RoiBbox], width: u32, height: u32) -> Result<(), String> {
    for bbox in bboxes {
        let max_x = bbox
            .x
            .checked_add(bbox.w)
            .ok_or_else(|| format!("ROI {} overflows x bounds", bbox.roi))?;
        let max_y = bbox
            .y
            .checked_add(bbox.h)
            .ok_or_else(|| format!("ROI {} overflows y bounds", bbox.roi))?;
        if max_x > width || max_y > height {
            return Err(format!(
                "ROI {} bbox ({}, {}, {}, {}) exceeds frame bounds {}x{}",
                bbox.roi, bbox.x, bbox.y, bbox.w, bbox.h, width, height
            ));
        }
    }
    Ok(())
}

fn crop_u16_frame(frame: &[u16], frame_width: u32, bbox: &RoiBbox) -> Vec<u16> {
    let mut cropped = vec![0u16; (bbox.w * bbox.h) as usize];
    for row in 0..bbox.h {
        let src_start = ((bbox.y + row) * frame_width + bbox.x) as usize;
        let dst_start = (row * bbox.w) as usize;
        cropped[dst_start..dst_start + bbox.w as usize]
            .copy_from_slice(&frame[src_start..src_start + bbox.w as usize]);
    }
    cropped
}

fn write_roi_index(
    workspace_path: &str,
    pos: u32,
    source: ViewerSource,
    times: &[u32],
    channels: &[u32],
    z_slices: &[u32],
    bboxes: &[RoiBbox],
) -> Result<PathBuf, String> {
    let rois = bboxes
        .iter()
        .map(|bbox| RoiIndexEntry {
            roi: bbox.roi,
            file_name: format!("Roi{}.tif", bbox.roi),
            bbox: bbox.clone(),
            shape: [
                times.len() as u32,
                channels.len() as u32,
                z_slices.len() as u32,
                bbox.h,
                bbox.w,
            ],
        })
        .collect::<Vec<_>>();

    let index = RoiIndexFile {
        position: pos,
        axis_order: "TCZYX".to_string(),
        page_order: vec!["t".to_string(), "c".to_string(), "z".to_string()],
        time_count: times.len() as u32,
        channel_count: channels.len() as u32,
        z_count: z_slices.len() as u32,
        source,
        rois,
    };

    let path = workspace_roi_index_path(workspace_path, pos);
    let bytes = serde_json::to_vec_pretty(&index).map_err(|err| err.to_string())?;
    fs::write(&path, bytes).map_err(|err| err.to_string())?;
    Ok(path)
}

fn prepare_roi_output_dir(workspace_path: &str, pos: u32) -> Result<PathBuf, String> {
    let pos_dir = workspace_roi_pos_dir_path(workspace_path, pos);
    if pos_dir.exists() {
        fs::remove_dir_all(&pos_dir).map_err(|err| err.to_string())?;
    }
    fs::create_dir_all(&pos_dir).map_err(|err| err.to_string())?;
    Ok(pos_dir)
}

fn cleanup_roi_output_dir(workspace_path: &str, pos: u32) -> Result<(), String> {
    let pos_dir = workspace_roi_pos_dir_path(workspace_path, pos);
    if pos_dir.exists() {
        fs::remove_dir_all(pos_dir).map_err(|err| err.to_string())?;
    }
    Ok(())
}

#[derive(Debug)]
enum CropFailure {
    Error(String),
    Cancelled,
}

impl From<String> for CropFailure {
    fn from(value: String) -> Self {
        Self::Error(value)
    }
}

fn ensure_crop_not_cancelled(is_cancelled: &dyn Fn() -> bool) -> Result<(), CropFailure> {
    if is_cancelled() {
        Err(CropFailure::Cancelled)
    } else {
        Ok(())
    }
}

fn crop_tif_source<F>(
    workspace_path: &str,
    root: &Path,
    pos: u32,
    bboxes: &[RoiBbox],
    progress: &mut F,
    is_cancelled: &dyn Fn() -> bool,
) -> Result<PathBuf, CropFailure>
where
    F: FnMut(f64, &str) -> Result<(), String>,
{
    ensure_crop_not_cancelled(is_cancelled)?;
    let pos_dir = find_position_dir(root, pos)?;
    let mut index = HashMap::<(u32, u32, u32), PathBuf>::new();
    let mut channels = BTreeSet::new();
    let mut times = BTreeSet::new();
    let mut z_slices = BTreeSet::new();

    for (path, parsed) in collect_tiffs(&pos_dir) {
        if parsed.position != pos {
            continue;
        }
        channels.insert(parsed.channel);
        times.insert(parsed.time);
        z_slices.insert(parsed.z);
        index.insert((parsed.channel, parsed.time, parsed.z), path);
    }

    let channels = channels.into_iter().collect::<Vec<_>>();
    let times = times.into_iter().collect::<Vec<_>>();
    let z_slices = z_slices.into_iter().collect::<Vec<_>>();
    if channels.is_empty() || times.is_empty() || z_slices.is_empty() {
        return Err(format!("No TIFF frames found for Pos{pos}").into());
    }

    let first_path = index
        .get(&(channels[0], times[0], z_slices[0]))
        .ok_or_else(|| format!("Missing TIFF frame for Pos{pos}"))?;
    let first_frame = load_tiff_frame(first_path)?;
    validate_bboxes(bboxes, first_frame.width, first_frame.height)?;

    ensure_crop_not_cancelled(is_cancelled)?;
    prepare_roi_output_dir(workspace_path, pos)?;
    progress(0.02, &format!("Opening ROI TIFF writers for Pos{pos}")).map_err(CropFailure::from)?;
    let mut encoders = bboxes
        .iter()
        .map(|bbox| {
            let path = workspace_roi_tiff_path(workspace_path, pos, bbox.roi);
            let file = File::create(path).map_err(|err| err.to_string())?;
            TiffEncoder::new(BufWriter::new(file)).map_err(|err| err.to_string())
        })
        .collect::<Result<Vec<_>, String>>()?;

    let total_planes = times.len() * channels.len() * z_slices.len();
    let mut processed_planes = 0usize;
    for time in &times {
        for channel in &channels {
            for z in &z_slices {
                ensure_crop_not_cancelled(is_cancelled)?;
                let path = index.get(&(*channel, *time, *z)).ok_or_else(|| {
                    format!(
                        "Missing TIFF frame for Pos{pos}, channel {channel}, time {time}, z {z}"
                    )
                })?;
                let frame = load_tiff_frame(path)?;
                if frame.width != first_frame.width || frame.height != first_frame.height {
                    return Err(CropFailure::Error(
                        "Inconsistent TIFF dimensions across stack".to_string(),
                    ));
                }

                for (encoder, bbox) in encoders.iter_mut().zip(bboxes.iter()) {
                    ensure_crop_not_cancelled(is_cancelled)?;
                    let cropped = crop_u16_frame(&frame.data, frame.width, bbox);
                    encoder
                        .write_image::<colortype::Gray16>(bbox.w, bbox.h, &cropped)
                        .map_err(|err| err.to_string())?;
                }
                processed_planes += 1;
                let plane_progress = if total_planes == 0 {
                    1.0
                } else {
                    processed_planes as f64 / total_planes as f64
                };
                progress(
                    0.02 + plane_progress * 0.96,
                    &format!("Cropping frame {processed_planes}/{total_planes} for Pos{pos}"),
                )
                .map_err(CropFailure::from)?;
            }
        }
    }

    ensure_crop_not_cancelled(is_cancelled)?;
    progress(0.99, &format!("Writing ROI index for Pos{pos}")).map_err(CropFailure::from)?;
    write_roi_index(
        workspace_path,
        pos,
        ViewerSource::Tif {
            path: root.to_string_lossy().to_string(),
        },
        &times,
        &channels,
        &z_slices,
        bboxes,
    )?;
    progress(1.0, &format!("Finished ROI crop for Pos{pos}")).map_err(CropFailure::from)?;
    Ok(workspace_roi_pos_dir_path(workspace_path, pos))
}

fn crop_nd2_source<F>(
    workspace_path: &str,
    path: &Path,
    pos: u32,
    bboxes: &[RoiBbox],
    progress: &mut F,
    is_cancelled: &dyn Fn() -> bool,
) -> Result<PathBuf, CropFailure>
where
    F: FnMut(f64, &str) -> Result<(), String>,
{
    ensure_crop_not_cancelled(is_cancelled)?;
    let mut nd2 = Nd2File::open(path).map_err(|err| err.to_string())?;
    let sizes = nd2.sizes().map_err(|err| err.to_string())?;
    let width = u32::try_from(dimension_size(&sizes, "X")).map_err(|err| err.to_string())?;
    let height = u32::try_from(dimension_size(&sizes, "Y")).map_err(|err| err.to_string())?;
    let positions = dimension_values(&sizes, "P");
    let channels = dimension_values(&sizes, "C");
    let times = dimension_values(&sizes, "T");
    let z_slices = dimension_values(&sizes, "Z");
    if !positions.contains(&pos) {
        return Err(format!("Position index {pos} is out of range").into());
    }

    let pos_index = validate_request_index("Position", pos, dimension_size(&sizes, "P"))?;
    validate_bboxes(bboxes, width, height)?;

    ensure_crop_not_cancelled(is_cancelled)?;
    prepare_roi_output_dir(workspace_path, pos)?;
    progress(0.02, &format!("Opening ROI TIFF writers for Pos{pos}")).map_err(CropFailure::from)?;
    let mut encoders = bboxes
        .iter()
        .map(|bbox| {
            let path = workspace_roi_tiff_path(workspace_path, pos, bbox.roi);
            let file = File::create(path).map_err(|err| err.to_string())?;
            TiffEncoder::new(BufWriter::new(file)).map_err(|err| err.to_string())
        })
        .collect::<Result<Vec<_>, String>>()?;

    let total_planes = times.len() * channels.len() * z_slices.len();
    let mut processed_planes = 0usize;
    for time in &times {
        let time_index = validate_request_index("Time", *time, dimension_size(&sizes, "T"))?;
        for channel in &channels {
            let channel_index =
                validate_request_index("Channel", *channel, dimension_size(&sizes, "C"))?;
            for z in &z_slices {
                ensure_crop_not_cancelled(is_cancelled)?;
                let z_index = validate_request_index("Z", *z, dimension_size(&sizes, "Z"))?;
                let frame = nd2
                    .read_frame_2d(pos_index, time_index, channel_index, z_index)
                    .map_err(|err| err.to_string())?;
                if frame.len() != width as usize * height as usize {
                    return Err(CropFailure::Error(
                        "Unexpected ND2 frame dimensions".to_string(),
                    ));
                }

                for (encoder, bbox) in encoders.iter_mut().zip(bboxes.iter()) {
                    ensure_crop_not_cancelled(is_cancelled)?;
                    let cropped = crop_u16_frame(&frame, width, bbox);
                    encoder
                        .write_image::<colortype::Gray16>(bbox.w, bbox.h, &cropped)
                        .map_err(|err| err.to_string())?;
                }
                processed_planes += 1;
                let plane_progress = if total_planes == 0 {
                    1.0
                } else {
                    processed_planes as f64 / total_planes as f64
                };
                progress(
                    0.02 + plane_progress * 0.96,
                    &format!("Cropping frame {processed_planes}/{total_planes} for Pos{pos}"),
                )
                .map_err(CropFailure::from)?;
            }
        }
    }

    ensure_crop_not_cancelled(is_cancelled)?;
    progress(0.99, &format!("Writing ROI index for Pos{pos}")).map_err(CropFailure::from)?;
    write_roi_index(
        workspace_path,
        pos,
        ViewerSource::Nd2 {
            path: path.to_string_lossy().to_string(),
        },
        &times,
        &channels,
        &z_slices,
        bboxes,
    )?;
    progress(1.0, &format!("Finished ROI crop for Pos{pos}")).map_err(CropFailure::from)?;
    Ok(workspace_roi_pos_dir_path(workspace_path, pos))
}

fn crop_czi_source<F>(
    workspace_path: &str,
    path: &Path,
    pos: u32,
    bboxes: &[RoiBbox],
    progress: &mut F,
    is_cancelled: &dyn Fn() -> bool,
) -> Result<PathBuf, CropFailure>
where
    F: FnMut(f64, &str) -> Result<(), String>,
{
    ensure_crop_not_cancelled(is_cancelled)?;
    let mut czi = CziFile::open(path).map_err(|err| err.to_string())?;
    let sizes = czi.sizes().map_err(|err| err.to_string())?;
    let positions = dimension_values(&sizes, "S");
    let channels = dimension_values(&sizes, "C");
    let times = dimension_values(&sizes, "T");
    let z_slices = dimension_values(&sizes, "Z");
    if !positions.contains(&pos) {
        return Err(format!("Position index {pos} is out of range").into());
    }

    let pos_index = validate_request_index("Position", pos, dimension_size(&sizes, "S"))?;
    let time_count = dimension_size(&sizes, "T");
    let channel_count = dimension_size(&sizes, "C");
    let z_count = dimension_size(&sizes, "Z");

    let preview_plane = PlaneIndex::new()
        .with(CziDimension::S, pos_index)
        .with(CziDimension::T, 0)
        .with(CziDimension::C, 0)
        .with(CziDimension::Z, 0);
    let preview_bitmap = czi
        .read_plane(&preview_plane)
        .map_err(|err| err.to_string())?;
    validate_bboxes(bboxes, preview_bitmap.width, preview_bitmap.height)?;

    ensure_crop_not_cancelled(is_cancelled)?;
    prepare_roi_output_dir(workspace_path, pos)?;
    progress(0.02, &format!("Opening ROI TIFF writers for Pos{pos}")).map_err(CropFailure::from)?;
    let mut encoders = bboxes
        .iter()
        .map(|bbox| {
            let path = workspace_roi_tiff_path(workspace_path, pos, bbox.roi);
            let file = File::create(path).map_err(|err| err.to_string())?;
            TiffEncoder::new(BufWriter::new(file)).map_err(|err| err.to_string())
        })
        .collect::<Result<Vec<_>, String>>()?;

    let total_planes = times.len() * channels.len() * z_slices.len();
    let mut processed_planes = 0usize;
    for time in &times {
        let time_index = validate_request_index("Time", *time, time_count)?;
        for channel in &channels {
            let channel_index = validate_request_index("Channel", *channel, channel_count)?;
            for z in &z_slices {
                ensure_crop_not_cancelled(is_cancelled)?;
                let z_index = validate_request_index("Z", *z, z_count)?;
                let plane = PlaneIndex::new()
                    .with(CziDimension::S, pos_index)
                    .with(CziDimension::T, time_index)
                    .with(CziDimension::C, channel_index)
                    .with(CziDimension::Z, z_index);
                let bitmap = czi.read_plane(&plane).map_err(|err| err.to_string())?;
                let frame = czi_bitmap_to_u16(bitmap)?;

                for (encoder, bbox) in encoders.iter_mut().zip(bboxes.iter()) {
                    ensure_crop_not_cancelled(is_cancelled)?;
                    let cropped = crop_u16_frame(&frame, preview_bitmap.width, bbox);
                    encoder
                        .write_image::<colortype::Gray16>(bbox.w, bbox.h, &cropped)
                        .map_err(|err| err.to_string())?;
                }
                processed_planes += 1;
                let plane_progress = if total_planes == 0 {
                    1.0
                } else {
                    processed_planes as f64 / total_planes as f64
                };
                progress(
                    0.02 + plane_progress * 0.96,
                    &format!("Cropping frame {processed_planes}/{total_planes} for Pos{pos}"),
                )
                .map_err(CropFailure::from)?;
            }
        }
    }

    ensure_crop_not_cancelled(is_cancelled)?;
    progress(0.99, &format!("Writing ROI index for Pos{pos}")).map_err(CropFailure::from)?;
    write_roi_index(
        workspace_path,
        pos,
        ViewerSource::Czi {
            path: path.to_string_lossy().to_string(),
        },
        &times,
        &channels,
        &z_slices,
        bboxes,
    )?;
    progress(1.0, &format!("Finished ROI crop for Pos{pos}")).map_err(CropFailure::from)?;
    Ok(workspace_roi_pos_dir_path(workspace_path, pos))
}

pub fn scan_roi_workspace(workspace_path: String) -> Result<RoiWorkspaceScan, String> {
    let root = Path::new(&workspace_path).join("roi");
    if !root.is_dir() {
        return Ok(RoiWorkspaceScan {
            positions: Vec::new(),
        });
    }

    let mut positions = Vec::<RoiPositionScan>::new();
    let entries = fs::read_dir(&root).map_err(|err| err.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let Some(name) = entry.file_name().to_str().map(str::to_string) else {
            continue;
        };
        let Some(pos) = crate::viewer::domain::parse_pos_dir_name(&name) else {
            continue;
        };

        let index = read_roi_index(&workspace_path, pos)?;
        positions.push(RoiPositionScan {
            pos,
            source: index.source.clone(),
            channels: roi_axis_values(index.channel_count),
            times: roi_axis_values(index.time_count),
            z_slices: roi_axis_values(index.z_count),
            rois: index.rois.clone(),
        });
    }

    positions.sort_by_key(|entry| entry.pos);
    Ok(RoiWorkspaceScan { positions })
}

pub fn list_saved_bbox_positions(workspace_path: String) -> Result<Vec<u32>, String> {
    let root = Path::new(&workspace_path).join("bbox");
    if !root.is_dir() {
        return Ok(Vec::new());
    }

    let mut positions = BTreeSet::new();
    for entry in fs::read_dir(root).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let Some(name) = entry.file_name().to_str().map(str::to_string) else {
            continue;
        };
        let Some(pos) = parse_bbox_csv_name(&name) else {
            continue;
        };
        positions.insert(pos);
    }

    Ok(positions.into_iter().collect())
}

pub fn load_roi_frame(
    workspace_path: String,
    request: RoiFrameRequest,
) -> Result<RawFrame, String> {
    let index = read_roi_index(&workspace_path, request.pos)?;
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
    let raw = load_tiff_frame_page(
        &workspace_roi_tiff_path(&workspace_path, request.pos, request.roi),
        page,
    )?;
    if raw.width != roi.bbox.w || raw.height != roi.bbox.h {
        return Err(format!(
            "ROI {} TIFF page dimensions {}x{} do not match index {}x{}",
            request.roi, raw.width, raw.height, roi.bbox.w, roi.bbox.h
        ));
    }

    Ok(raw)
}

pub fn load_align_state(workspace_path: String, pos: u32) -> Result<Option<SavedAlignState>, String> {
    let path = workspace_align_json_path(&workspace_path, pos);
    let bytes = match fs::read(&path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => {
            return Err(format!(
                "Failed to read align state at {}: {error}",
                path.display()
            ))
        }
    };

    serde_json::from_slice::<SavedAlignState>(&bytes)
        .map(Some)
        .map_err(|err| format!("{}: {err}", path.display()))
}

pub fn save_bbox(
    workspace_path: String,
    pos: u32,
    csv: String,
    align_state: SavedAlignState,
) -> SaveBboxResponse {
    let bbox_target = workspace_bbox_csv_path(&workspace_path, pos);
    let Some(bbox_parent) = bbox_target.parent() else {
        return SaveBboxResponse {
            ok: false,
            error: Some("Unable to resolve bbox output directory".to_string()),
        };
    };
    if let Err(error) = fs::create_dir_all(bbox_parent) {
        return SaveBboxResponse {
            ok: false,
            error: Some(error.to_string()),
        };
    }

    let align_target = workspace_align_json_path(&workspace_path, pos);
    let Some(align_parent) = align_target.parent() else {
        return SaveBboxResponse {
            ok: false,
            error: Some("Unable to resolve align output directory".to_string()),
        };
    };
    if let Err(error) = fs::create_dir_all(align_parent) {
        return SaveBboxResponse {
            ok: false,
            error: Some(error.to_string()),
        };
    }

    let normalized = if csv.ends_with('\n') {
        csv
    } else {
        format!("{csv}\n")
    };
    let align_json = match serde_json::to_vec_pretty(&align_state) {
        Ok(bytes) => bytes,
        Err(error) => {
            return SaveBboxResponse {
                ok: false,
                error: Some(error.to_string()),
            }
        }
    };

    match fs::write(&bbox_target, normalized).and_then(|_| fs::write(&align_target, align_json)) {
        Ok(_) => SaveBboxResponse { ok: true, error: None },
        Err(error) => SaveBboxResponse {
            ok: false,
            error: Some(error.to_string()),
        },
    }
}

pub fn crop_roi<F>(
    workspace_path: String,
    source: ViewerSource,
    pos: u32,
    format: CropOutputFormat,
    progress: &mut F,
    is_cancelled: &dyn Fn() -> bool,
) -> CropRoiResponse
where
    F: FnMut(f64, &str) -> Result<(), String>,
{
    if !matches!(format, CropOutputFormat::Tiff) {
        return CropRoiResponse {
            ok: false,
            status: CropRoiStatus::Error,
            cancelled: None,
            error: Some("Unsupported crop output format".to_string()),
            output_path: None,
        };
    }

    let bbox_path = workspace_bbox_csv_path(&workspace_path, pos);
    if !bbox_path.is_file() {
        return CropRoiResponse {
            ok: false,
            status: CropRoiStatus::Error,
            cancelled: None,
            error: Some(format!("BBox CSV not found at {}", bbox_path.display())),
            output_path: None,
        };
    }

    if is_cancelled() {
        return CropRoiResponse {
            ok: false,
            status: CropRoiStatus::Cancelled,
            cancelled: Some(true),
            error: None,
            output_path: None,
        };
    }

    if let Err(error) = progress(0.0, &format!("Reading bbox CSV for Pos{pos}")) {
        return CropRoiResponse {
            ok: false,
            status: CropRoiStatus::Error,
            cancelled: None,
            error: Some(error),
            output_path: None,
        };
    }

    let result = parse_bbox_csv(&bbox_path)
        .map_err(CropFailure::from)
        .and_then(|bboxes| match &source {
            ViewerSource::Tif { path } => {
                progress(0.01, &format!("Scanning TIFF stack for Pos{pos}"))
                    .map_err(CropFailure::from)?;
                crop_tif_source(
                    &workspace_path,
                    Path::new(path),
                    pos,
                    &bboxes,
                    progress,
                    is_cancelled,
                )
            }
            ViewerSource::Nd2 { path } => {
                progress(0.01, &format!("Opening ND2 source for Pos{pos}"))
                    .map_err(CropFailure::from)?;
                crop_nd2_source(
                    &workspace_path,
                    Path::new(path),
                    pos,
                    &bboxes,
                    progress,
                    is_cancelled,
                )
            }
            ViewerSource::Czi { path } => {
                progress(0.01, &format!("Opening CZI source for Pos{pos}"))
                    .map_err(CropFailure::from)?;
                crop_czi_source(
                    &workspace_path,
                    Path::new(path),
                    pos,
                    &bboxes,
                    progress,
                    is_cancelled,
                )
            }
        });

    match result {
        Ok(output_path) => CropRoiResponse {
            ok: true,
            status: CropRoiStatus::Success,
            cancelled: None,
            error: None,
            output_path: Some(output_path.to_string_lossy().to_string()),
        },
        Err(CropFailure::Cancelled) => {
            let _ = cleanup_roi_output_dir(&workspace_path, pos);
            CropRoiResponse {
                ok: false,
                status: CropRoiStatus::Cancelled,
                cancelled: Some(true),
                error: None,
                output_path: None,
            }
        }
        Err(CropFailure::Error(error)) => CropRoiResponse {
            ok: false,
            status: CropRoiStatus::Error,
            cancelled: None,
            error: Some(error),
            output_path: None,
        },
    }
}

#[cfg(test)]
mod tests {
    use std::cell::Cell;
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::*;
    use crate::viewer::domain::{GridCellCoord, GridShape, GridState};

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

    #[test]
    fn list_saved_bbox_positions_returns_sorted_positions() {
        let root = unique_test_dir("saved-bboxes");
        let bbox_dir = root.join("bbox");
        fs::create_dir_all(&bbox_dir).expect("create bbox dir");
        fs::write(bbox_dir.join("Pos10.csv"), "roi,x,y,w,h\n0,0,0,1,1\n").expect("write bbox 10");
        fs::write(bbox_dir.join("pos2.csv"), "roi,x,y,w,h\n0,0,0,1,1\n").expect("write bbox 2");
        fs::write(bbox_dir.join("notes.txt"), "ignore").expect("write notes");
        fs::write(bbox_dir.join("PosX.csv"), "ignore").expect("write malformed bbox");

        let positions = list_saved_bbox_positions(root.to_string_lossy().to_string())
            .expect("scan saved bboxes");
        assert_eq!(positions, vec![2, 10]);

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn save_bbox_writes_csv_and_align_state() {
        let root = unique_test_dir("save-bbox");
        let align_state = SavedAlignState {
            grid: GridState {
                enabled: true,
                shape: GridShape::Hex,
                tx: 1.5,
                ty: -2.0,
                rotation: 0.25,
                spacing_a: 150.0,
                spacing_b: 175.0,
                cell_width: 80.0,
                cell_height: 90.0,
                opacity: 0.4,
            },
            excluded_cells: vec![GridCellCoord { i: 3, j: 4 }],
        };

        let response = save_bbox(
            root.to_string_lossy().to_string(),
            7,
            "roi,x,y,w,h\n0,0,0,1,1".to_string(),
            align_state.clone(),
        );

        assert!(response.ok);
        assert_eq!(response.error, None);
        assert_eq!(
            fs::read_to_string(root.join("bbox").join("Pos7.csv")).expect("read bbox csv"),
            "roi,x,y,w,h\n0,0,0,1,1\n"
        );

        let saved_align = load_align_state(root.to_string_lossy().to_string(), 7)
            .expect("load align state")
            .expect("saved align state");
        assert_eq!(saved_align.grid.tx, align_state.grid.tx);
        assert_eq!(saved_align.grid.ty, align_state.grid.ty);
        assert_eq!(saved_align.excluded_cells.len(), 1);
        assert_eq!(saved_align.excluded_cells[0].i, 3);
        assert_eq!(saved_align.excluded_cells[0].j, 4);

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn load_align_state_returns_none_when_missing() {
        let root = unique_test_dir("missing-align");

        let loaded = load_align_state(root.to_string_lossy().to_string(), 4).expect("load align state");
        assert!(loaded.is_none());

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn load_align_state_returns_error_for_invalid_json() {
        let root = unique_test_dir("invalid-align");
        let align_dir = root.join("align");
        fs::create_dir_all(&align_dir).expect("create align dir");
        fs::write(align_dir.join("Pos2.json"), "{not-json").expect("write invalid json");

        let error = load_align_state(root.to_string_lossy().to_string(), 2).expect_err("invalid align json");
        assert!(error.contains("Pos2.json"));

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn crop_roi_cancellation_removes_partial_output() {
        let root = unique_test_dir("cancel-crop");
        let workspace_path = root.join("workspace");
        let source_path = root.join("source");
        let pos_dir = source_path.join("Pos0");
        fs::create_dir_all(&pos_dir).expect("create source position dir");
        fs::create_dir_all(workspace_path.join("bbox")).expect("create workspace bbox dir");

        write_tiff(
            &pos_dir.join("img_channel0_position0_time0_z0.tif"),
            2,
            1,
            &[11, 22],
        );
        fs::write(
            workspace_path.join("bbox").join("Pos0.csv"),
            "roi,x,y,w,h\n0,0,0,1,1\n1,1,0,1,1\n",
        )
        .expect("write bbox csv");

        let cancel_checks = Cell::new(0usize);
        let response = crop_roi(
            workspace_path.to_string_lossy().to_string(),
            ViewerSource::Tif {
                path: source_path.to_string_lossy().to_string(),
            },
            0,
            CropOutputFormat::Tiff,
            &mut |_progress, _message| Ok(()),
            &|| {
                let next = cancel_checks.get() + 1;
                cancel_checks.set(next);
                next >= 5
            },
        );

        assert!(!response.ok);
        assert!(matches!(response.status, CropRoiStatus::Cancelled));
        assert_eq!(response.cancelled, Some(true));
        assert!(!workspace_path.join("roi").join("Pos0").exists());

        let _ = fs::remove_dir_all(root);
    }
}

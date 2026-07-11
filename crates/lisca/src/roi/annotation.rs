use std::{
    collections::BTreeSet,
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use base64::prelude::{Engine as _, BASE64_STANDARD};
use image::GenericImageView;

use crate::protocol::{
    AnnotationLabel, LoadedRoiFrameAnnotation, RoiFrameAnnotation, RoiFrameAnnotationPayload,
    RoiFrameRequest,
};

use super::index::read_roi_index;

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

pub fn load_annotation_labels(workspace_path: &str) -> Result<Vec<AnnotationLabel>, String> {
    read_annotation_labels(workspace_path)
}

pub fn save_annotation_labels(
    workspace_path: &str,
    labels: Vec<AnnotationLabel>,
) -> Result<Vec<AnnotationLabel>, String> {
    validate_annotation_labels(&labels, &annotation_labels_path(workspace_path))?;
    fs::create_dir_all(annotations_dir_path(workspace_path)).map_err(|error| error.to_string())?;
    let path = annotation_labels_path(workspace_path);
    let bytes = serde_json::to_vec_pretty(&AnnotationLabelsFile::Wrapped {
        labels: labels.clone(),
    })
    .map_err(|error| error.to_string())?;
    fs::write(path, bytes).map_err(|error| error.to_string())?;
    Ok(labels)
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
    let annotation_path = annotation_json_path(workspace_path, &request);
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
            let path = annotation_roi_dir_path(workspace_path, &request).join(mask_file_name);
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

    let annotation_dir = annotation_roi_dir_path(workspace_path, &request);
    let annotation_path = annotation_json_path(workspace_path, &request);
    let mask_path = annotation_mask_path(workspace_path, &request);

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

fn read_annotation_labels(workspace_path: &str) -> Result<Vec<AnnotationLabel>, String> {
    let path = annotation_labels_path(workspace_path);
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
        if label.id.trim().is_empty()
            || label.name.trim().is_empty()
            || label.color.trim().is_empty()
        {
            return Err(format!(
                "Annotation labels at {} contain empty fields",
                path.display()
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

fn remove_if_exists(path: &Path) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

fn annotation_schema_version() -> u32 {
    1
}

fn annotations_dir_path(root: &str) -> PathBuf {
    Path::new(root).join("annotations")
}

fn annotation_labels_path(root: &str) -> PathBuf {
    annotations_dir_path(root).join("labels.json")
}

fn annotation_roi_dir_path(root: &str, request: &RoiFrameRequest) -> PathBuf {
    annotations_dir_path(root)
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

fn annotation_json_path(root: &str, request: &RoiFrameRequest) -> PathBuf {
    annotation_roi_dir_path(root, request)
        .join(format!("{}.json", annotation_roi_frame_stem(request)))
}

fn annotation_mask_path(root: &str, request: &RoiFrameRequest) -> PathBuf {
    annotation_roi_dir_path(root, request)
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

use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

use image::{imageops::FilterType, GrayImage, ImageBuffer, Luma};
use ndarray::{Array, Ix4};
use ort::session::Session;
use ort::value::Tensor;

use crate::protocol::{
    AlignGridCellCoord, AutoExcludePreviewCell, SmartExcludeRequest, SmartExcludeResponse,
};

use super::frame::decode_frame_pixels;

const IMAGE_SIZE: u32 = 224;
const DEFAULT_THRESHOLD: f64 = 0.5;
const IMAGENET_MEAN: [f32; 3] = [0.485, 0.456, 0.406];
const IMAGENET_STD: [f32; 3] = [0.229, 0.224, 0.225];

static EXCLUDE_SESSION: OnceLock<Result<Mutex<Session>, String>> = OnceLock::new();

pub fn classify_exclusion(request: SmartExcludeRequest) -> Result<SmartExcludeResponse, String> {
    if request.cells.is_empty() {
        return Ok(SmartExcludeResponse {
            excluded_cells: Vec::new(),
        });
    }

    let threshold = request.threshold.unwrap_or(DEFAULT_THRESHOLD);
    let pixels = decode_frame_pixels(&request.frame)?;
    let width = request.frame.width as usize;
    let height = request.frame.height as usize;
    let mut session = exclude_session()?;
    let input_name = "pixel_values";
    let mut excluded_cells = Vec::new();

    for cell in &request.cells {
        let exclude_score =
            classify_cell(&mut session, input_name, &pixels, width, height, cell)?;
        if exclude_score >= threshold {
            excluded_cells.push(AlignGridCellCoord { i: cell.i, j: cell.j });
        }
    }

    Ok(SmartExcludeResponse { excluded_cells })
}

fn exclude_session() -> Result<std::sync::MutexGuard<'static, Session>, String> {
    let session = EXCLUDE_SESSION
        .get_or_init(|| build_exclude_session(resolve_model_path()).map(Mutex::new))
        .as_ref()
        .map_err(|error| error.clone())?;
    session
        .lock()
        .map_err(|error| format!("smart exclusion model lock poisoned: {error}"))
}

fn workspace_models_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../models")
}

fn build_exclude_session(model_path: Result<PathBuf, String>) -> Result<Session, String> {
    let model_path = model_path?;
    let onnx_path = model_path.join("model.onnx");
    Session::builder()
        .map_err(|error| error.to_string())?
        .commit_from_file(&onnx_path)
        .map_err(|error| format!("failed to load smart exclusion model: {error}"))
}

pub fn resolve_model_path() -> Result<PathBuf, String> {
    if let Ok(env_path) = std::env::var("LISCA_SMART_EXCLUSION_MODEL") {
        let path = PathBuf::from(env_path.trim());
        if path.join("model.onnx").is_file() {
            return Ok(path);
        }
        if path.file_name().is_some_and(|name| name == "model.onnx") && path.is_file() {
            return Ok(path
                .parent()
                .map(Path::to_path_buf)
                .unwrap_or_else(|| PathBuf::from(".")));
        }
        return Err(format!(
            "LISCA_SMART_EXCLUSION_MODEL is set but no model.onnx found at {}",
            path.display()
        ));
    }

    let candidates = [
        workspace_models_dir().join("smart-exclusion-resnet18/onnx"),
        workspace_models_dir().join("smart-exclusion-resnet18"),
        PathBuf::from("models/smart-exclusion-resnet18/onnx"),
        PathBuf::from("models/smart-exclusion-resnet18"),
    ];
    for candidate in candidates {
        if candidate.join("model.onnx").is_file() {
            return Ok(candidate);
        }
    }

    Err(
        "smart exclusion model not found: set LISCA_SMART_EXCLUSION_MODEL or place model.onnx at \
         models/smart-exclusion-resnet18/onnx/model.onnx"
            .to_string(),
    )
}

fn classify_cell(
    session: &mut Session,
    input_name: &str,
    pixels: &[f64],
    frame_width: usize,
    frame_height: usize,
    cell: &AutoExcludePreviewCell,
) -> Result<f64, String> {
    let normalized = crop_and_normalize_cell(pixels, frame_width, frame_height, cell)?;
    let resized = resize_to_224(&normalized, cell.w, cell.h);
    let nchw = to_nchw_normalized(&resized);
    let shape: Ix4 = ndarray::Dim([1, 3, IMAGE_SIZE as usize, IMAGE_SIZE as usize]);
    let array = Array::from_shape_vec(shape, nchw).map_err(|error| error.to_string())?;
    let input_tensor = Tensor::from_array(array).map_err(|error| error.to_string())?;
    let input = ort::inputs![input_name => input_tensor];
    let outputs = session.run(input).map_err(|error| error.to_string())?;
    let logits = outputs[0]
        .try_extract_array::<f32>()
        .map_err(|error| error.to_string())?;

    let exclude_logit = logits[[0, 0, 0, 0]];
    let include_logit = logits[[0, 1, 0, 0]];
    let max = exclude_logit.max(include_logit);
    let exclude_exp = (exclude_logit - max).exp();
    let include_exp = (include_logit - max).exp();
    Ok(f64::from(exclude_exp / (exclude_exp + include_exp)))
}

fn crop_and_normalize_cell(
    pixels: &[f64],
    frame_width: usize,
    frame_height: usize,
    cell: &AutoExcludePreviewCell,
) -> Result<Vec<u8>, String> {
    let left = cell.x as usize;
    let top = cell.y as usize;
    let right = (cell.x + cell.w).min(frame_width as u32) as usize;
    let bottom = (cell.y + cell.h).min(frame_height as u32) as usize;
    let crop_width = right.saturating_sub(left);
    let crop_height = bottom.saturating_sub(top);
    if crop_width == 0 || crop_height == 0 {
        return Ok(Vec::new());
    }

    let mut values = Vec::with_capacity(crop_width * crop_height);
    let mut minimum = f64::INFINITY;
    let mut maximum = f64::NEG_INFINITY;
    for row in 0..crop_height {
        for col in 0..crop_width {
            let frame_x = left + col;
            let frame_y = top + row;
            let index = frame_y * frame_width + frame_x;
            let value = pixels.get(index).copied().unwrap_or(0.0);
            values.push(value);
            minimum = minimum.min(value);
            maximum = maximum.max(value);
        }
    }

    let range = maximum - minimum;
    Ok(values
        .into_iter()
        .map(|value| {
            if range > 0.0 {
                (((value - minimum) / range) * 255.0).round() as u8
            } else {
                0
            }
        })
        .collect())
}

fn resize_to_224(data: &[u8], width: u32, height: u32) -> GrayImage {
    let img = ImageBuffer::<Luma<u8>, Vec<u8>>::from_raw(width, height, data.to_vec())
        .unwrap_or_else(|| {
            ImageBuffer::from_raw(width, height, vec![0; (width * height) as usize]).unwrap()
        });
    image::imageops::resize(&img, IMAGE_SIZE, IMAGE_SIZE, FilterType::Triangle)
}

fn to_nchw_normalized(gray: &GrayImage) -> Vec<f32> {
    let n = (IMAGE_SIZE * IMAGE_SIZE) as usize;
    let mut out = vec![0.0f32; 3 * n];
    for channel in 0..3 {
        let offset = channel * n;
        for (index, value) in gray.as_raw().iter().enumerate() {
            let normalized = *value as f32 / 255.0;
            out[offset + index] = (normalized - IMAGENET_MEAN[channel]) / IMAGENET_STD[channel];
        }
    }
    out
}
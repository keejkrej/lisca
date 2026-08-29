use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

use ndarray::{Array, ArrayView, Ix4};
use ort::session::Session;
use ort::value::Tensor;

use crate::aligner;
use crate::onnx::{
    binary_logits, first_class_probability, resize_to_224, to_nchw_normalized,
    workspace_models_dir, IMAGE_SIZE,
};
use crate::protocol::{
    AlignGridCellCoord, AutoExcludePreviewCell, FramePayload, SmartExcludeRequest,
    SmartExcludeResponse,
};

use super::frame::decode_frame_pixels;

const DEFAULT_THRESHOLD: f64 = 0.5;

static EXCLUDE_SESSION: OnceLock<Result<Mutex<Session>, String>> = OnceLock::new();

pub fn classify_exclusion(request: SmartExcludeRequest) -> Result<SmartExcludeResponse, String> {
    let frame = aligner::load_frame_payload(request.source, request.request, request.contrast)?;
    classify_exclusion_on_frame(&frame, &request.cells, request.threshold)
}

fn classify_exclusion_on_frame(
    frame: &FramePayload,
    cells: &[AutoExcludePreviewCell],
    threshold: Option<f64>,
) -> Result<SmartExcludeResponse, String> {
    if cells.is_empty() {
        return Ok(SmartExcludeResponse {
            excluded_cells: Vec::new(),
        });
    }

    let threshold = threshold.unwrap_or(DEFAULT_THRESHOLD);
    let pixels = decode_frame_pixels(frame)?;
    let width = frame.width as usize;
    let height = frame.height as usize;
    let mut session = exclude_session()?;
    let input_name = "pixel_values";
    let mut excluded_cells = Vec::new();

    for cell in cells {
        let exclude_score = classify_cell(&mut session, input_name, &pixels, width, height, cell)?;
        if exclude_score >= threshold {
            excluded_cells.push(AlignGridCellCoord {
                i: cell.i,
                j: cell.j,
            });
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

fn build_exclude_session(model_path: Result<PathBuf, String>) -> Result<Session, String> {
    let model_path = model_path?;
    let onnx_path = model_path.join("model.onnx");
    Session::builder()
        .map_err(|error| error.to_string())?
        .commit_from_file(&onnx_path)
        .map_err(|error| format!("failed to load smart exclusion model: {error}"))
}

pub fn resolve_model_path() -> Result<PathBuf, String> {
    crate::onnx::resolve_model_path(
        "LISCA_SMART_EXCLUSION_MODEL",
        [
            workspace_models_dir().join("smart-exclusion-resnet18/onnx"),
            workspace_models_dir().join("smart-exclusion-resnet18"),
            PathBuf::from("models/smart-exclusion-resnet18/onnx"),
            PathBuf::from("models/smart-exclusion-resnet18"),
        ],
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
    let resized = resize_to_224(&normalized, cell.w, cell.h)?;
    let nchw = to_nchw_normalized(&resized);
    let shape: Ix4 = ndarray::Dim([1, 3, IMAGE_SIZE as usize, IMAGE_SIZE as usize]);
    let array = Array::from_shape_vec(shape, nchw).map_err(|error| error.to_string())?;
    let input_tensor = Tensor::from_array(array).map_err(|error| error.to_string())?;
    let input = ort::inputs![input_name => input_tensor];
    let outputs = session.run(input).map_err(|error| error.to_string())?;
    let logits = if let Some(output) = outputs.get("logits") {
        output.try_extract_array::<f32>()
    } else {
        outputs[0].try_extract_array::<f32>()
    }
    .map_err(|error| error.to_string())?;

    exclude_probability_from_logits(&logits)
}

fn exclude_probability_from_logits(logits: &ArrayView<f32, ndarray::IxDyn>) -> Result<f64, String> {
    let (exclude_logit, include_logit) = binary_logits(logits)?;
    Ok(first_class_probability(exclude_logit, include_logit))
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

#[cfg(test)]
mod tests {
    use super::*;
    use ndarray::array;

    #[test]
    fn exclude_probability_prefers_exclude_label() {
        let logits_array = array![[2.0, 0.0]];
        let logits = logits_array.view().into_dyn();
        let probability = exclude_probability_from_logits(&logits).expect("probability");
        assert!(probability > 0.8);
    }

    #[test]
    fn classify_exclusion_returns_empty_for_no_cells() {
        use crate::protocol::{ContrastWindow, FramePayload, PixelType};

        let frame = FramePayload {
            width: 4,
            height: 4,
            data_base64: "AAAA".to_string(),
            pixel_type: PixelType::Uint8,
            contrast_domain: ContrastWindow { min: 0, max: 255 },
            suggested_contrast: ContrastWindow { min: 0, max: 255 },
            applied_contrast: ContrastWindow { min: 0, max: 255 },
        };
        let response = classify_exclusion_on_frame(&frame, &[], None).expect("classify");
        assert!(response.excluded_cells.is_empty());
    }

    #[test]
    fn classify_exclusion_runs_for_preview_cell() {
        use crate::protocol::{ContrastWindow, FramePayload, PixelType};

        if resolve_model_path().is_err() {
            return;
        }

        let pixels = vec![128u8; 16];
        let frame = FramePayload {
            width: 4,
            height: 4,
            data_base64: {
                use base64::prelude::{Engine as _, BASE64_STANDARD};
                BASE64_STANDARD.encode(pixels)
            },
            pixel_type: PixelType::Uint8,
            contrast_domain: ContrastWindow { min: 0, max: 255 },
            suggested_contrast: ContrastWindow { min: 0, max: 255 },
            applied_contrast: ContrastWindow { min: 0, max: 255 },
        };
        let response = classify_exclusion_on_frame(
            &frame,
            &[AutoExcludePreviewCell {
                i: 0,
                j: 0,
                x: 0,
                y: 0,
                w: 4,
                h: 4,
            }],
            Some(2.0),
        )
        .expect("classify");
        assert!(response.excluded_cells.is_empty());
    }
}

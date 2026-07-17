use std::ops::Deref;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

use image::{imageops::FilterType, ImageBuffer, Rgb};
use ndarray::{Array, Ix4};
use ort::session::Session;
use ort::value::Tensor;

use crate::image_source;
use crate::onnx::{workspace_models_dir, IMAGENET_MEAN, IMAGENET_STD};
use crate::protocol::{FramePayload, SmartSegmentPoint, SmartSegmentRequest, SmartSegmentResponse};
use crate::roi;

use super::frame::{decode_frame_pixels, pixels_to_rgb_u8};

const SAM_SIZE: u32 = 1024;

struct SegmentSessions {
    encoder: Session,
    decoder: Session,
}

static SEGMENT_SESSIONS: OnceLock<Result<Mutex<SegmentSessions>, String>> = OnceLock::new();

pub fn segment_mask(request: SmartSegmentRequest) -> Result<SmartSegmentResponse, String> {
    let raw = roi::load_roi_frame(&request.workspace_path, request.request)?;
    let frame = image_source::to_frame_payload(raw, request.contrast);
    segment_mask_on_frame(&frame, &request.points)
}

fn segment_mask_on_frame(
    frame: &FramePayload,
    points: &[SmartSegmentPoint],
) -> Result<SmartSegmentResponse, String> {
    let width = frame.width;
    let height = frame.height;
    let pixel_count = (width as usize)
        .checked_mul(height as usize)
        .ok_or_else(|| "invalid frame dimensions".to_string())?;

    if points.is_empty() {
        return Ok(SmartSegmentResponse {
            mask: vec![0; pixel_count],
        });
    }

    let pixels = decode_frame_pixels(frame)?;
    let rgb = pixels_to_rgb_u8(&pixels, width, height, &frame.pixel_type)?;
    let prepared = prepare_sam_image(&rgb, width, height)?;

    let mut sessions = segment_sessions()?;
    let embeddings = run_encoder(&mut sessions.encoder, &prepared.pixel_values)?;
    let (pred_masks, pred_mask_shape, iou_scores) = run_decoder(
        &mut sessions.decoder,
        &embeddings,
        &prepared,
        width,
        height,
        points,
    )?;

    let mask = extract_best_mask(
        &pred_masks,
        &pred_mask_shape,
        &iou_scores,
        width,
        height,
        &prepared,
    )?;
    Ok(SmartSegmentResponse { mask })
}

fn segment_sessions() -> Result<std::sync::MutexGuard<'static, SegmentSessions>, String> {
    let sessions = SEGMENT_SESSIONS
        .get_or_init(|| build_segment_sessions(resolve_model_path()).map(Mutex::new))
        .as_ref()
        .map_err(|error| error.clone())?;
    sessions
        .lock()
        .map_err(|error| format!("smart segment model lock poisoned: {error}"))
}

fn build_segment_sessions(model_dir: Result<PathBuf, String>) -> Result<SegmentSessions, String> {
    let model_dir = model_dir?;
    let encoder_path = model_dir.join("vision_encoder_quantized.onnx");
    let decoder_path = model_dir.join("prompt_encoder_mask_decoder_quantized.onnx");
    let encoder = Session::builder()
        .map_err(|error| error.to_string())?
        .commit_from_file(&encoder_path)
        .map_err(|error| format!("failed to load smart segment encoder: {error}"))?;
    let decoder = Session::builder()
        .map_err(|error| error.to_string())?
        .commit_from_file(&decoder_path)
        .map_err(|error| format!("failed to load smart segment decoder: {error}"))?;
    Ok(SegmentSessions { encoder, decoder })
}

pub fn resolve_model_path() -> Result<PathBuf, String> {
    if let Ok(env_path) = std::env::var("LISCA_SMART_SEGMENT_MODEL") {
        let path = PathBuf::from(env_path.trim());
        if has_segment_models(&path) {
            return Ok(path);
        }
        return Err(format!(
            "LISCA_SMART_SEGMENT_MODEL is set but SlimSAM ONNX files were not found under {}",
            path.display()
        ));
    }

    let candidates = [
        workspace_models_dir().join("smart-segment-slimsam/onnx"),
        PathBuf::from("models/smart-segment-slimsam/onnx"),
    ];
    for candidate in candidates {
        if has_segment_models(&candidate) {
            return Ok(candidate);
        }
    }

    Err(
        "smart segment model not found: set LISCA_SMART_SEGMENT_MODEL or place SlimSAM ONNX files \
         under models/smart-segment-slimsam/onnx/"
            .to_string(),
    )
}

fn has_segment_models(dir: &Path) -> bool {
    dir.join("vision_encoder_quantized.onnx").is_file()
        && dir
            .join("prompt_encoder_mask_decoder_quantized.onnx")
            .is_file()
}

struct PreparedSamImage {
    pixel_values: Vec<f32>,
    resized_width: u32,
    resized_height: u32,
}

fn prepare_sam_image(rgb: &[u8], width: u32, height: u32) -> Result<PreparedSamImage, String> {
    let image = ImageBuffer::<Rgb<u8>, Vec<u8>>::from_raw(width, height, rgb.to_vec())
        .ok_or_else(|| "failed to build RGB frame buffer".to_string())?;

    let longest = width.max(height).max(1) as f32;
    let scale = SAM_SIZE as f32 / longest;
    let resized_width = ((width as f32) * scale).round().max(1.0) as u32;
    let resized_height = ((height as f32) * scale).round().max(1.0) as u32;
    let resized =
        image::imageops::resize(&image, resized_width, resized_height, FilterType::Triangle);

    let mut pixel_values = vec![0.0f32; (3 * SAM_SIZE * SAM_SIZE) as usize];
    for y in 0..resized_height {
        for x in 0..resized_width {
            let pixel = resized.get_pixel(x, y);
            for channel in 0..3 {
                let normalized = pixel[channel] as f32 / 255.0;
                let index = (channel as u32 * SAM_SIZE * SAM_SIZE + y * SAM_SIZE + x) as usize;
                pixel_values[index] = (normalized - IMAGENET_MEAN[channel]) / IMAGENET_STD[channel];
            }
        }
    }

    Ok(PreparedSamImage {
        pixel_values,
        resized_width,
        resized_height,
    })
}

struct SamEmbeddings {
    image_embeddings: Vec<f32>,
    image_positional_embeddings: Vec<f32>,
    embedding_shape: Vec<usize>,
    positional_shape: Vec<usize>,
}

type DecoderOutputs = (Vec<f32>, Vec<usize>, Vec<f32>);

fn run_encoder(session: &mut Session, pixel_values: &[f32]) -> Result<SamEmbeddings, String> {
    let shape: Ix4 = ndarray::Dim([1, 3, SAM_SIZE as usize, SAM_SIZE as usize]);
    let array = Array::from_shape_vec(shape, pixel_values.to_vec()).map_err(|e| e.to_string())?;
    let input = Tensor::from_array(array).map_err(|e| e.to_string())?;
    let outputs = session
        .run(ort::inputs!["pixel_values" => input])
        .map_err(|e| e.to_string())?;

    let (image_embeddings, embedding_shape) = extract_f32_tensor(&outputs, "image_embeddings")?;
    let (image_positional_embeddings, positional_shape) =
        extract_f32_tensor(&outputs, "image_positional_embeddings")?;
    Ok(SamEmbeddings {
        embedding_shape,
        positional_shape,
        image_embeddings,
        image_positional_embeddings,
    })
}

fn run_decoder(
    session: &mut Session,
    embeddings: &SamEmbeddings,
    prepared: &PreparedSamImage,
    width: u32,
    height: u32,
    points: &[SmartSegmentPoint],
) -> Result<DecoderOutputs, String> {
    let scale_x = prepared.resized_width as f64 / f64::from(width.max(1));
    let scale_y = prepared.resized_height as f64 / f64::from(height.max(1));

    let mut point_coords = Vec::with_capacity(points.len() * 2);
    let mut point_labels = Vec::with_capacity(points.len());
    for point in points {
        point_coords.push((point.x * scale_x) as f32);
        point_coords.push((point.y * scale_y) as f32);
        point_labels.push(*point.label.deref() as i64);
    }

    let num_points = points.len();
    let points_array = Array::from_shape_vec(ndarray::Dim([1, 1, num_points, 2]), point_coords)
        .map_err(|e| e.to_string())?;
    let labels_array = Array::from_shape_vec(ndarray::Dim([1, 1, num_points]), point_labels)
        .map_err(|e| e.to_string())?;
    let embeddings_array = array_from_shape(
        &embeddings.embedding_shape,
        embeddings.image_embeddings.clone(),
    )?;
    let positional_array = array_from_shape(
        &embeddings.positional_shape,
        embeddings.image_positional_embeddings.clone(),
    )?;

    let outputs = session
        .run(ort::inputs![
            "input_points" => Tensor::from_array(points_array).map_err(|e| e.to_string())?,
            "input_labels" => Tensor::from_array(labels_array).map_err(|e| e.to_string())?,
            "image_embeddings" => Tensor::from_array(embeddings_array).map_err(|e| e.to_string())?,
            "image_positional_embeddings" => Tensor::from_array(positional_array).map_err(|e| e.to_string())?,
        ])
        .map_err(|e| e.to_string())?;

    let (pred_masks, pred_mask_shape) = extract_f32_tensor(&outputs, "pred_masks")?;
    let (iou_scores, _) = extract_f32_tensor(&outputs, "iou_scores")?;
    Ok((pred_masks, pred_mask_shape, iou_scores))
}

fn array_from_shape(shape: &[usize], data: Vec<f32>) -> Result<Array<f32, Ix4>, String> {
    let dims: [usize; 4] = shape
        .try_into()
        .map_err(|_| format!("expected 4D tensor shape, got {shape:?}"))?;
    Array::from_shape_vec(Ix4(dims[0], dims[1], dims[2], dims[3]), data)
        .map_err(|error| error.to_string())
}

fn extract_f32_tensor(
    outputs: &ort::session::SessionOutputs,
    name: &str,
) -> Result<(Vec<f32>, Vec<usize>), String> {
    outputs[name]
        .try_extract_array::<f32>()
        .map(|array| {
            let shape = array.shape().to_vec();
            (array.iter().copied().collect(), shape)
        })
        .map_err(|error| format!("failed to read {name}: {error}"))
}

fn extract_best_mask(
    pred_masks: &[f32],
    pred_mask_shape: &[usize],
    iou_scores: &[f32],
    width: u32,
    height: u32,
    prepared: &PreparedSamImage,
) -> Result<Vec<u32>, String> {
    let pixel_count = (width as usize)
        .checked_mul(height as usize)
        .ok_or_else(|| "invalid frame dimensions".to_string())?;
    let (num_masks, mask_height, mask_width) = match pred_mask_shape {
        [1, 1, num_masks, mask_height, mask_width] => (*num_masks, *mask_height, *mask_width),
        [1, num_masks, mask_height, mask_width] => (*num_masks, *mask_height, *mask_width),
        [_, num_masks, mask_height, mask_width] => (*num_masks, *mask_height, *mask_width),
        [num_masks, mask_height, mask_width] => (*num_masks, *mask_height, *mask_width),
        _ => {
            return Err(format!(
                "unsupported smart segment mask tensor shape: {pred_mask_shape:?}"
            ));
        }
    };

    if iou_scores.is_empty() {
        return Ok(vec![0; pixel_count]);
    }

    let best_index = iou_scores
        .iter()
        .take(num_masks)
        .enumerate()
        .max_by(|(_, left), (_, right)| {
            left.partial_cmp(right).unwrap_or(std::cmp::Ordering::Equal)
        })
        .map(|(index, _)| index)
        .unwrap_or(0);

    if best_index >= num_masks {
        return Ok(vec![0; pixel_count]);
    }

    let plane_size = mask_height
        .checked_mul(mask_width)
        .ok_or_else(|| "invalid smart segment mask plane size".to_string())?;
    let offset = best_index * plane_size;
    let end = offset + plane_size;
    if end > pred_masks.len() {
        return Err("smart segment mask tensor is shorter than expected".to_string());
    }

    let mut low_res = ImageBuffer::<image::Luma<f32>, Vec<f32>>::from_raw(
        mask_width as u32,
        mask_height as u32,
        pred_masks[offset..end].to_vec(),
    )
    .ok_or_else(|| "invalid smart segment mask tensor".to_string())?;

    let crop_width = prepared.resized_width.min(mask_width as u32);
    let crop_height = prepared.resized_height.min(mask_height as u32);
    let cropped = image::imageops::crop(&mut low_res, 0, 0, crop_width, crop_height).to_image();
    let resized = image::imageops::resize(&cropped, width, height, FilterType::Triangle);

    Ok(resized
        .into_raw()
        .into_iter()
        .map(|value| u32::from(value > 0.0))
        .collect())
}

#[cfg(test)]
mod tests {
    use base64::prelude::{Engine as _, BASE64_STANDARD};

    use super::*;
    use crate::protocol::{ContrastWindow, FramePayload, PixelType, SmartSegmentPointLabel};

    fn solid_frame_payload(value: u8) -> FramePayload {
        let width = 64u32;
        let height = 48u32;
        let pixels = vec![value; (width * height) as usize];
        FramePayload {
            width,
            height,
            data_base64: BASE64_STANDARD.encode(pixels),
            pixel_type: PixelType::Uint8,
            contrast_domain: ContrastWindow { min: 0, max: 255 },
            suggested_contrast: ContrastWindow { min: 0, max: 255 },
            applied_contrast: ContrastWindow { min: 0, max: 255 },
        }
    }

    #[test]
    fn prepare_sam_image_resizes_longest_edge_to_1024() {
        let rgb = vec![128u8; 64 * 48 * 3];
        let prepared = prepare_sam_image(&rgb, 64, 48).expect("prepare");
        assert_eq!(prepared.resized_width, 1024);
        assert_eq!(prepared.resized_height, 768);
        assert_eq!(prepared.pixel_values.len(), (3 * 1024 * 1024) as usize);
    }

    #[test]
    fn segment_mask_returns_zeros_without_points() {
        let frame = solid_frame_payload(100);
        let response = segment_mask_on_frame(&frame, &[]).expect("segment");
        assert_eq!(response.mask.len(), 64 * 48);
        assert!(response.mask.iter().all(|value| *value == 0));
    }

    #[test]
    fn segment_mask_runs_with_prompt_point() {
        if resolve_model_path().is_err() {
            return;
        }
        let frame = solid_frame_payload(180);
        let response = segment_mask_on_frame(
            &frame,
            &[crate::protocol::SmartSegmentPoint {
                x: 32.0,
                y: 24.0,
                label: SmartSegmentPointLabel::try_from(1.0).expect("label"),
            }],
        )
        .expect("segment");
        assert_eq!(response.mask.len(), 64 * 48);
    }
}

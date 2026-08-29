//! ONNX dense fg/bg segmentation backend for gene-expression masks.
//!
//! Model contract matches Python export from `train-gene-expression-seg`:
//! - input `pixel_values`: float32 `(N, 3, S, S)` ImageNet-normalized RGB
//! - output `logits`: float32 `(N, 1, S, S)` (sigmoid + threshold → binary)

use std::path::{Path, PathBuf};

use image::{imageops::FilterType, GrayImage, ImageBuffer, Luma};
use ndarray::{Array, Ix4};
use ort::session::Session;
use ort::value::Tensor;

use crate::analysis::array::Frame2D;
use crate::onnx::{resolve_model_path, workspace_models_dir, IMAGENET_MEAN, IMAGENET_STD};

use super::image_ops::fill_binary_holes_2d;

const DEFAULT_IMAGE_SIZE: u32 = 128;
const DEFAULT_THRESHOLD: f32 = 0.5;

#[derive(Debug, Clone)]
pub struct OnnxSegmentConfig {
    pub model_dir: PathBuf,
    pub image_size: u32,
    pub threshold: f32,
    pub fill_holes: bool,
    pub batch_size: usize,
}

impl Default for OnnxSegmentConfig {
    fn default() -> Self {
        Self {
            model_dir: PathBuf::new(),
            image_size: DEFAULT_IMAGE_SIZE,
            threshold: DEFAULT_THRESHOLD,
            fill_holes: true,
            batch_size: 32,
        }
    }
}

pub fn resolve_ge_seg_model_dir(explicit: Option<&Path>) -> Result<PathBuf, String> {
    if let Some(path) = explicit {
        if path.join("model.onnx").is_file() {
            return Ok(path.to_path_buf());
        }
        if path.file_name().is_some_and(|name| name == "model.onnx") && path.is_file() {
            return Ok(path
                .parent()
                .map(Path::to_path_buf)
                .unwrap_or_else(|| PathBuf::from(".")));
        }
        if path.is_dir() && path.join("onnx/model.onnx").is_file() {
            return Ok(path.join("onnx"));
        }
        return Err(format!(
            "ONNX segment model not found at {} (expected model.onnx)",
            path.display()
        ));
    }

    let candidates = [
        workspace_models_dir().join("single-cell-pattern-unet/onnx"),
        workspace_models_dir().join("single-cell-pattern-unet"),
        PathBuf::from("models/single-cell-pattern-unet/onnx"),
        PathBuf::from("models/single-cell-pattern-unet"),
    ];
    // Prefer LISCA_PATTERN_SEG_MODEL; accept legacy LISCA_GE_SEG_MODEL.
    let env_var = if std::env::var("LISCA_PATTERN_SEG_MODEL").is_ok() {
        "LISCA_PATTERN_SEG_MODEL"
    } else if std::env::var("LISCA_GE_SEG_MODEL").is_ok() {
        "LISCA_GE_SEG_MODEL"
    } else {
        "LISCA_PATTERN_SEG_MODEL"
    };
    resolve_model_path(env_var, candidates)
}

pub struct OnnxSegmenter {
    session: Session,
    input_name: String,
    image_size: u32,
    threshold: f32,
    fill_holes: bool,
    batch_size: usize,
}

impl OnnxSegmenter {
    pub fn open(config: &OnnxSegmentConfig) -> Result<Self, String> {
        let model_path = if config.model_dir.join("model.onnx").is_file() {
            config.model_dir.join("model.onnx")
        } else if config.model_dir.join("onnx/model.onnx").is_file() {
            config.model_dir.join("onnx/model.onnx")
        } else {
            return Err(format!(
                "missing model.onnx under {}",
                config.model_dir.display()
            ));
        };

        let session = Session::builder()
            .map_err(|error| error.to_string())?
            .commit_from_file(&model_path)
            .map_err(|error| format!("failed to load gene-expression seg model: {error}"))?;
        let input_name = session
            .inputs()
            .first()
            .ok_or_else(|| "gene-expression seg model has no inputs".to_string())?
            .name()
            .to_string();

        Ok(Self {
            session,
            input_name,
            image_size: config.image_size.max(1),
            threshold: config.threshold,
            fill_holes: config.fill_holes,
            batch_size: config.batch_size.max(1),
        })
    }

    pub fn segment_frames(&mut self, frames: &[Frame2D]) -> Result<Vec<Vec<bool>>, String> {
        let mut masks = Vec::with_capacity(frames.len());
        for chunk in frames.chunks(self.batch_size) {
            masks.extend(self.segment_batch(chunk)?);
        }
        Ok(masks)
    }

    fn segment_batch(&mut self, frames: &[Frame2D]) -> Result<Vec<Vec<bool>>, String> {
        let batch_len = frames.len();
        let size = self.image_size as usize;
        let plane = size * size;
        let mut batch_data = vec![0.0f32; batch_len * 3 * plane];
        let mut originals: Vec<(usize, usize)> = Vec::with_capacity(batch_len);

        for (index, frame) in frames.iter().enumerate() {
            originals.push((frame.width, frame.height));
            let gray_u8 = min_max_to_u8(frame);
            let resized = resize_gray(
                &gray_u8,
                frame.width as u32,
                frame.height as u32,
                self.image_size,
            );
            let nchw = to_nchw_normalized_size(&resized, self.image_size);
            let offset = index * 3 * plane;
            batch_data[offset..offset + nchw.len()].copy_from_slice(&nchw);
        }

        let shape: Ix4 = ndarray::Dim([batch_len, 3, size, size]);
        let array = Array::from_shape_vec(shape, batch_data).map_err(|error| error.to_string())?;
        let input_tensor = Tensor::from_array(array).map_err(|error| error.to_string())?;
        let input = ort::inputs![&self.input_name => input_tensor];
        let outputs = self.session.run(input).map_err(|error| error.to_string())?;
        let logits = if let Some(output) = outputs.get("logits") {
            output.try_extract_array::<f32>()
        } else {
            outputs[0].try_extract_array::<f32>()
        }
        .map_err(|error| error.to_string())?;

        let mut masks = Vec::with_capacity(batch_len);
        for (index, &(orig_w, orig_h)) in originals.iter().enumerate() {
            let logit_plane = extract_logit_plane(&logits, index, size)?;
            let prob_u8 = logits_to_mask_u8(&logit_plane, size, self.threshold);
            let resized = resize_mask_u8(
                &prob_u8,
                size as u32,
                size as u32,
                orig_w as u32,
                orig_h as u32,
            );
            let mut mask: Vec<bool> = resized.into_iter().map(|value| value > 0).collect();
            if self.fill_holes {
                mask = fill_binary_holes_2d(&mask, orig_w, orig_h);
            }
            masks.push(mask);
        }
        Ok(masks)
    }
}

fn min_max_to_u8(frame: &Frame2D) -> Vec<u8> {
    let data = frame.as_slice();
    if data.is_empty() {
        return Vec::new();
    }
    let mut min_value = f64::INFINITY;
    let mut max_value = f64::NEG_INFINITY;
    for &value in data {
        if value.is_finite() {
            min_value = min_value.min(value);
            max_value = max_value.max(value);
        }
    }
    if !min_value.is_finite()
        || !max_value.is_finite()
        || (max_value - min_value).abs() <= f64::EPSILON
    {
        return vec![0; data.len()];
    }
    let scale = 255.0 / (max_value - min_value);
    data.iter()
        .map(|&value| {
            if value.is_finite() {
                ((value - min_value) * scale).round().clamp(0.0, 255.0) as u8
            } else {
                0
            }
        })
        .collect()
}

fn resize_gray(data: &[u8], width: u32, height: u32, size: u32) -> GrayImage {
    let image = ImageBuffer::<Luma<u8>, Vec<u8>>::from_raw(width, height, data.to_vec())
        .unwrap_or_else(|| ImageBuffer::new(width, height));
    image::imageops::resize(&image, size, size, FilterType::Triangle)
}

fn resize_mask_u8(data: &[u8], width: u32, height: u32, out_w: u32, out_h: u32) -> Vec<u8> {
    let image = ImageBuffer::<Luma<u8>, Vec<u8>>::from_raw(width, height, data.to_vec())
        .unwrap_or_else(|| ImageBuffer::new(width, height));
    let resized = image::imageops::resize(&image, out_w, out_h, FilterType::Nearest);
    resized.into_raw()
}

fn to_nchw_normalized_size(gray: &GrayImage, size: u32) -> Vec<f32> {
    let plane_len = (size * size) as usize;
    let mut output = vec![0.0f32; 3 * plane_len];
    for channel in 0..3 {
        let offset = channel * plane_len;
        for (index, value) in gray.as_raw().iter().enumerate() {
            let normalized = *value as f32 / 255.0;
            output[offset + index] = (normalized - IMAGENET_MEAN[channel]) / IMAGENET_STD[channel];
        }
    }
    output
}

fn extract_logit_plane(
    logits: &ndarray::ArrayViewD<'_, f32>,
    batch_index: usize,
    size: usize,
) -> Result<Vec<f32>, String> {
    let plane = size * size;
    let values = match logits.ndim() {
        4 => {
            // (N, C, H, W) — use channel 0
            let shape = logits.shape();
            if shape[0] <= batch_index {
                return Err("batch index out of range in logits".to_string());
            }
            let h = shape[2];
            let w = shape[3];
            let mut values = Vec::with_capacity(h * w);
            for y in 0..h {
                for x in 0..w {
                    values.push(logits[[batch_index, 0, y, x]]);
                }
            }
            values
        }
        3 => {
            // (N, H, W)
            let shape = logits.shape();
            if shape[0] <= batch_index {
                return Err("batch index out of range in logits".to_string());
            }
            let h = shape[1];
            let w = shape[2];
            let mut values = Vec::with_capacity(h * w);
            for y in 0..h {
                for x in 0..w {
                    values.push(logits[[batch_index, y, x]]);
                }
            }
            values
        }
        _ => {
            return Err(format!(
                "unsupported gene-expression seg logits shape: {:?}",
                logits.shape()
            ));
        }
    };
    if values.len() == plane {
        return Ok(values);
    }
    // Model size mismatch: pad/truncate so threshold path stays square.
    let mut plane_values = vec![0.0f32; plane];
    let copy = values.len().min(plane);
    plane_values[..copy].copy_from_slice(&values[..copy]);
    Ok(plane_values)
}

fn logits_to_mask_u8(logits: &[f32], size: usize, threshold: f32) -> Vec<u8> {
    let plane = size * size;
    let mut out = vec![0u8; plane];
    for (index, &logit) in logits.iter().take(plane).enumerate() {
        let prob = 1.0 / (1.0 + (-logit).exp());
        out[index] = u8::from(prob >= threshold);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn min_max_to_u8_scales_range() {
        let frame = Frame2D::from_vec(vec![10.0, 20.0, 30.0, 40.0], 2, 2).unwrap();
        let bytes = min_max_to_u8(&frame);
        assert_eq!(bytes[0], 0);
        assert_eq!(bytes[3], 255);
    }

    #[test]
    fn logits_to_mask_respects_threshold() {
        // sigmoid(0) == 0.5 → foreground at threshold 0.5; negative logits → bg
        let logits = vec![-2.0f32, 2.0, -0.1, 0.1];
        let mask = logits_to_mask_u8(&logits, 2, 0.5);
        assert_eq!(mask, vec![0, 1, 0, 1]);
    }
}

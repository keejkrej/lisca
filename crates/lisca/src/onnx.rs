//! Shared ONNX mechanics for the ResNet18 image classifiers.

use std::path::{Path, PathBuf};

use image::{imageops::FilterType, GrayImage, ImageBuffer, Luma};
use ndarray::ArrayView;

pub(crate) const IMAGE_SIZE: u32 = 224;
pub(crate) const IMAGENET_MEAN: [f32; 3] = [0.485, 0.456, 0.406];
pub(crate) const IMAGENET_STD: [f32; 3] = [0.229, 0.224, 0.225];

pub(crate) fn workspace_models_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../models")
}

pub(crate) fn resolve_model_path(
    env_var: &str,
    extra_candidates: impl IntoIterator<Item = PathBuf>,
) -> Result<PathBuf, String> {
    if let Ok(env_path) = std::env::var(env_var) {
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
            "{env_var} is set but no model.onnx found at {}",
            path.display()
        ));
    }

    let candidates = extra_candidates.into_iter().collect::<Vec<_>>();
    for candidate in &candidates {
        if candidate.join("model.onnx").is_file() {
            return Ok(candidate.clone());
        }
    }

    let checked = candidates
        .iter()
        .map(|candidate| candidate.join("model.onnx").display().to_string())
        .collect::<Vec<_>>()
        .join(", ");
    Err(format!(
        "model.onnx not found: set {env_var} or place it at one of: {checked}"
    ))
}

pub(crate) fn binary_logits(logits: &ArrayView<f32, ndarray::IxDyn>) -> Result<(f32, f32), String> {
    match logits.ndim() {
        1 if logits.len() >= 2 => Ok((logits[[0]], logits[[1]])),
        2 if logits.shape()[1] >= 2 => Ok((logits[[0, 0]], logits[[0, 1]])),
        4 => Ok((logits[[0, 0, 0, 0]], logits[[0, 1, 0, 0]])),
        _ => Err(format!(
            "unsupported binary classifier logits shape: {:?}",
            logits.shape()
        )),
    }
}

pub(crate) fn first_class_probability(first_logit: f32, second_logit: f32) -> f64 {
    let max = first_logit.max(second_logit);
    let first_exp = (first_logit - max).exp();
    let second_exp = (second_logit - max).exp();
    f64::from(first_exp / (first_exp + second_exp))
}

pub(crate) fn resize_to_224(data: &[u8], width: u32, height: u32) -> GrayImage {
    let image = ImageBuffer::<Luma<u8>, Vec<u8>>::from_raw(width, height, data.to_vec())
        .unwrap_or_else(|| {
            ImageBuffer::from_raw(width, height, vec![0; (width * height) as usize]).unwrap()
        });
    image::imageops::resize(&image, IMAGE_SIZE, IMAGE_SIZE, FilterType::Triangle)
}

pub(crate) fn to_nchw_normalized(gray: &GrayImage) -> Vec<f32> {
    let plane_len = (IMAGE_SIZE * IMAGE_SIZE) as usize;
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

#[cfg(test)]
mod tests {
    use ndarray::array;

    use super::*;

    #[test]
    fn binary_logits_supports_common_export_shapes() {
        let flat_array = array![1.0, 2.0];
        assert_eq!(
            binary_logits(&flat_array.view().into_dyn()).unwrap(),
            (1.0, 2.0)
        );

        let batched_array = array![[0.5, 1.5]];
        assert_eq!(
            binary_logits(&batched_array.view().into_dyn()).unwrap(),
            (0.5, 1.5)
        );

        let spatial_array = ndarray::Array::from_shape_vec((1, 2, 1, 1), vec![3.0, 4.0])
            .unwrap()
            .into_dyn();
        assert_eq!(binary_logits(&spatial_array.view()).unwrap(), (3.0, 4.0));
    }
}

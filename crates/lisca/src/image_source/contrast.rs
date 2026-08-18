use base64::prelude::{Engine as _, BASE64_STANDARD};

use crate::protocol::{ContrastWindow, FramePayload, PixelType};

use super::RawFrame;

const CONTRAST_SAMPLE_SIZE: usize = 2048;

pub(super) fn to_frame_payload(raw: RawFrame, contrast: Option<ContrastWindow>) -> FramePayload {
    let domain = raw.contrast_domain.clone();
    let suggested = auto_contrast(&raw.data);
    let applied = contrast
        .as_ref()
        .map(|window| normalize_contrast(window, &domain))
        .unwrap_or_else(|| suggested.clone());
    let pixels = apply_contrast(&raw.data, &applied);

    FramePayload {
        width: raw.width,
        height: raw.height,
        data_base64: BASE64_STANDARD.encode(pixels),
        pixel_type: PixelType::Uint8,
        contrast_domain: domain,
        suggested_contrast: suggested,
        applied_contrast: applied,
    }
}

fn auto_contrast(values: &[u16]) -> ContrastWindow {
    if values.is_empty() {
        return ContrastWindow { min: 0, max: 1 };
    }

    let min = quantile_floor_subsampled_u16(values, 0.001, CONTRAST_SAMPLE_SIZE) as u32;
    let max = quantile_floor_subsampled_u16(values, 0.999, CONTRAST_SAMPLE_SIZE) as u32;
    ContrastWindow {
        min,
        max: max.max(min + 1),
    }
}

/// Floor-index quantile on pre-sorted `u16` samples (viewer contrast semantics).
fn quantile_floor_sorted_u16(sorted: &[u16], q: f64) -> u16 {
    if sorted.is_empty() {
        return 0;
    }
    let clamped = q.clamp(0.0, 1.0);
    let index = (clamped * (sorted.len().saturating_sub(1)) as f64).floor() as usize;
    sorted[index.min(sorted.len() - 1)]
}

/// Evenly subsample then sort (used for large-frame contrast estimation).
fn subsample_sorted_u16(values: &[u16], sample_size: usize) -> Vec<u16> {
    if values.is_empty() {
        return vec![0];
    }
    if values.len() <= sample_size {
        let mut copy = values.to_vec();
        copy.sort_unstable();
        return copy;
    }

    let step = values.len() as f64 / sample_size as f64;
    let mut sample = Vec::with_capacity(sample_size);
    for index in 0..sample_size {
        let position = (index as f64 * step).floor() as usize;
        sample.push(values[position.min(values.len() - 1)]);
    }
    sample.sort_unstable();
    sample
}

/// Subsampled floor quantile for `u16` frame pixels (aligner/viewer auto-contrast).
fn quantile_floor_subsampled_u16(values: &[u16], q: f64, sample_size: usize) -> u16 {
    quantile_floor_sorted_u16(&subsample_sorted_u16(values, sample_size), q)
}

fn normalize_contrast(contrast: &ContrastWindow, domain: &ContrastWindow) -> ContrastWindow {
    let min = contrast.min.clamp(domain.min, domain.max.saturating_sub(1));
    let max = contrast.max.clamp(min + 1, domain.max);
    ContrastWindow { min, max }
}

fn apply_contrast(values: &[u16], contrast: &ContrastWindow) -> Vec<u8> {
    let min = contrast.min as f32;
    let max = contrast.max.max(contrast.min + 1) as f32;
    let range = (max - min).max(1.0);

    values
        .iter()
        .map(|value| {
            let normalized = ((*value as f32 - min) / range).clamp(0.0, 1.0);
            (normalized * 255.0).round() as u8
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{quantile_floor_sorted_u16, quantile_floor_subsampled_u16, subsample_sorted_u16};

    #[test]
    fn floor_quantile_uses_lower_index() {
        let sorted = [1_u16, 2, 3, 4];
        assert_eq!(quantile_floor_sorted_u16(&sorted, 0.75), 3);
    }

    #[test]
    fn subsampled_quantile_sorts_then_floors() {
        let values = [40_u16, 10, 30, 20];
        assert_eq!(quantile_floor_subsampled_u16(&values, 0.0, 4), 10);
        assert_eq!(quantile_floor_subsampled_u16(&values, 1.0, 4), 40);
    }

    #[test]
    fn subsample_keeps_small_frames_intact() {
        assert_eq!(subsample_sorted_u16(&[3, 1, 2], 8), vec![1, 2, 3]);
    }
}

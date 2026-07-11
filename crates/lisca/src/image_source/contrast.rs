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

    let min =
        crate::analysis::array::quantile_floor_subsampled_u16(values, 0.001, CONTRAST_SAMPLE_SIZE)
            as u32;
    let max =
        crate::analysis::array::quantile_floor_subsampled_u16(values, 0.999, CONTRAST_SAMPLE_SIZE)
            as u32;
    ContrastWindow {
        min,
        max: max.max(min + 1),
    }
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

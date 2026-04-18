use std::cmp::Ordering;

use base64::prelude::{Engine as _, BASE64_STANDARD};
use serde::Serialize;

pub use crate::viewer::domain::{
    AnnotationLabel, AutoExcludeHistogramBin, AutoExcludePreviewCell, AutoExcludePreviewCellScore,
    AutoExcludePreviewRequest, AutoExcludePreviewResponse, ContrastWindow, CropOutputFormat,
    CropRoiResponse, CropRoiStatus, FrameRequest, LoadedRawFrameAnnotation,
    LoadedRoiFrameAnnotation, RawFrameAnnotation, RawFrameAnnotationPayload, RawFrameRequest,
    RoiFrameAnnotation, RoiFrameAnnotationPayload, RoiFrameRequest, RoiWorkspaceScan,
    SaveBboxResponse, SavedAlignState, ViewerSource, WorkspaceScan,
};
use crate::viewer::image::{self, apply_contrast, auto_contrast, load_frame, RawFrame};

const AUTO_EXCLUDE_BIN_COUNT: usize = 40;
const AUTO_EXCLUDE_EPSILON: f64 = 1.0;
#[derive(Clone, Debug, Serialize)]
pub struct FramePayload {
    pub width: u32,
    pub height: u32,
    pub data_base64: String,
    pub pixel_type: &'static str,
    pub contrast_domain: ContrastWindow,
    pub suggested_contrast: ContrastWindow,
    pub applied_contrast: ContrastWindow,
}

#[derive(Clone, Debug)]
struct HistogramResult {
    bins: Vec<AutoExcludeHistogramBin>,
    score_min: f64,
    score_max: f64,
    threshold: f64,
}

fn to_frame_payload(raw: RawFrame, contrast: Option<ContrastWindow>) -> FramePayload {
    let domain = raw.contrast_domain.clone();
    let suggested = auto_contrast(&raw.data);
    let applied = contrast
        .as_ref()
        .map(|window| image::normalize_contrast(window, &domain))
        .unwrap_or_else(|| suggested.clone());
    let pixels = apply_contrast(&raw.data, &applied);

    FramePayload {
        width: raw.width,
        height: raw.height,
        data_base64: BASE64_STANDARD.encode(pixels),
        pixel_type: "uint8",
        contrast_domain: domain,
        suggested_contrast: suggested,
        applied_contrast: applied,
    }
}

fn clipped_cell_bounds(
    cell: &AutoExcludePreviewCell,
    frame_width: u32,
    frame_height: u32,
) -> Option<(usize, usize, usize, usize)> {
    let left = cell.x.min(frame_width) as usize;
    let top = cell.y.min(frame_height) as usize;
    let right = cell.x.saturating_add(cell.w).min(frame_width) as usize;
    let bottom = cell.y.saturating_add(cell.h).min(frame_height) as usize;

    if right <= left || bottom <= top {
        return None;
    }

    Some((left, top, right, bottom))
}

fn collect_cell_values(raw: &RawFrame, cell: &AutoExcludePreviewCell) -> Vec<u16> {
    let Some((left, top, right, bottom)) = clipped_cell_bounds(cell, raw.width, raw.height) else {
        return Vec::new();
    };

    let frame_width = raw.width as usize;
    let mut values = Vec::with_capacity((right - left) * (bottom - top));

    for y in top..bottom {
        let row_offset = y * frame_width;
        values.extend_from_slice(&raw.data[row_offset + left..row_offset + right]);
    }

    values
}

fn mean_u16(values: &[u16]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }

    let sum: u64 = values.iter().map(|value| u64::from(*value)).sum();
    sum as f64 / values.len() as f64
}

fn flatness_score(values: &[u16]) -> Option<f64> {
    if values.is_empty() {
        return None;
    }

    let mut sorted = values.to_vec();
    sorted.sort_unstable();
    let band_len = ((sorted.len() as f64) * 0.1).ceil() as usize;
    let band_len = band_len.max(1).min(sorted.len());
    let low_mean = mean_u16(&sorted[..band_len]);
    let high_mean = mean_u16(&sorted[sorted.len() - band_len..]);

    Some(high_mean / low_mean.max(AUTO_EXCLUDE_EPSILON))
}

fn build_histogram(scores: &[f64]) -> HistogramResult {
    if scores.is_empty() {
        return HistogramResult {
            bins: Vec::new(),
            score_min: 0.0,
            score_max: 0.0,
            threshold: 0.0,
        };
    }

    let score_min = scores.iter().copied().fold(f64::INFINITY, f64::min);
    let raw_score_max = scores.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let score_max = if raw_score_max <= score_min {
        score_min + 1.0
    } else {
        raw_score_max
    };
    let width = (score_max - score_min) / AUTO_EXCLUDE_BIN_COUNT as f64;
    let mut counts = vec![0_u32; AUTO_EXCLUDE_BIN_COUNT];

    for score in scores {
        let relative = ((score - score_min) / width).floor();
        let index = if !relative.is_finite() || relative < 0.0 {
            0
        } else {
            let index = relative as usize;
            index.min(AUTO_EXCLUDE_BIN_COUNT - 1)
        };
        counts[index] += 1;
    }

    let bins = counts
        .iter()
        .enumerate()
        .map(|(index, count)| AutoExcludeHistogramBin {
            start: score_min + index as f64 * width,
            end: score_min + (index + 1) as f64 * width,
            count: *count,
        })
        .collect::<Vec<_>>();

    HistogramResult {
        threshold: otsu_threshold(&bins),
        bins,
        score_min,
        score_max,
    }
}

fn otsu_threshold(bins: &[AutoExcludeHistogramBin]) -> f64 {
    let total: f64 = bins.iter().map(|bin| bin.count as f64).sum();
    if total <= 0.0 {
        return 0.0;
    }

    let centers = bins
        .iter()
        .map(|bin| (bin.start + bin.end) / 2.0)
        .collect::<Vec<_>>();
    let total_mean = bins
        .iter()
        .zip(centers.iter())
        .map(|(bin, center)| *center * bin.count as f64)
        .sum::<f64>()
        / total;

    let mut weight_background = 0.0;
    let mut sum_background = 0.0;
    let mut best_variance = f64::NEG_INFINITY;
    let mut best_threshold = centers[0];

    for (bin, center) in bins.iter().zip(centers.iter()) {
        weight_background += bin.count as f64;
        if weight_background <= 0.0 || weight_background >= total {
            continue;
        }

        sum_background += *center * bin.count as f64;
        let weight_foreground = total - weight_background;
        if weight_foreground <= 0.0 {
            continue;
        }

        let mean_background = sum_background / weight_background;
        let mean_foreground = (total_mean * total - sum_background) / weight_foreground;
        let variance = weight_background
            * weight_foreground
            * (mean_background - mean_foreground)
            * (mean_background - mean_foreground);

        if variance > best_variance {
            best_variance = variance;
            best_threshold = *center;
        }
    }

    best_threshold
}

pub fn scan_source(source: ViewerSource) -> Result<WorkspaceScan, String> {
    image::scan_source(source)
}

pub fn load_frame_payload(
    source: ViewerSource,
    request: FrameRequest,
    contrast: Option<ContrastWindow>,
) -> Result<FramePayload, String> {
    load_frame(source, request).map(|raw| to_frame_payload(raw, contrast))
}

pub fn auto_exclude_preview(
    request: AutoExcludePreviewRequest,
) -> Result<AutoExcludePreviewResponse, String> {
    let raw = load_frame(request.source, request.selection)?;
    let mut cell_scores = request
        .cells
        .into_iter()
        .filter_map(|cell| {
            let values = collect_cell_values(&raw, &cell);
            flatness_score(&values).map(|score| AutoExcludePreviewCellScore {
                i: cell.i,
                j: cell.j,
                score,
            })
        })
        .collect::<Vec<_>>();

    cell_scores.sort_by(|left, right| match left.score.total_cmp(&right.score) {
        Ordering::Equal => match left.i.cmp(&right.i) {
            Ordering::Equal => left.j.cmp(&right.j),
            ordering => ordering,
        },
        ordering => ordering,
    });

    let histogram = build_histogram(
        &cell_scores
            .iter()
            .map(|cell| cell.score)
            .collect::<Vec<_>>(),
    );

    Ok(AutoExcludePreviewResponse {
        eligible_cell_count: cell_scores.len() as u32,
        cell_scores,
        histogram_bins: histogram.bins,
        score_min: histogram.score_min,
        score_max: histogram.score_max,
        threshold: histogram.threshold,
    })
}

pub fn scan_roi_workspace(workspace_path: String) -> Result<RoiWorkspaceScan, String> {
    crate::viewer::roi::scan_roi_workspace(workspace_path)
}

pub fn list_saved_bbox_positions(workspace_path: String) -> Result<Vec<u32>, String> {
    crate::viewer::roi::list_saved_bbox_positions(workspace_path)
}

pub fn load_align_state(
    workspace_path: String,
    pos: u32,
) -> Result<Option<SavedAlignState>, String> {
    crate::viewer::roi::load_align_state(workspace_path, pos)
}

pub fn load_annotation_labels(workspace_path: String) -> Result<Vec<AnnotationLabel>, String> {
    crate::viewer::roi::load_annotation_labels(workspace_path)
}

pub fn save_annotation_labels(
    workspace_path: String,
    labels: Vec<AnnotationLabel>,
) -> Result<Vec<AnnotationLabel>, String> {
    crate::viewer::roi::save_annotation_labels(workspace_path, labels)
}

pub fn load_roi_frame_payload(
    workspace_path: String,
    request: RoiFrameRequest,
    contrast: Option<ContrastWindow>,
) -> Result<FramePayload, String> {
    crate::viewer::roi::load_roi_frame(workspace_path, request)
        .map(|raw| to_frame_payload(raw, contrast))
}

pub fn load_roi_frame_annotation(
    workspace_path: String,
    request: RoiFrameRequest,
) -> Result<LoadedRoiFrameAnnotation, String> {
    crate::viewer::roi::load_roi_frame_annotation(workspace_path, request)
}

pub fn load_raw_annotation_source(workspace_path: String) -> Result<Option<ViewerSource>, String> {
    crate::viewer::raw_annotation::load_raw_annotation_source(workspace_path)
}

pub fn load_raw_frame_annotation(
    workspace_path: String,
    source: ViewerSource,
    request: RawFrameRequest,
) -> Result<LoadedRawFrameAnnotation, String> {
    crate::viewer::raw_annotation::load_raw_frame_annotation(workspace_path, source, request)
}

pub fn save_roi_frame_annotation(
    workspace_path: String,
    request: RoiFrameRequest,
    annotation: RoiFrameAnnotationPayload,
) -> Result<RoiFrameAnnotation, String> {
    crate::viewer::roi::save_roi_frame_annotation(workspace_path, request, annotation)
}

pub fn save_raw_frame_annotation(
    workspace_path: String,
    source: ViewerSource,
    request: RawFrameRequest,
    annotation: RawFrameAnnotationPayload,
) -> Result<RawFrameAnnotation, String> {
    crate::viewer::raw_annotation::save_raw_frame_annotation(
        workspace_path,
        source,
        request,
        annotation,
    )
}

pub fn save_bbox(
    workspace_path: String,
    pos: u32,
    csv: String,
    align_state: SavedAlignState,
) -> SaveBboxResponse {
    crate::viewer::roi::save_bbox(workspace_path, pos, csv, align_state)
}

pub fn crop_roi<F>(
    workspace_path: String,
    source: ViewerSource,
    pos: u32,
    format: CropOutputFormat,
    batch: Option<usize>,
    progress: &mut F,
    is_cancelled: &dyn Fn() -> bool,
) -> CropRoiResponse
where
    F: FnMut(f64, &str) -> Result<(), String>,
{
    crate::viewer::roi::crop_roi(
        workspace_path,
        source,
        pos,
        format,
        batch,
        progress,
        is_cancelled,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::viewer::domain::ContrastWindow;
    use crate::viewer::image::RawFrame;

    #[test]
    fn flatness_score_prefers_flatter_cells() {
        let flat = vec![10_u16, 10, 11, 11, 10, 11, 10, 10, 11, 11];
        let contrasty = vec![1_u16, 1, 2, 2, 3, 150, 180, 190, 200, 220];

        let flat_score = flatness_score(&flat).expect("flat score");
        let contrasty_score = flatness_score(&contrasty).expect("contrasty score");

        assert!(flat_score < contrasty_score);
    }

    #[test]
    fn flatness_score_uses_positive_floor_for_dark_bands() {
        let values = vec![0_u16, 0, 0, 0, 20, 30, 40, 50, 60, 70];
        let score = flatness_score(&values).expect("score");
        assert!(score.is_finite());
        assert!(score > 0.0);
    }

    #[test]
    fn histogram_and_threshold_stay_inside_domain() {
        let histogram = build_histogram(&[1.0, 1.1, 1.2, 4.8, 4.9, 5.0]);
        assert_eq!(histogram.bins.len(), AUTO_EXCLUDE_BIN_COUNT);
        assert!(histogram.threshold >= histogram.score_min);
        assert!(histogram.threshold <= histogram.score_max);
    }

    #[test]
    fn clipped_cell_bounds_preserve_quantized_size_for_interior_cells() {
        let cell = AutoExcludePreviewCell {
            i: 0,
            j: 0,
            x: 350,
            y: 361,
            w: 101,
            h: 81,
        };

        let bounds = clipped_cell_bounds(&cell, 800, 800).expect("bounds");
        assert_eq!(bounds, (350, 361, 451, 442));
    }

    #[test]
    fn frame_payload_preserves_u8_contrast_domain() {
        let payload = to_frame_payload(
            RawFrame {
                width: 2,
                height: 1,
                data: vec![0, 255],
                contrast_domain: ContrastWindow { min: 0, max: 255 },
            },
            None,
        );

        assert_eq!(payload.contrast_domain.min, 0);
        assert_eq!(payload.contrast_domain.max, 255);
        assert_eq!(payload.suggested_contrast.min, 0);
        assert!(payload.suggested_contrast.max <= 255);
        assert!(payload.applied_contrast.max <= 255);
    }
}

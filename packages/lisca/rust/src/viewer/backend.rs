use std::cmp::Ordering;
use std::collections::HashSet;

use base64::prelude::{Engine as _, BASE64_STANDARD};
use serde::Serialize;

pub use crate::viewer::domain::{
    AnnotationLabel, AutoExcludeHistogramBin, AutoExcludePreviewCellScore,
    AutoExcludePreviewRequest, AutoExcludePreviewResponse, ContrastWindow, CropOutputFormat,
    CropRoiResponse, FrameRequest, GridShape, GridState, LoadedRoiFrameAnnotation,
    RoiFrameAnnotation, RoiFrameAnnotationPayload, RoiFrameRequest, RoiWorkspaceScan,
    SaveBboxResponse, ViewerSource, WorkspaceScan,
};
use crate::viewer::image::{self, apply_contrast, auto_contrast, contrast_domain, load_frame, RawFrame};

const AUTO_EXCLUDE_BIN_COUNT: usize = 40;
const AUTO_EXCLUDE_EPSILON: f64 = 1.0;
const GRID_BOUNDS_EPSILON: f64 = 1e-6;

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
struct GridBasisVector {
    x: f64,
    y: f64,
}

#[derive(Clone, Debug)]
struct GridBasis {
    a: GridBasisVector,
    b: GridBasisVector,
}

#[derive(Clone, Debug)]
struct VisibleGridBounds {
    basis: GridBasis,
    origin_x: f64,
    origin_y: f64,
    half_width: f64,
    half_height: f64,
    i_min: i32,
    i_max: i32,
    j_min: i32,
    j_max: i32,
}

#[derive(Clone, Debug)]
struct VisibleCell {
    cell_id: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Clone, Debug)]
struct HistogramResult {
    bins: Vec<AutoExcludeHistogramBin>,
    score_min: f64,
    score_max: f64,
    threshold: f64,
}

fn to_frame_payload(raw: RawFrame, contrast: Option<ContrastWindow>) -> FramePayload {
    let domain = contrast_domain();
    let suggested = auto_contrast(&raw.data);
    let applied = contrast
        .as_ref()
        .map(image::normalize_contrast)
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

fn clamp(value: f64, min: f64, max: f64) -> f64 {
    value.min(max).max(min)
}

fn minimum_grid_spacing(cell_width: f64, cell_height: f64) -> f64 {
    1.0_f64.max(cell_width.min(cell_height))
}

fn normalize_grid_state(grid: &GridState) -> GridState {
    let cell_width = grid.cell_width.max(1.0);
    let cell_height = grid.cell_height.max(1.0);
    let min_spacing = minimum_grid_spacing(cell_width, cell_height);

    GridState {
        enabled: grid.enabled,
        shape: grid.shape.clone(),
        tx: grid.tx,
        ty: grid.ty,
        rotation: grid.rotation,
        spacing_a: grid.spacing_a.max(min_spacing),
        spacing_b: grid.spacing_b.max(min_spacing),
        cell_width,
        cell_height,
        opacity: clamp(grid.opacity, 0.0, 1.0),
    }
}

fn grid_basis(grid: &GridState) -> GridBasis {
    let second_angle = grid.rotation
        + match grid.shape {
            GridShape::Square => std::f64::consts::FRAC_PI_2,
            GridShape::Hex => std::f64::consts::FRAC_PI_3,
        };

    GridBasis {
        a: GridBasisVector {
            x: grid.rotation.cos() * grid.spacing_a,
            y: grid.rotation.sin() * grid.spacing_a,
        },
        b: GridBasisVector {
            x: second_angle.cos() * grid.spacing_b,
            y: second_angle.sin() * grid.spacing_b,
        },
    }
}

fn estimate_grid_range(width: f64, height: f64, spacing_a: f64, spacing_b: f64) -> i32 {
    let min_spacing = 1.0_f64.max(spacing_a.min(spacing_b));
    let estimated_columns = (width / min_spacing).ceil() as i32 + 3;
    let estimated_rows = (height / min_spacing).ceil() as i32 + 3;
    estimated_columns.max(estimated_rows)
}

fn resolve_visible_grid_index_bounds(
    frame_width: f64,
    frame_height: f64,
    grid: &GridState,
) -> VisibleGridBounds {
    let basis = grid_basis(grid);
    let origin_x = frame_width / 2.0 + grid.tx;
    let origin_y = frame_height / 2.0 + grid.ty;
    let half_width = grid.cell_width / 2.0;
    let half_height = grid.cell_height / 2.0;
    let determinant = basis.a.x * basis.b.y - basis.a.y * basis.b.x;

    if determinant.abs() <= GRID_BOUNDS_EPSILON {
        let range = estimate_grid_range(frame_width, frame_height, grid.spacing_a, grid.spacing_b);
        return VisibleGridBounds {
            basis,
            origin_x,
            origin_y,
            half_width,
            half_height,
            i_min: -range,
            i_max: range,
            j_min: -range,
            j_max: range,
        };
    }

    let corners = [
        (-half_width, -half_height),
        (frame_width + half_width, -half_height),
        (-half_width, frame_height + half_height),
        (frame_width + half_width, frame_height + half_height),
    ];
    let mut i_min = f64::INFINITY;
    let mut i_max = f64::NEG_INFINITY;
    let mut j_min = f64::INFINITY;
    let mut j_max = f64::NEG_INFINITY;

    for (x, y) in corners {
        let dx = x - origin_x;
        let dy = y - origin_y;
        let i = (dx * basis.b.y - dy * basis.b.x) / determinant;
        let j = (dy * basis.a.x - dx * basis.a.y) / determinant;
        i_min = i_min.min(i);
        i_max = i_max.max(i);
        j_min = j_min.min(j);
        j_max = j_max.max(j);
    }

    VisibleGridBounds {
        basis,
        origin_x,
        origin_y,
        half_width,
        half_height,
        i_min: (i_min - GRID_BOUNDS_EPSILON).floor() as i32,
        i_max: (i_max + GRID_BOUNDS_EPSILON).ceil() as i32,
        j_min: (j_min - GRID_BOUNDS_EPSILON).floor() as i32,
        j_max: (j_max + GRID_BOUNDS_EPSILON).ceil() as i32,
    }
}

fn cell_intersects_frame(cell: &VisibleCell, frame_width: f64, frame_height: f64) -> bool {
    cell.x + cell.width >= 0.0
        && cell.y + cell.height >= 0.0
        && cell.x <= frame_width
        && cell.y <= frame_height
}

fn enumerate_visible_grid_cells(frame_width: u32, frame_height: u32, grid: &GridState) -> Vec<VisibleCell> {
    if !grid.enabled {
        return Vec::new();
    }

    let normalized = normalize_grid_state(grid);
    let bounds = resolve_visible_grid_index_bounds(frame_width as f64, frame_height as f64, &normalized);
    let mut cells = Vec::new();

    for i in bounds.i_min..=bounds.i_max {
        for j in bounds.j_min..=bounds.j_max {
            let center_x = bounds.origin_x + i as f64 * bounds.basis.a.x + j as f64 * bounds.basis.b.x;
            let center_y = bounds.origin_y + i as f64 * bounds.basis.a.y + j as f64 * bounds.basis.b.y;
            let cell = VisibleCell {
                cell_id: format!("{i}:{j}"),
                x: center_x - bounds.half_width,
                y: center_y - bounds.half_height,
                width: normalized.cell_width,
                height: normalized.cell_height,
            };

            if cell_intersects_frame(&cell, frame_width as f64, frame_height as f64) {
                cells.push(cell);
            }
        }
    }

    cells
}

fn clipped_cell_bounds(cell: &VisibleCell, frame_width: u32, frame_height: u32) -> Option<(usize, usize, usize, usize)> {
    let left = clamp(cell.x.round(), 0.0, frame_width as f64) as usize;
    let top = clamp(cell.y.round(), 0.0, frame_height as f64) as usize;
    let right = clamp((cell.x + cell.width).round(), 0.0, frame_width as f64) as usize;
    let bottom = clamp((cell.y + cell.height).round(), 0.0, frame_height as f64) as usize;

    if right <= left || bottom <= top {
        return None;
    }

    Some((left, top, right, bottom))
}

fn collect_cell_values(raw: &RawFrame, cell: &VisibleCell) -> Vec<u16> {
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
    let excluded = request
        .excluded_cell_ids
        .into_iter()
        .collect::<HashSet<_>>();

    let mut cell_scores = enumerate_visible_grid_cells(raw.width, raw.height, &request.grid)
        .into_iter()
        .filter(|cell| !excluded.contains(&cell.cell_id))
        .filter_map(|cell| {
            let values = collect_cell_values(&raw, &cell);
            flatness_score(&values).map(|score| AutoExcludePreviewCellScore {
                cell_id: cell.cell_id,
                score,
            })
        })
        .collect::<Vec<_>>();

    cell_scores.sort_by(|left, right| match left.score.total_cmp(&right.score) {
        Ordering::Equal => left.cell_id.cmp(&right.cell_id),
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

pub fn save_roi_frame_annotation(
    workspace_path: String,
    request: RoiFrameRequest,
    annotation: RoiFrameAnnotationPayload,
) -> Result<RoiFrameAnnotation, String> {
    crate::viewer::roi::save_roi_frame_annotation(workspace_path, request, annotation)
}

pub fn save_bbox(workspace_path: String, pos: u32, csv: String) -> SaveBboxResponse {
    crate::viewer::roi::save_bbox(workspace_path, pos, csv)
}

pub fn crop_roi<F>(
    workspace_path: String,
    source: ViewerSource,
    pos: u32,
    format: CropOutputFormat,
    progress: &mut F,
) -> CropRoiResponse
where
    F: FnMut(f64, &str) -> Result<(), String>,
{
    crate::viewer::roi::crop_roi(workspace_path, source, pos, format, progress)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_grid() -> GridState {
        GridState {
            enabled: true,
            shape: GridShape::Square,
            tx: 0.0,
            ty: 0.0,
            rotation: 0.0,
            spacing_a: 10.0,
            spacing_b: 10.0,
            cell_width: 8.0,
            cell_height: 8.0,
            opacity: 0.35,
        }
    }

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
    fn visible_cells_respect_frame_intersection() {
        let cells = enumerate_visible_grid_cells(16, 16, &test_grid());
        assert!(!cells.is_empty());
        assert!(cells.iter().any(|cell| cell.cell_id == "0:0"));
    }
}

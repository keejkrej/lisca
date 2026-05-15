use std::{
    cmp::Ordering,
    fs,
    path::{Path, PathBuf},
};

use serde::Serialize;

use crate::{
    image_source::{load_frame, RawFrame},
    protocol::{
        AutoExcludeHistogramBin, AutoExcludePreviewCell, AutoExcludePreviewCellScore,
        AutoExcludePreviewRequest, AutoExcludePreviewResponse, SaveBboxResponse, SavedAlignState,
    },
};

pub use crate::image_source::{load_frame_payload, scan_source};

const AUTO_EXCLUDE_BIN_COUNT: usize = 40;
const AUTO_EXCLUDE_EPSILON: f64 = 1.0;

#[derive(Clone, Debug)]
struct HistogramResult {
    bins: Vec<AutoExcludeHistogramBin>,
    score_min: f64,
    score_max: f64,
    threshold: f64,
}

pub fn load_align_state(workspace_path: &str, pos: u32) -> Result<Option<SavedAlignState>, String> {
    let path = workspace_align_json_path(workspace_path, pos);
    let bytes = match fs::read(&path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.to_string()),
    };
    serde_json::from_slice::<SavedAlignState>(&bytes)
        .map(Some)
        .map_err(|error| format!("{}: {error}", path.display()))
}

pub fn save_bbox(
    workspace_path: &str,
    pos: u32,
    csv: &str,
    align_state: &SavedAlignState,
) -> Result<SaveBboxResponse, String> {
    let bbox_target = workspace_bbox_csv_path(workspace_path, pos);
    if let Some(parent) = bbox_target.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(&bbox_target, csv).map_err(|error| error.to_string())?;

    let align_target = workspace_align_json_path(workspace_path, pos);
    if let Some(parent) = align_target.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let bytes = serde_json::to_vec_pretty(align_state).map_err(|error| error.to_string())?;
    fs::write(&align_target, bytes).map_err(|error| error.to_string())?;

    Ok(SaveBboxResponse {
        ok: true,
        error: None,
    })
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

    let histogram = build_histogram(&cell_scores.iter().map(|cell| cell.score).collect::<Vec<_>>());

    Ok(AutoExcludePreviewResponse {
        eligible_cell_count: cell_scores.len() as u32,
        cell_scores,
        histogram_bins: histogram.bins,
        score_min: histogram.score_min,
        score_max: histogram.score_max,
        threshold: histogram.threshold,
    })
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
            (relative as usize).min(AUTO_EXCLUDE_BIN_COUNT - 1)
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

fn workspace_bbox_csv_path(root: &str, pos: u32) -> PathBuf {
    Path::new(root).join("bbox").join(format!("Pos{pos}.csv"))
}

fn workspace_align_json_path(root: &str, pos: u32) -> PathBuf {
    Path::new(root).join("align").join(format!("Pos{pos}.json"))
}

#[derive(Serialize)]
pub struct OutputPaths {
    pub bbox: String,
    pub align: String,
    pub roi: String,
}

pub fn output_paths(pos: u32) -> OutputPaths {
    OutputPaths {
        bbox: format!("bbox/Pos{pos}.csv"),
        align: format!("align/Pos{pos}.json"),
        roi: format!("roi/Pos{pos}.tif"),
    }
}

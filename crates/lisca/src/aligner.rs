use std::{
    cmp::Ordering,
    collections::BTreeSet,
    fs,
    fs::File,
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering as AtomicOrdering},
};

use serde::Serialize;
use tiff::encoder::{colortype, TiffEncoder};

use crate::{
    image_source::{load_frame, RawFrame},
    protocol::{
        AutoExcludeHistogramBin, AutoExcludePreviewCell, AutoExcludePreviewCellScore,
        AutoExcludePreviewRequest, AutoExcludePreviewResponse, CropRoiProgress, CropRoiRequest,
        CropRoiStatus, RoiBbox, RoiIndexEntry, RoiIndexFile, SaveBboxResponse, SavedAlignState,
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

pub fn list_saved_bbox_positions(workspace_path: &str) -> Result<Vec<u32>, String> {
    let bbox_dir = Path::new(workspace_path).join("bbox");
    let entries = match fs::read_dir(&bbox_dir) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(error.to_string()),
    };
    let mut positions = BTreeSet::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
            continue;
        };
        if let Some(pos) = parse_pos_csv_name(name) {
            positions.insert(pos);
        }
    }
    Ok(positions.into_iter().collect())
}

pub fn roi_pos_exists(workspace_path: &str, pos: u32) -> bool {
    workspace_roi_pos_dir_path(workspace_path, pos).exists()
}

pub fn crop_roi<F>(
    request: CropRoiRequest,
    cancel: &AtomicBool,
    mut on_progress: F,
) -> Result<(), String>
where
    F: FnMut(CropRoiProgress),
{
    let scan = scan_source(request.source.clone())?;
    let positions = if request.positions.is_empty() {
        list_saved_bbox_positions(&request.workspace_path)?
    } else {
        request.positions.clone()
    };
    if positions.is_empty() {
        return Err("no positions selected for crop".to_string());
    }

    let mut position_bboxes = Vec::<(u32, Vec<RoiBbox>)>::new();
    let mut total_rois = 0_u32;
    for pos in &positions {
        let bboxes = read_bbox_csv(&workspace_bbox_csv_path(&request.workspace_path, *pos))?;
        total_rois = total_rois.saturating_add(
            (bboxes.len() as u32)
                .saturating_mul(scan.times.len().max(1) as u32)
                .saturating_mul(scan.channels.len().max(1) as u32)
                .saturating_mul(scan.z_slices.len().max(1) as u32),
        );
        position_bboxes.push((*pos, bboxes));
    }

    let mut progress = CropRoiProgress {
        request_id: request.request_id.clone(),
        status: CropRoiStatus::Running,
        position: None,
        completed_positions: 0,
        total_positions: position_bboxes.len() as u32,
        completed_rois: 0,
        total_rois,
        message: Some("Starting crop".to_string()),
        error: None,
    };
    on_progress(progress.clone());

    for (pos, bboxes) in position_bboxes {
        if cancel.load(AtomicOrdering::SeqCst) {
            progress.status = CropRoiStatus::Cancelled;
            progress.position = Some(pos);
            progress.message = Some("Crop cancelled".to_string());
            on_progress(progress);
            return Ok(());
        }

        let target_dir = workspace_roi_pos_dir_path(&request.workspace_path, pos);
        if target_dir.exists() {
            if request.overwrite {
                fs::remove_dir_all(&target_dir).map_err(|error| error.to_string())?;
            } else {
                return Err(format!("roi/Pos{pos} already exists"));
            }
        }
        fs::create_dir_all(&target_dir).map_err(|error| error.to_string())?;

        progress.position = Some(pos);
        progress.message = Some(format!("Cropping Pos{pos}"));
        on_progress(progress.clone());

        let mut entries = Vec::new();
        for bbox in bboxes {
            if cancel.load(AtomicOrdering::SeqCst) {
                progress.status = CropRoiStatus::Cancelled;
                progress.message = Some("Crop cancelled".to_string());
                on_progress(progress);
                return Ok(());
            }
            write_roi_tiff_stack(&request, pos, &bbox, &scan)?;
            progress.completed_rois = progress.completed_rois.saturating_add(
                (scan.times.len().max(1) as u32)
                    .saturating_mul(scan.channels.len().max(1) as u32)
                    .saturating_mul(scan.z_slices.len().max(1) as u32),
            );
            progress.message = Some(format!("Wrote Pos{} Roi{}", pos, bbox.roi));
            on_progress(progress.clone());
            entries.push(RoiIndexEntry {
                roi: bbox.roi,
                file_name: format!("Roi{}.tif", bbox.roi),
                shape: [
                    scan.times.len().max(1) as u32,
                    scan.channels.len().max(1) as u32,
                    scan.z_slices.len().max(1) as u32,
                    bbox.h,
                    bbox.w,
                ],
                bbox,
            });
        }

        write_roi_index(&request, pos, entries, &scan)?;
        progress.completed_positions = progress.completed_positions.saturating_add(1);
        progress.message = Some(format!("Finished Pos{pos}"));
        on_progress(progress.clone());
    }

    progress.status = CropRoiStatus::Completed;
    progress.position = None;
    progress.message = Some("Crop completed".to_string());
    on_progress(progress);
    Ok(())
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

fn workspace_roi_pos_dir_path(root: &str, pos: u32) -> PathBuf {
    Path::new(root).join("roi").join(format!("Pos{pos}"))
}

fn workspace_roi_tiff_path(root: &str, pos: u32, roi: u32) -> PathBuf {
    workspace_roi_pos_dir_path(root, pos).join(format!("Roi{roi}.tif"))
}

fn workspace_roi_index_path(root: &str, pos: u32) -> PathBuf {
    workspace_roi_pos_dir_path(root, pos).join("index.json")
}

fn parse_pos_csv_name(name: &str) -> Option<u32> {
    let rest = name.strip_prefix("Pos")?.strip_suffix(".csv")?;
    rest.parse().ok()
}

fn parse_bbox_csv_value(value: &str, label: &str) -> Result<u32, String> {
    value
        .trim()
        .parse::<u32>()
        .map_err(|error| format!("invalid bbox {label}: {error}"))
}

fn read_bbox_csv(path: &Path) -> Result<Vec<RoiBbox>, String> {
    let text = fs::read_to_string(path).map_err(|error| format!("{}: {error}", path.display()))?;
    let mut bboxes = Vec::new();
    for (line_index, line) in text.lines().enumerate() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let columns = trimmed.split(',').map(str::trim).collect::<Vec<_>>();
        if line_index == 0 && columns.first().copied() == Some("roi") {
            continue;
        }
        if columns.len() < 5 {
            return Err(format!(
                "{}:{} expected at least 5 columns",
                path.display(),
                line_index + 1
            ));
        }
        let roi = parse_bbox_csv_value(columns[0], "roi")?;
        let x = parse_bbox_csv_value(columns[1], "x")?;
        let y = parse_bbox_csv_value(columns[2], "y")?;
        let w = parse_bbox_csv_value(columns[3], "w")?;
        let h = parse_bbox_csv_value(columns[4], "h")?;
        if w == 0 || h == 0 {
            continue;
        }
        bboxes.push(RoiBbox { roi, x, y, w, h });
    }
    if bboxes.is_empty() {
        return Err(format!("{} contains no crop boxes", path.display()));
    }
    Ok(bboxes)
}

fn crop_frame(raw: &RawFrame, bbox: &RoiBbox) -> Result<Vec<u16>, String> {
    let right = bbox
        .x
        .checked_add(bbox.w)
        .ok_or_else(|| "bbox width overflows frame bounds".to_string())?;
    let bottom = bbox
        .y
        .checked_add(bbox.h)
        .ok_or_else(|| "bbox height overflows frame bounds".to_string())?;
    if right > raw.width || bottom > raw.height {
        return Err(format!(
            "bbox Roi{} ({}, {}, {}, {}) exceeds frame {}x{}",
            bbox.roi, bbox.x, bbox.y, bbox.w, bbox.h, raw.width, raw.height
        ));
    }

    let mut pixels = Vec::with_capacity((bbox.w * bbox.h) as usize);
    let frame_width = raw.width as usize;
    for y in bbox.y as usize..bottom as usize {
        let start = y * frame_width + bbox.x as usize;
        let end = start + bbox.w as usize;
        pixels.extend_from_slice(&raw.data[start..end]);
    }
    Ok(pixels)
}

fn write_roi_tiff_stack(
    request: &CropRoiRequest,
    pos: u32,
    bbox: &RoiBbox,
    scan: &crate::protocol::WorkspaceScan,
) -> Result<(), String> {
    let path = workspace_roi_tiff_path(&request.workspace_path, pos, bbox.roi);
    let file = File::create(&path).map_err(|error| error.to_string())?;
    let mut encoder = TiffEncoder::new(file).map_err(|error| error.to_string())?;

    for time in scan.times.iter().copied() {
        for channel in scan.channels.iter().copied() {
            for z in scan.z_slices.iter().copied() {
                let raw = load_frame(
                    request.source.clone(),
                    crate::protocol::FrameRequest {
                        pos,
                        channel,
                        time,
                        z,
                    },
                )?;
                let pixels = crop_frame(&raw, bbox)?;
                let image = encoder
                    .new_image::<colortype::Gray16>(bbox.w, bbox.h)
                    .map_err(|error| error.to_string())?;
                image
                    .write_data(&pixels)
                    .map_err(|error| error.to_string())?;
            }
        }
    }
    Ok(())
}

fn write_roi_index(
    request: &CropRoiRequest,
    pos: u32,
    entries: Vec<RoiIndexEntry>,
    scan: &crate::protocol::WorkspaceScan,
) -> Result<(), String> {
    let index = RoiIndexFile {
        position: pos,
        axis_order: "TCZYX".to_string(),
        page_order: vec!["t".to_string(), "c".to_string(), "z".to_string()],
        time_count: scan.times.len().max(1) as u32,
        channel_count: scan.channels.len().max(1) as u32,
        z_count: scan.z_slices.len().max(1) as u32,
        source: request.source.clone(),
        rois: entries,
    };
    let bytes = serde_json::to_vec_pretty(&index).map_err(|error| error.to_string())?;
    fs::write(
        workspace_roi_index_path(&request.workspace_path, pos),
        bytes,
    )
    .map_err(|error| error.to_string())
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

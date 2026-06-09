use std::{
    cmp::Ordering,
    collections::{BTreeSet, VecDeque},
    fs,
    fs::File,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering as AtomicOrdering},
        mpsc, Arc, Mutex,
    },
};

use tiff::encoder::{colortype, TiffEncoder};

use crate::{
    analysis::array::otsu_on_histogram,
    image_source::{load_frame, RawFrame},
    protocol::{
        AutoExcludeHistogramBin, AutoExcludePreviewCell, AutoExcludePreviewCellScore,
        AutoExcludePreviewRequest, AutoExcludePreviewResponse, CropRoiProgress, CropRoiRequest,
        CropRoiStatus, FrameRequest, RoiBbox, RoiIndexEntry, RoiIndexFile, SaveBboxResponse,
        SavedAlignState, WorkspaceScan,
    },
};

pub use crate::image_source::{load_frame_payload, scan_source};

const AUTO_EXCLUDE_BIN_COUNT: usize = 40;
const AUTO_EXCLUDE_EPSILON: f64 = 1.0;
const CROP_MAX_POSITION_WORKERS: usize = 4;
const CROP_ROI_CHUNK_SIZE: usize = 32;

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
    let workspace = Path::new(&request.workspace_path);
    if !workspace.is_dir() {
        return Err(format!(
            "workspace path does not exist or is not a directory: {}",
            workspace.display()
        ));
    }

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
    let mut skipped_positions = Vec::<u32>::new();
    let mut total_rois = 0_u32;
    for pos in &positions {
        let bbox_path = workspace_bbox_csv_path(&request.workspace_path, *pos);
        if !bbox_path.is_file() {
            return Err(format!("missing bbox CSV: {}", bbox_path.display()));
        }
        let bboxes = parse_bbox_csv(&bbox_path)?;
        if bboxes.is_empty() {
            skipped_positions.push(*pos);
            continue;
        }
        total_rois = total_rois.saturating_add(
            (bboxes.len() as u32)
                .saturating_mul(scan.times.len().max(1) as u32)
                .saturating_mul(scan.channels.len().max(1) as u32)
                .saturating_mul(scan.z_slices.len().max(1) as u32),
        );
        position_bboxes.push((*pos, bboxes));
    }
    if position_bboxes.is_empty() {
        if skipped_positions.is_empty() {
            return Err("no positions with crop boxes".to_string());
        }
        return Err(format!(
            "no positions with crop boxes (skipped Pos{})",
            skipped_positions
                .iter()
                .map(|pos| pos.to_string())
                .collect::<Vec<_>>()
                .join(", ")
        ));
    }
    if !request.overwrite {
        for (pos, _) in &position_bboxes {
            if workspace_roi_pos_dir_path(&request.workspace_path, *pos).exists() {
                return Err(format!("roi/Pos{pos} already exists"));
            }
        }
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
        skipped_positions: skipped_positions.clone(),
    };
    on_progress(progress.clone());

    let request = Arc::new(request);
    let scan = Arc::new(scan);
    let page_count_per_roi = scan_page_count(&scan);
    let worker_count = crop_position_worker_count(position_bboxes.len());
    let queue = Arc::new(Mutex::new(VecDeque::from(position_bboxes)));
    let (event_sender, event_receiver) = mpsc::channel::<CropPositionEvent>();
    let mut failed = None::<String>;
    let mut cancelled = false;

    std::thread::scope(|scope| {
        for _ in 0..worker_count {
            let request = request.clone();
            let scan = scan.clone();
            let queue = queue.clone();
            let event_sender = event_sender.clone();
            scope.spawn(move || {
                crop_position_worker(request, scan, queue, cancel, event_sender);
            });
        }
        drop(event_sender);

        for event in event_receiver {
            match event {
                CropPositionEvent::Started { pos } if failed.is_none() && !cancelled => {
                    progress.position = Some(pos);
                    progress.message = Some(format!("Cropping Pos{pos}"));
                    on_progress(progress.clone());
                }
                CropPositionEvent::RoiWritten { pos, roi } if failed.is_none() && !cancelled => {
                    progress.position = Some(pos);
                    progress.completed_rois =
                        progress.completed_rois.saturating_add(page_count_per_roi);
                    progress.message = Some(format!("Wrote Pos{pos} Roi{roi}"));
                    on_progress(progress.clone());
                }
                CropPositionEvent::Finished { pos } if failed.is_none() && !cancelled => {
                    progress.position = Some(pos);
                    progress.completed_positions = progress.completed_positions.saturating_add(1);
                    progress.message = Some(format!("Finished Pos{pos}"));
                    on_progress(progress.clone());
                }
                CropPositionEvent::Cancelled { pos } if failed.is_none() && !cancelled => {
                    cancelled = true;
                    progress.status = CropRoiStatus::Cancelled;
                    progress.position = Some(pos);
                    progress.message = Some("Crop cancelled".to_string());
                    on_progress(progress.clone());
                }
                CropPositionEvent::Error { message } if failed.is_none() => {
                    cancel.store(true, AtomicOrdering::SeqCst);
                    failed = Some(message);
                }
                _ => {}
            }
        }
    });

    if let Some(error) = failed {
        return Err(error);
    }
    if cancelled || cancel.load(AtomicOrdering::SeqCst) {
        if !matches!(progress.status, CropRoiStatus::Cancelled) {
            progress.status = CropRoiStatus::Cancelled;
            progress.message = Some("Crop cancelled".to_string());
            on_progress(progress);
        }
        return Ok(());
    }

    progress.status = CropRoiStatus::Completed;
    progress.position = None;
    progress.skipped_positions = skipped_positions.clone();
    progress.message = Some(if skipped_positions.is_empty() {
        "Crop completed".to_string()
    } else {
        format!(
            "Crop completed (skipped Pos{} with no crop boxes)",
            skipped_positions
                .iter()
                .map(|pos| pos.to_string())
                .collect::<Vec<_>>()
                .join(", ")
        )
    });
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
    let counts: Vec<f64> = bins.iter().map(|bin| bin.count as f64).collect();
    let centers: Vec<f64> = bins
        .iter()
        .map(|bin| (bin.start + bin.end) / 2.0)
        .collect();
    otsu_on_histogram(&counts, &centers)
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

fn parse_bbox_csv(path: &Path) -> Result<Vec<RoiBbox>, String> {
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

enum CropPositionEvent {
    Started { pos: u32 },
    RoiWritten { pos: u32, roi: u32 },
    Finished { pos: u32 },
    Cancelled { pos: u32 },
    Error { message: String },
}

struct RoiTiffWriter {
    bbox: RoiBbox,
    encoder: TiffEncoder<File>,
}

impl RoiTiffWriter {
    fn create(request: &CropRoiRequest, pos: u32, bbox: &RoiBbox) -> Result<Self, String> {
        let path = workspace_roi_tiff_path(&request.workspace_path, pos, bbox.roi);
        let file = File::create(&path).map_err(|error| error.to_string())?;
        let encoder = TiffEncoder::new(file).map_err(|error| error.to_string())?;
        Ok(Self {
            bbox: bbox.clone(),
            encoder,
        })
    }
}

fn crop_position_worker(
    request: Arc<CropRoiRequest>,
    scan: Arc<WorkspaceScan>,
    queue: Arc<Mutex<VecDeque<(u32, Vec<RoiBbox>)>>>,
    cancel: &AtomicBool,
    event_sender: mpsc::Sender<CropPositionEvent>,
) {
    loop {
        if cancel.load(AtomicOrdering::SeqCst) {
            return;
        }
        let next = match queue.lock() {
            Ok(mut queue) => queue.pop_front(),
            Err(_) => {
                let _ = event_sender.send(CropPositionEvent::Error {
                    message: "crop queue state is poisoned".to_string(),
                });
                return;
            }
        };
        let Some((pos, bboxes)) = next else {
            return;
        };
        match crop_position_frame_major(&request, &scan, pos, bboxes, cancel, &event_sender) {
            Ok(()) => {}
            Err(CropPositionStop::Cancelled) => {
                let _ = event_sender.send(CropPositionEvent::Cancelled { pos });
                return;
            }
            Err(CropPositionStop::Error(message)) => {
                cancel.store(true, AtomicOrdering::SeqCst);
                let _ = event_sender.send(CropPositionEvent::Error { message });
                return;
            }
        }
    }
}

enum CropPositionStop {
    Cancelled,
    Error(String),
}

impl From<String> for CropPositionStop {
    fn from(value: String) -> Self {
        Self::Error(value)
    }
}

fn crop_position_frame_major(
    request: &CropRoiRequest,
    scan: &WorkspaceScan,
    pos: u32,
    bboxes: Vec<RoiBbox>,
    cancel: &AtomicBool,
    event_sender: &mpsc::Sender<CropPositionEvent>,
) -> Result<(), CropPositionStop> {
    if cancel.load(AtomicOrdering::SeqCst) {
        return Err(CropPositionStop::Cancelled);
    }

    let target_dir = workspace_roi_pos_dir_path(&request.workspace_path, pos);
    if target_dir.exists() {
        if request.overwrite {
            fs::remove_dir_all(&target_dir).map_err(|error| error.to_string())?;
        } else {
            return Err(CropPositionStop::Error(format!(
                "roi/Pos{pos} already exists"
            )));
        }
    }
    fs::create_dir_all(&target_dir).map_err(|error| error.to_string())?;

    let _ = event_sender.send(CropPositionEvent::Started { pos });
    for chunk in bboxes.chunks(CROP_ROI_CHUNK_SIZE) {
        if cancel.load(AtomicOrdering::SeqCst) {
            return Err(CropPositionStop::Cancelled);
        }
        write_roi_tiff_chunk_frame_major(request, scan, pos, chunk, cancel)?;
        for bbox in chunk {
            let _ = event_sender.send(CropPositionEvent::RoiWritten { pos, roi: bbox.roi });
        }
    }

    write_roi_index(request, pos, roi_index_entries(&bboxes, scan), scan)?;
    let _ = event_sender.send(CropPositionEvent::Finished { pos });
    Ok(())
}

fn write_roi_tiff_chunk_frame_major(
    request: &CropRoiRequest,
    scan: &WorkspaceScan,
    pos: u32,
    bboxes: &[RoiBbox],
    cancel: &AtomicBool,
) -> Result<(), CropPositionStop> {
    let mut writers = bboxes
        .iter()
        .map(|bbox| RoiTiffWriter::create(request, pos, bbox))
        .collect::<Result<Vec<_>, _>>()?;

    for time in scan.times.iter().copied() {
        for channel in scan.channels.iter().copied() {
            for z in scan.z_slices.iter().copied() {
                if cancel.load(AtomicOrdering::SeqCst) {
                    return Err(CropPositionStop::Cancelled);
                }
                let raw = load_frame(
                    request.source.clone(),
                    FrameRequest {
                        pos,
                        channel,
                        time,
                        z,
                    },
                )
                .map_err(|error| {
                    format!(
                        "Pos{pos} channel={channel} time={time} z={z}: {error}",
                        pos = pos,
                        channel = channel,
                        time = time,
                        z = z,
                    )
                })?;
                for writer in &mut writers {
                    let pixels = crop_frame(&raw, &writer.bbox)?;
                    write_roi_tiff_page(&mut writer.encoder, &writer.bbox, &pixels)?;
                }
            }
        }
    }
    drop(writers);
    Ok(())
}

fn write_roi_tiff_page(
    encoder: &mut TiffEncoder<File>,
    bbox: &RoiBbox,
    pixels: &[u16],
) -> Result<(), String> {
    let image = encoder
        .new_image::<colortype::Gray16>(bbox.w, bbox.h)
        .map_err(|error| error.to_string())?;
    image.write_data(pixels).map_err(|error| error.to_string())
}

fn crop_position_worker_count(position_count: usize) -> usize {
    let available = std::thread::available_parallelism()
        .map(usize::from)
        .unwrap_or(1);
    position_count
        .min(available)
        .min(CROP_MAX_POSITION_WORKERS)
        .max(1)
}

fn scan_page_count(scan: &WorkspaceScan) -> u32 {
    (scan.times.len().max(1) as u32)
        .saturating_mul(scan.channels.len().max(1) as u32)
        .saturating_mul(scan.z_slices.len().max(1) as u32)
}

fn roi_index_entries(bboxes: &[RoiBbox], scan: &WorkspaceScan) -> Vec<RoiIndexEntry> {
    bboxes
        .iter()
        .cloned()
        .map(|bbox| RoiIndexEntry {
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
        })
        .collect()
}

fn write_roi_index(
    request: &CropRoiRequest,
    pos: u32,
    entries: Vec<RoiIndexEntry>,
    scan: &WorkspaceScan,
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

pub use crate::protocol::AlignOutputPaths;

pub fn output_paths(pos: u32) -> AlignOutputPaths {
    AlignOutputPaths {
        bbox: format!("bbox/Pos{pos}.csv"),
        align: format!("align/Pos{pos}.json"),
        roi: format!("roi/Pos{pos}.tif"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn parse_bbox_csv_returns_empty_for_header_only_file() {
        let path = std::env::temp_dir().join(format!(
            "lisca-empty-bbox-{}.csv",
            std::process::id()
        ));
        let mut file = fs::File::create(&path).expect("create csv");
        writeln!(file, "roi,x,y,w,h,i,j").expect("write header");
        let bboxes = parse_bbox_csv(&path).expect("parse csv");
        assert!(bboxes.is_empty());
        let _ = fs::remove_file(path);
    }
}

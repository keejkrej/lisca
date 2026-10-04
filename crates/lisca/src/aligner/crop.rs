use std::{
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
use uuid::Uuid;

use crate::{
    image_source::{scan_source, CachedSourceReader, RawFrame},
    migrations::migrate_workspace,
    protocol::{
        AlignDrift, CropRoiProgress, CropRoiRequest, CropRoiStatus, FrameRequest, RoiBbox,
        RoiIndexEntry, RoiIndexFile, WorkspaceScan,
    },
};

use super::workspace::{
    bbox_csv_path, list_saved_bbox_positions, load_align_state, parse_bbox_csv, roi_pos_dir_path,
};

/// Extra position workers each open another ND2/CZI reader on the same file
/// and contend for seeks (especially JupyterHub NFS). Default is one worker;
/// `LISCA_CROP_WORKERS` opts into parallelism but is an upper bound, not a
/// guarantee — the FD budget can still shrink the request.
const FD_HEADROOM: u64 = 256;
const MIN_FD_BUDGET: u64 = 64;
const UNBOUNDED_FD_BUDGET: u64 = 1 << 20;
const CROP_WORKERS_ENV: &str = "LISCA_CROP_WORKERS";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CropPositionOutput {
    pub roi_pages: u32,
    pub skipped: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CropPositionError {
    Cancelled,
    Failed(String),
}

pub fn inspect_crop_position(
    workspace_path: &str,
    scan: &WorkspaceScan,
    pos: u32,
) -> Result<CropPositionOutput, String> {
    let bbox_path = bbox_csv_path(workspace_path, pos);
    if !bbox_path.is_file() {
        return Err(format!("missing bbox CSV: {}", bbox_path.display()));
    }
    let bboxes = parse_bbox_csv(&bbox_path)?;
    Ok(CropPositionOutput {
        roi_pages: (bboxes.len() as u32)
            .saturating_mul(scan.times.len().max(1) as u32)
            .saturating_mul(scan.channels.len().max(1) as u32)
            .saturating_mul(scan.z_slices.len().max(1) as u32),
        skipped: bboxes.is_empty(),
    })
}

impl From<String> for CropPositionError {
    fn from(value: String) -> Self {
        Self::Failed(value)
    }
}

/// Crops and atomically publishes exactly one position.
///
/// The caller owns scheduling. One source pass opens every `Roi{n}.tif` writer
/// for the position, then loads each T×C×Z plane once. Cancellation is checked
/// per plane and immediately before publication. A failed or cancelled call
/// removes its staging directory and leaves any previously published position
/// untouched.
pub fn crop_roi_position<F>(
    request: &CropRoiRequest,
    scan: &WorkspaceScan,
    pos: u32,
    is_cancelled: F,
) -> Result<CropPositionOutput, CropPositionError>
where
    F: Fn() -> bool,
{
    crop_roi_position_with_progress(request, scan, pos, is_cancelled, |_| {})
}

pub fn crop_roi_position_with_progress<F, P>(
    request: &CropRoiRequest,
    scan: &WorkspaceScan,
    pos: u32,
    is_cancelled: F,
    mut on_pages_written: P,
) -> Result<CropPositionOutput, CropPositionError>
where
    F: Fn() -> bool,
    P: FnMut(u32),
{
    if is_cancelled() {
        return Err(CropPositionError::Cancelled);
    }
    migrate_workspace(Path::new(&request.workspace_path))?;
    let summary = inspect_crop_position(&request.workspace_path, scan, pos)?;
    if summary.skipped {
        return Ok(summary);
    }
    let bboxes = parse_bbox_csv(&bbox_csv_path(&request.workspace_path, pos))?;
    let mut source_reader = CachedSourceReader::open(request.source.clone())?;
    let mut pages_written = 0_u32;
    crop_position_atomic(
        request,
        scan,
        pos,
        &bboxes,
        &is_cancelled,
        |count| {
            pages_written = pages_written.saturating_add(count);
            on_pages_written(pages_written);
        },
        &mut CropFrameSource {
            load_frame: &mut |frame_request| source_reader.load_frame(frame_request),
            fd_budget: crop_fd_budget(None),
            drift: None,
        },
    )?;
    Ok(summary)
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
    migrate_workspace(workspace)?;

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
        let bbox_path = bbox_csv_path(&request.workspace_path, *pos);
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
            if roi_pos_dir_path(&request.workspace_path, *pos).exists() {
                return Err(format!("roi/Pos{pos} already exists"));
            }
        }
    }

    let fd_budget = crop_fd_budget(None);
    let max_roi_count = position_bboxes
        .iter()
        .map(|(_, bboxes)| bboxes.len())
        .max()
        .unwrap_or(0);
    let worker_count = crop_position_worker_count(position_bboxes.len(), max_roi_count, fd_budget);

    let mut progress = CropRoiProgress {
        request_id: request.request_id.clone(),
        status: CropRoiStatus::Running,
        position: None,
        completed_positions: 0,
        total_positions: position_bboxes.len() as u32,
        completed_rois: 0,
        total_rois,
        message: Some(format!(
            "Starting crop with {worker_count} worker(s) for {} position(s)",
            position_bboxes.len()
        )),
        error: None,
        skipped_positions: skipped_positions.clone(),
    };
    on_progress(progress.clone());

    let request = Arc::new(request);
    let scan = Arc::new(scan);
    let queue = Arc::new(Mutex::new(VecDeque::from(position_bboxes)));
    let (event_sender, event_receiver) = mpsc::channel::<CropPositionEvent>();
    let mut failed = None::<String>;
    let mut cancelled = false;
    let mut active_positions = BTreeSet::<u32>::new();

    std::thread::scope(|scope| {
        for _ in 0..worker_count {
            let request = request.clone();
            let scan = scan.clone();
            let queue = queue.clone();
            let event_sender = event_sender.clone();
            scope.spawn(move || {
                crop_position_worker(request, scan, queue, cancel, event_sender, fd_budget);
            });
        }
        drop(event_sender);

        for event in event_receiver {
            match event {
                CropPositionEvent::Started { pos } if failed.is_none() && !cancelled => {
                    active_positions.insert(pos);
                    set_active_position_progress(&mut progress, &active_positions);
                    on_progress(progress.clone());
                }
                CropPositionEvent::PagesWritten { pos, count }
                    if failed.is_none() && !cancelled =>
                {
                    debug_assert!(active_positions.contains(&pos));
                    record_pages_written(&mut progress, count);
                    set_active_position_progress(&mut progress, &active_positions);
                    on_progress(progress.clone());
                }
                CropPositionEvent::Finished { pos } if failed.is_none() && !cancelled => {
                    active_positions.remove(&pos);
                    progress.position = Some(pos);
                    progress.completed_positions = progress
                        .completed_positions
                        .saturating_add(1)
                        .min(progress.total_positions);
                    progress.message = Some(format!("Finished Pos{pos}"));
                    on_progress(progress.clone());
                }
                CropPositionEvent::Cancelled { pos } if failed.is_none() && !cancelled => {
                    active_positions.remove(&pos);
                    cancelled = true;
                    progress.status = CropRoiStatus::Cancelled;
                    progress.position = Some(pos);
                    progress.message = Some("Crop cancelled".to_string());
                    on_progress(progress.clone());
                }
                CropPositionEvent::Error { pos, message } if failed.is_none() => {
                    if let Some(pos) = pos {
                        active_positions.remove(&pos);
                    }
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

enum CropPositionEvent {
    Started { pos: u32 },
    PagesWritten { pos: u32, count: u32 },
    Finished { pos: u32 },
    Cancelled { pos: u32 },
    Error { pos: Option<u32>, message: String },
}

fn set_active_position_progress(progress: &mut CropRoiProgress, active: &BTreeSet<u32>) {
    match active.len() {
        0 => {
            progress.position = None;
            progress.message = Some("Cropping".to_string());
        }
        1 => {
            let pos = active.iter().next().copied().expect("one active position");
            progress.position = Some(pos);
            progress.message = Some(format!("Cropping Pos{pos}"));
        }
        count => {
            progress.position = None;
            progress.message = Some(format!("Cropping {count} positions"));
        }
    }
}

fn record_pages_written(progress: &mut CropRoiProgress, count: u32) {
    progress.completed_rois = progress
        .completed_rois
        .saturating_add(count)
        .min(progress.total_rois);
}

struct RoiTiffWriter {
    bbox: RoiBbox,
    encoder: TiffEncoder<File>,
}

impl RoiTiffWriter {
    fn create(output_dir: &Path, bbox: &RoiBbox) -> Result<Self, String> {
        let path = output_dir.join(format!("Roi{}.tif", bbox.roi));
        let file = File::create(&path).map_err(|error| {
            if is_too_many_open_files(&error) {
                format!(
                    "too many open files creating {}: {error}. This crop keeps one TIFF writer open per ROI and cannot append after close",
                    path.display()
                )
            } else {
                error.to_string()
            }
        })?;
        let encoder = TiffEncoder::new(file).map_err(|error| error.to_string())?;
        Ok(Self {
            bbox: bbox.clone(),
            encoder,
        })
    }
}

struct StagingDirectory {
    path: Option<PathBuf>,
}

impl StagingDirectory {
    fn new(path: PathBuf) -> Self {
        Self { path: Some(path) }
    }

    fn disarm(&mut self) {
        self.path = None;
    }
}

impl Drop for StagingDirectory {
    fn drop(&mut self) {
        if let Some(path) = self.path.take() {
            if let Err(error) = fs::remove_dir_all(&path) {
                tracing::warn!(path = %path.display(), %error, "failed to remove crop staging directory");
            }
        }
    }
}

fn publish_staged_directory(
    staging_dir: &Path,
    target_dir: &Path,
    overwrite: bool,
) -> Result<(), CropPositionError> {
    if !target_dir.exists() {
        return fs::rename(staging_dir, target_dir).map_err(|error| error.to_string().into());
    }
    if !overwrite {
        return Err(CropPositionError::Failed(format!(
            "{} already exists",
            target_dir.display()
        )));
    }

    let parent = target_dir
        .parent()
        .ok_or_else(|| CropPositionError::Failed("crop output has no parent".to_string()))?;
    let file_name = target_dir
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("position");
    let backup_dir = parent.join(format!(".{file_name}.previous-{}", Uuid::new_v4()));
    fs::rename(target_dir, &backup_dir).map_err(|error| error.to_string())?;
    if let Err(error) = fs::rename(staging_dir, target_dir) {
        let rollback = fs::rename(&backup_dir, target_dir);
        return Err(CropPositionError::Failed(match rollback {
            Ok(()) => error.to_string(),
            Err(rollback_error) => {
                format!("{error}; failed to restore previous crop output: {rollback_error}")
            }
        }));
    }
    if let Err(error) = fs::remove_dir_all(&backup_dir) {
        tracing::warn!(
            path = %backup_dir.display(),
            %error,
            "failed to remove previous crop output"
        );
    }
    Ok(())
}

type CropJobQueue = Arc<Mutex<VecDeque<(u32, Vec<RoiBbox>)>>>;

struct CropFrameSource<'a, L> {
    load_frame: &'a mut L,
    fd_budget: u64,
    drift: Option<AlignDrift>,
}

fn crop_position_worker(
    request: Arc<CropRoiRequest>,
    scan: Arc<WorkspaceScan>,
    queue: CropJobQueue,
    cancel: &AtomicBool,
    event_sender: mpsc::Sender<CropPositionEvent>,
    fd_budget: u64,
) {
    let mut source_reader = match CachedSourceReader::open(request.source.clone()) {
        Ok(reader) => reader,
        Err(message) => {
            cancel.store(true, AtomicOrdering::SeqCst);
            let _ = event_sender.send(CropPositionEvent::Error { pos: None, message });
            return;
        }
    };

    loop {
        if cancel.load(AtomicOrdering::SeqCst) {
            return;
        }
        let next = match queue.lock() {
            Ok(mut queue) => queue.pop_front(),
            Err(_) => {
                let _ = event_sender.send(CropPositionEvent::Error {
                    pos: None,
                    message: "crop queue state is poisoned".to_string(),
                });
                return;
            }
        };
        let Some((pos, bboxes)) = next else {
            return;
        };
        match crop_position_frame_major(
            &request,
            &scan,
            pos,
            bboxes,
            cancel,
            &event_sender,
            CropFrameSource {
                load_frame: &mut |frame_request| source_reader.load_frame(frame_request),
                fd_budget,
                drift: None,
            },
        ) {
            Ok(()) => {}
            Err(CropPositionError::Cancelled) => {
                let _ = event_sender.send(CropPositionEvent::Cancelled { pos });
                return;
            }
            Err(CropPositionError::Failed(message)) => {
                cancel.store(true, AtomicOrdering::SeqCst);
                let _ = event_sender.send(CropPositionEvent::Error {
                    pos: Some(pos),
                    message,
                });
                return;
            }
        }
    }
}

fn crop_position_frame_major<L>(
    request: &CropRoiRequest,
    scan: &WorkspaceScan,
    pos: u32,
    bboxes: Vec<RoiBbox>,
    cancel: &AtomicBool,
    event_sender: &mpsc::Sender<CropPositionEvent>,
    mut source: CropFrameSource<'_, L>,
) -> Result<(), CropPositionError>
where
    L: FnMut(FrameRequest) -> Result<RawFrame, String>,
{
    if cancel.load(AtomicOrdering::SeqCst) {
        return Err(CropPositionError::Cancelled);
    }
    let _ = event_sender.send(CropPositionEvent::Started { pos });
    crop_position_atomic(
        request,
        scan,
        pos,
        &bboxes,
        &|| cancel.load(AtomicOrdering::SeqCst),
        |count| {
            let _ = event_sender.send(CropPositionEvent::PagesWritten { pos, count });
        },
        &mut source,
    )?;
    let _ = event_sender.send(CropPositionEvent::Finished { pos });
    Ok(())
}

fn crop_position_atomic<F, P, L>(
    request: &CropRoiRequest,
    scan: &WorkspaceScan,
    pos: u32,
    bboxes: &[RoiBbox],
    is_cancelled: &F,
    mut on_pages_written: P,
    source: &mut CropFrameSource<'_, L>,
) -> Result<(), CropPositionError>
where
    F: Fn() -> bool,
    P: FnMut(u32),
    L: FnMut(FrameRequest) -> Result<RawFrame, String>,
{
    if is_cancelled() {
        return Err(CropPositionError::Cancelled);
    }
    let loaded = load_align_state(&request.workspace_path, pos)?;
    source.drift = loaded.and_then(|state| state.drift);

    let target_dir = roi_pos_dir_path(&request.workspace_path, pos);
    if target_dir.exists() && !request.overwrite {
        return Err(CropPositionError::Failed(format!(
            "roi/Pos{pos} already exists"
        )));
    }
    let roi_dir = target_dir
        .parent()
        .ok_or_else(|| CropPositionError::Failed("crop output has no parent".to_string()))?;
    fs::create_dir_all(roi_dir).map_err(|error| error.to_string())?;
    let staging_dir = roi_dir.join(format!(".Pos{pos}.crop-{}", Uuid::new_v4()));
    fs::create_dir(&staging_dir).map_err(|error| error.to_string())?;
    let mut staging = StagingDirectory::new(staging_dir.clone());

    write_roi_tiffs_frame_major(
        scan,
        pos,
        bboxes,
        &staging_dir,
        is_cancelled,
        &mut on_pages_written,
        source,
    )?;

    write_roi_index(pos, roi_index_entries(bboxes), scan, &staging_dir)?;
    if is_cancelled() {
        return Err(CropPositionError::Cancelled);
    }
    publish_staged_directory(&staging_dir, &target_dir, request.overwrite)?;
    staging.disarm();
    Ok(())
}

fn write_roi_tiffs_frame_major<F, P, L>(
    scan: &WorkspaceScan,
    pos: u32,
    bboxes: &[RoiBbox],
    output_dir: &Path,
    is_cancelled: &F,
    on_pages_written: &mut P,
    source: &mut CropFrameSource<'_, L>,
) -> Result<(), CropPositionError>
where
    F: Fn() -> bool,
    P: FnMut(u32),
    L: FnMut(FrameRequest) -> Result<RawFrame, String>,
{
    if is_cancelled() {
        return Err(CropPositionError::Cancelled);
    }
    if bboxes.is_empty() {
        return Ok(());
    }

    let fd_budget = source.fd_budget;
    let max_open = fd_budget.saturating_sub(1).max(1);
    if (bboxes.len() as u64) > max_open {
        return Err(CropPositionError::Failed(format!(
            "Pos{pos} has {} ROIs; keeping one TIFF writer open per ROI needs {} file descriptors (source reader + writers), but the FD budget is {fd_budget} (RLIMIT_NOFILE minus {FD_HEADROOM} headroom). Raise the process file-descriptor limit; this crop does not re-read the source or append after closing writers.",
            bboxes.len(),
            bboxes.len() as u64 + 1,
        )));
    }
    if let Some(drift) = source.drift.as_ref() {
        log_crop_drift(pos, scan, drift);
    }

    let mut writers = bboxes
        .iter()
        .map(|bbox| RoiTiffWriter::create(output_dir, bbox))
        .collect::<Result<Vec<_>, _>>()?;

    for time in scan.times.iter().copied() {
        let (dx, dy) = crop_shift(source.drift.as_ref(), time);
        for channel in scan.channels.iter().copied() {
            for z in scan.z_slices.iter().copied() {
                if is_cancelled() {
                    return Err(CropPositionError::Cancelled);
                }
                let raw = (source.load_frame)(FrameRequest {
                    pos,
                    channel,
                    time,
                    z,
                })
                .map_err(|error| {
                    format!("Pos{pos} channel={channel} time={time} z={z}: {error}")
                })?;
                for writer in &mut writers {
                    let pixels = if dx == 0 && dy == 0 {
                        crop_frame(&raw, &writer.bbox)?
                    } else {
                        let x = i64::from(writer.bbox.x) + i64::from(dx);
                        let y = i64::from(writer.bbox.y) + i64::from(dy);
                        crop_frame_padded(&raw, x, y, writer.bbox.w, writer.bbox.h)
                    };
                    write_roi_tiff_page(&mut writer.encoder, &writer.bbox, &pixels)?;
                }
                on_pages_written(writers.len() as u32);
            }
        }
    }
    drop(writers);
    Ok(())
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

/// Zero-fills a `w`×`h` page and copies the overlap of a signed window.
///
/// Page size stays the stored rectangle. The ≤1 px rounding bound holds only
/// when `w` and `h` are the full rounded pattern size; a clipped row, including
/// `x = 0, w = 1`, stays that size after the shift.
fn crop_frame_padded(raw: &RawFrame, x: i64, y: i64, w: u32, h: u32) -> Vec<u16> {
    let page_w = w as usize;
    let page_h = h as usize;
    let mut pixels = vec![0u16; page_w.saturating_mul(page_h)];
    if page_w == 0 || page_h == 0 {
        return pixels;
    }
    let frame_w = i64::from(raw.width);
    let frame_h = i64::from(raw.height);
    let x0 = x.max(0);
    let y0 = y.max(0);
    let x1 = (x + i64::from(w)).min(frame_w);
    let y1 = (y + i64::from(h)).min(frame_h);
    if x0 >= x1 || y0 >= y1 {
        return pixels;
    }
    let row_w = (x1 - x0) as usize;
    let frame_width = raw.width as usize;
    let dst_x = (x0 - x) as usize;
    for src_y in y0..y1 {
        let dst_y = (src_y - y) as usize;
        let src_start = src_y as usize * frame_width + x0 as usize;
        let dst_start = dst_y * page_w + dst_x;
        pixels[dst_start..dst_start + row_w]
            .copy_from_slice(&raw.data[src_start..src_start + row_w]);
    }
    pixels
}

/// JavaScript `Math.round`: half toward +∞. `f64::round` is half away from 0.
fn js_round(value: f64) -> i32 {
    if !value.is_finite() {
        return 0;
    }
    let truncated = value.trunc();
    let fraction = value - truncated;
    let rounded = if fraction >= 0.5 {
        truncated + 1.0
    } else if fraction < -0.5 {
        truncated - 1.0
    } else {
        truncated
    };
    rounded as i32
}

fn interpolate_align_drift(drift: &AlignDrift, time: f64) -> (f64, f64) {
    if drift.keyframes.is_empty() {
        return (0.0, 0.0);
    }
    let mut samples: Vec<(u32, f64, f64)> = drift
        .keyframes
        .iter()
        .map(|keyframe| (keyframe.time, keyframe.dx, keyframe.dy))
        .collect();
    if samples
        .iter()
        .all(|sample| sample.0 != drift.reference_time)
    {
        samples.push((drift.reference_time, 0.0, 0.0));
    }
    samples.sort_by_key(|sample| sample.0);
    let first = samples[0];
    let last = samples[samples.len() - 1];
    if time <= f64::from(first.0) {
        return (first.1, first.2);
    }
    if time >= f64::from(last.0) {
        return (last.1, last.2);
    }
    for pair in samples.windows(2) {
        let left = pair[0];
        let right = pair[1];
        if time > f64::from(right.0) {
            continue;
        }
        let span = f64::from(right.0) - f64::from(left.0);
        let u = if span == 0.0 {
            0.0
        } else {
            (time - f64::from(left.0)) / span
        };
        return (
            left.1 + (right.1 - left.1) * u,
            left.2 + (right.2 - left.2) * u,
        );
    }
    (last.1, last.2)
}

fn crop_shift(drift: Option<&AlignDrift>, time: u32) -> (i32, i32) {
    let Some(drift) = drift else {
        return (0, 0);
    };
    // grid.tx/ty cancel; the window moves by the drift delta from referenceTime.
    let (dx_t, dy_t) = interpolate_align_drift(drift, f64::from(time));
    let (dx_ref, dy_ref) = interpolate_align_drift(drift, f64::from(drift.reference_time));
    (js_round(dx_t - dx_ref), js_round(dy_t - dy_ref))
}

fn log_crop_drift(pos: u32, scan: &WorkspaceScan, drift: &AlignDrift) {
    let mut max_abs_dx = 0u32;
    let mut max_abs_dy = 0u32;
    for time in &scan.times {
        let (dx, dy) = crop_shift(Some(drift), *time);
        max_abs_dx = max_abs_dx.max(dx.unsigned_abs());
        max_abs_dy = max_abs_dy.max(dy.unsigned_abs());
    }
    tracing::info!(
        pos,
        reference_time = drift.reference_time,
        keyframes = drift.keyframes.len(),
        max_abs_dx,
        max_abs_dy,
        "applying align drift to crop"
    );
    if drift
        .keyframes
        .iter()
        .any(|keyframe| !scan.times.contains(&keyframe.time))
    {
        tracing::warn!(pos, "align drift keyframe time is not in scan.times");
    }
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

fn crop_fd_budget(soft_limit: Option<u64>) -> u64 {
    crop_fd_budget_from(soft_limit.or_else(|| {
        raise_nofile_soft_limit();
        rlimit_nofile_soft()
    }))
}

/// Largest soft `RLIMIT_NOFILE` macOS accepts when the hard limit is unlimited.
#[cfg(target_os = "macos")]
const NOFILE_SOFT_CEILING: libc::rlim_t = 10_240; // OPEN_MAX in <sys/syslimits.h>
#[cfg(all(unix, not(target_os = "macos")))]
const NOFILE_SOFT_CEILING: libc::rlim_t = 1 << 20;

/// GUI launches (launchd on macOS) start with a 256 soft limit, too low for one writer per ROI.
/// Raise the soft limit toward the hard limit once per process; failures keep the current limit.
fn raise_nofile_soft_limit() {
    #[cfg(unix)]
    {
        static RAISE: std::sync::Once = std::sync::Once::new();
        RAISE.call_once(|| {
            let mut lim = libc::rlimit {
                rlim_cur: 0,
                rlim_max: 0,
            };
            // SAFETY: `lim` is a valid `rlimit` out-parameter; `getrlimit` only writes it.
            if unsafe { libc::getrlimit(libc::RLIMIT_NOFILE, &mut lim) } != 0 {
                return;
            }
            let target = lim.rlim_max.min(NOFILE_SOFT_CEILING);
            if lim.rlim_cur >= target {
                return;
            }
            lim.rlim_cur = target;
            // SAFETY: `lim` is a valid `rlimit`; only the soft limit changes, within the hard limit.
            unsafe { libc::setrlimit(libc::RLIMIT_NOFILE, &lim) };
        });
    }
}

fn crop_fd_budget_from(soft_limit: Option<u64>) -> u64 {
    let Some(soft_limit) = soft_limit else {
        return UNBOUNDED_FD_BUDGET;
    };
    if soft_limit == 0 || soft_limit > 1_000_000_000 {
        return UNBOUNDED_FD_BUDGET;
    }
    MIN_FD_BUDGET.max(soft_limit.saturating_sub(FD_HEADROOM))
}

fn rlimit_nofile_soft() -> Option<u64> {
    #[cfg(unix)]
    {
        let mut lim = libc::rlimit {
            rlim_cur: 0,
            rlim_max: 0,
        };
        // SAFETY: `lim` is a valid `rlimit` out-parameter; `getrlimit` only writes it.
        let rc = unsafe { libc::getrlimit(libc::RLIMIT_NOFILE, &mut lim) };
        if rc == 0 {
            Some(lim.rlim_cur)
        } else {
            None
        }
    }
    #[cfg(not(unix))]
    {
        None
    }
}

fn parse_positive_usize(raw: &str) -> Option<usize> {
    raw.trim().parse::<usize>().ok().filter(|value| *value > 0)
}

fn env_requested_crop_workers() -> usize {
    std::env::var(CROP_WORKERS_ENV)
        .ok()
        .as_deref()
        .and_then(parse_positive_usize)
        .unwrap_or(1)
}

fn crop_position_worker_count(
    position_count: usize,
    max_roi_count: usize,
    fd_budget: u64,
) -> usize {
    crop_position_worker_count_for(
        position_count,
        max_roi_count,
        fd_budget,
        env_requested_crop_workers(),
    )
}

fn crop_position_worker_count_for(
    position_count: usize,
    max_roi_count: usize,
    fd_budget: u64,
    requested: usize,
) -> usize {
    let position_count = position_count.max(1);
    let requested = requested.max(1).min(position_count);
    let per_worker = max_roi_count.saturating_add(1);
    let fd_capped = (fd_budget as usize) / per_worker;
    requested.min(fd_capped.max(1))
}

fn is_too_many_open_files(error: &std::io::Error) -> bool {
    matches!(error.raw_os_error(), Some(24) | Some(4))
}

fn roi_index_entries(bboxes: &[RoiBbox]) -> Vec<RoiIndexEntry> {
    bboxes
        .iter()
        .cloned()
        .map(|bbox| RoiIndexEntry {
            roi: bbox.roi,
            file_name: format!("Roi{}.tif", bbox.roi),
            bbox,
        })
        .collect()
}

fn write_roi_index(
    pos: u32,
    entries: Vec<RoiIndexEntry>,
    scan: &WorkspaceScan,
    output_dir: &Path,
) -> Result<(), String> {
    use crate::protocol::RoiIndexFileAxisOrder;

    let time_indices = if scan.times.is_empty() {
        vec![0]
    } else {
        scan.times.clone()
    };
    let index = RoiIndexFile {
        position: pos,
        axis_order: RoiIndexFileAxisOrder::Tczyx,
        time_count: scan.times.len().max(1) as u32,
        channel_count: scan.channels.len().max(1) as u32,
        z_count: scan.z_slices.len().max(1) as u32,
        time_indices,
        rois: entries,
    };
    let bytes = serde_json::to_vec_pretty(&index).map_err(|error| error.to_string())?;
    fs::write(output_dir.join(lisca_workspace::INDEX_JSON), bytes)
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::protocol::{
        AlignDriftInterpolation, AlignerSource, ContrastWindow, CropOutputFormat, DriftKeyframe,
    };
    use crate::tiff_io;
    use image::{GrayImage, Luma};
    use std::sync::atomic::{AtomicUsize, Ordering};
    use tempfile::TempDir;

    static CROP_WORKERS_ENV_LOCK: Mutex<()> = Mutex::new(());

    fn fixture(position_count: u32) -> (TempDir, CropRoiRequest, WorkspaceScan) {
        let root = tempfile::tempdir().expect("temp workspace");
        let workspace = root.path().join("workspace");
        let source = root.path().join("source");
        fs::create_dir_all(workspace.join("bbox")).expect("bbox dir");
        for pos in 1..=position_count {
            let source_pos = source.join(format!("Pos{pos}"));
            fs::create_dir_all(&source_pos).expect("source position");
            GrayImage::from_pixel(4, 4, Luma([pos as u8]))
                .save(source_pos.join("img_0_0_0.png"))
                .expect("source frame");
            fs::write(
                workspace.join("bbox").join(format!("Pos{pos}.csv")),
                "roi,x,y,w,h\n1,0,0,2,2\n",
            )
            .expect("bbox");
        }
        let request = CropRoiRequest {
            output_format: Some(CropOutputFormat::Tiff),
            overwrite: true,
            positions: (1..=position_count).collect(),
            request_id: "crop-test".to_string(),
            source: AlignerSource::Folder {
                path: source.to_string_lossy().into_owned(),
                subfolder_template: "Pos{p}".to_string(),
                filename_template: "img_{t}_{c}_{z}".to_string(),
            },
            workspace_path: workspace.to_string_lossy().into_owned(),
        };
        let scan = scan_source(request.source.clone()).expect("scan fixture");
        (root, request, scan)
    }

    fn staging_entries(request: &CropRoiRequest) -> Vec<PathBuf> {
        let roi = Path::new(&request.workspace_path).join("roi");
        fs::read_dir(roi)
            .map(|entries| {
                entries
                    .filter_map(Result::ok)
                    .map(|entry| entry.path())
                    .filter(|path| {
                        path.file_name()
                            .and_then(|name| name.to_str())
                            .is_some_and(|name| name.starts_with('.'))
                    })
                    .collect()
            })
            .unwrap_or_default()
    }

    fn progress() -> CropRoiProgress {
        CropRoiProgress {
            request_id: "crop".to_string(),
            status: CropRoiStatus::Running,
            position: None,
            completed_positions: 0,
            total_positions: 2,
            completed_rois: 0,
            total_rois: 96,
            message: None,
            error: None,
            skipped_positions: Vec::new(),
        }
    }

    fn scan_axes(times: Vec<u32>, channels: Vec<u32>, z_slices: Vec<u32>) -> WorkspaceScan {
        WorkspaceScan {
            channel_labels: Vec::new(),
            channels,
            position_labels: Vec::new(),
            positions: vec![0],
            time_labels: Vec::new(),
            times,
            z_slice_labels: Vec::new(),
            z_slices,
        }
    }

    fn write_and_check_roi_tiffs(
        output_dir: &Path,
        n_roi: u32,
        fd_budget: u64,
    ) -> Result<Vec<(u32, u32, u32, u32)>, CropPositionError> {
        let bboxes: Vec<RoiBbox> = (0..n_roi)
            .map(|i| RoiBbox {
                roi: i,
                x: i,
                y: 0,
                w: 1,
                h: 1,
            })
            .collect();
        let mut reads = Vec::new();
        let scan = scan_axes(vec![0, 1], vec![0], vec![0]);
        write_roi_tiffs_frame_major(
            &scan,
            0,
            &bboxes,
            output_dir,
            &|| false,
            &mut |_| {},
            &mut CropFrameSource {
                load_frame: &mut |request: FrameRequest| {
                    reads.push((request.pos, request.time, request.channel, request.z));
                    let data = (0..n_roi)
                        .map(|i| i as u16 + 100 * request.time as u16)
                        .collect();
                    Ok(RawFrame {
                        width: n_roi,
                        height: 1,
                        data,
                        contrast_domain: ContrastWindow {
                            min: 0,
                            max: u16::MAX as u32,
                        },
                    })
                },
                fd_budget,
                drift: None,
            },
        )?;
        for i in 0..n_roi {
            let path = output_dir.join(format!("Roi{i}.tif"));
            let page0 = tiff_io::load_tiff_frame_page(&path, 0).expect("page 0");
            let page1 = tiff_io::load_tiff_frame_page(&path, 1).expect("page 1");
            assert_eq!(page0.data, vec![i as u16]);
            assert_eq!(page1.data, vec![i as u16 + 100]);
        }
        Ok(reads)
    }

    struct EnvVarGuard {
        key: &'static str,
        previous: Option<String>,
    }

    impl EnvVarGuard {
        fn unset(key: &'static str) -> Self {
            let previous = std::env::var(key).ok();
            std::env::remove_var(key);
            Self { key, previous }
        }

        fn set(key: &'static str, value: &str) -> Self {
            let previous = std::env::var(key).ok();
            std::env::set_var(key, value);
            Self { key, previous }
        }
    }

    impl Drop for EnvVarGuard {
        fn drop(&mut self) {
            match &self.previous {
                Some(value) => std::env::set_var(self.key, value),
                None => std::env::remove_var(self.key),
            }
        }
    }

    #[test]
    fn crop_fd_budget_leaves_headroom() {
        assert_eq!(crop_fd_budget(Some(1024)), 768);
        assert_eq!(crop_fd_budget(Some(200)), 64);
        assert_eq!(crop_fd_budget(Some(400)), 144);
        assert_eq!(crop_fd_budget(Some(0)), UNBOUNDED_FD_BUDGET);
        assert_eq!(crop_fd_budget_from(None), UNBOUNDED_FD_BUDGET);
    }

    #[test]
    #[cfg(unix)]
    fn raise_nofile_soft_limit_never_lowers_limit() {
        let before = rlimit_nofile_soft().unwrap();
        raise_nofile_soft_limit();
        let after = rlimit_nofile_soft().unwrap();
        assert!(after >= before);
        assert!(after >= before.min(NOFILE_SOFT_CEILING));
    }

    #[test]
    fn crop_fd_budget_reads_rlimit() {
        let expected = crop_fd_budget_from(rlimit_nofile_soft());
        assert_eq!(crop_fd_budget(None), expected);
        #[cfg(unix)]
        assert!(rlimit_nofile_soft().is_some());
    }

    #[test]
    fn crop_position_worker_count_defaults_to_one() {
        let _lock = CROP_WORKERS_ENV_LOCK.lock().expect("env lock");
        let _guard = EnvVarGuard::unset(CROP_WORKERS_ENV);
        assert_eq!(crop_position_worker_count(3, 0, 10_000), 1);
        assert_eq!(crop_position_worker_count(20, 0, 10_000), 1);
        assert_eq!(crop_position_worker_count_for(20, 0, 10_000, 1), 1);

        let _override = EnvVarGuard::set(CROP_WORKERS_ENV, "6");
        assert_eq!(crop_position_worker_count(20, 0, 10_000), 6);
        assert_eq!(crop_position_worker_count(3, 0, 10_000), 3);

        drop(_override);
        let _invalid = EnvVarGuard::set(CROP_WORKERS_ENV, "nope");
        assert_eq!(crop_position_worker_count(20, 0, 10_000), 1);
        assert_eq!(parse_positive_usize("nope"), None);
        assert_eq!(parse_positive_usize("6"), Some(6));
    }

    #[test]
    fn crop_position_worker_count_shrinks_when_roi_grid_exceeds_fd_budget() {
        assert_eq!(crop_position_worker_count_for(20, 80, 300, 8), 3);
        assert_eq!(crop_position_worker_count_for(20, 80, 100, 8), 1);
        assert_eq!(crop_position_worker_count_for(5, 10_000, 64, 8), 1);
    }

    #[test]
    fn frame_major_write_reads_each_plane_once_for_all_rois() {
        let output = tempfile::tempdir().expect("temp output");
        let reads = write_and_check_roi_tiffs(output.path(), 40, 10_000).expect("write");
        assert_eq!(reads, vec![(0, 0, 0, 0), (0, 1, 0, 0)]);
        assert_eq!(
            reads.len(),
            2,
            "one source pass: T×C×Z planes, not multiplied by ROI-writer chunks"
        );
    }

    #[test]
    fn write_fails_when_single_position_exceeds_fd_budget_without_rereading() {
        let output = tempfile::tempdir().expect("temp output");
        let bboxes: Vec<RoiBbox> = (0..5)
            .map(|i| RoiBbox {
                roi: i,
                x: i,
                y: 0,
                w: 1,
                h: 1,
            })
            .collect();
        let mut reads = Vec::new();
        let scan = scan_axes(vec![0, 1], vec![0], vec![0]);
        let error = write_roi_tiffs_frame_major(
            &scan,
            0,
            &bboxes,
            output.path(),
            &|| false,
            &mut |_| {},
            &mut CropFrameSource {
                load_frame: &mut |request: FrameRequest| {
                    reads.push((request.pos, request.time, request.channel, request.z));
                    Ok(RawFrame {
                        width: 5,
                        height: 1,
                        data: vec![0; 5],
                        contrast_domain: ContrastWindow {
                            min: 0,
                            max: u16::MAX as u32,
                        },
                    })
                },
                fd_budget: 3,
                drift: None,
            },
        )
        .expect_err("too many ROIs for FD budget");
        assert!(
            matches!(error, CropPositionError::Failed(message) if message.contains("does not re-read"))
        );
        assert!(reads.is_empty());
    }

    #[test]
    fn page_batches_advance_progress_and_saturate_at_total() {
        let mut progress = progress();
        record_pages_written(&mut progress, 32);
        assert_eq!(progress.completed_rois, 32);
        record_pages_written(&mut progress, 32);
        assert_eq!(progress.completed_rois, 64);
        record_pages_written(&mut progress, u32::MAX);
        assert_eq!(progress.completed_rois, 96);
    }

    #[test]
    fn active_position_message_does_not_misidentify_parallel_work() {
        let mut progress = progress();
        let mut active = BTreeSet::from([82]);
        set_active_position_progress(&mut progress, &active);
        assert_eq!(progress.position, Some(82));
        assert_eq!(progress.message.as_deref(), Some("Cropping Pos82"));

        active.insert(69);
        set_active_position_progress(&mut progress, &active);
        assert_eq!(progress.position, None);
        assert_eq!(progress.message.as_deref(), Some("Cropping 2 positions"));
    }

    #[test]
    fn final_checkpoint_cancellation_preserves_previous_output_and_cleans_staging() {
        let (_root, request, scan) = fixture(1);
        let published = roi_pos_dir_path(&request.workspace_path, 1);
        fs::create_dir_all(&published).expect("previous output");
        fs::write(published.join("sentinel"), "previous").expect("sentinel");
        let checkpoints = AtomicUsize::new(0);

        let result = crop_roi_position(&request, &scan, 1, || {
            checkpoints.fetch_add(1, Ordering::SeqCst) >= 4
        });

        assert_eq!(result, Err(CropPositionError::Cancelled));
        assert_eq!(
            fs::read_to_string(published.join("sentinel")).expect("previous output retained"),
            "previous"
        );
        assert!(staging_entries(&request).is_empty());
    }

    #[test]
    fn crop_writes_source_time_indices_into_index_json() {
        let (_root, request, scan) = fixture(1);
        crop_roi_position(&request, &scan, 1, || false).expect("crop");
        let index: serde_json::Value = serde_json::from_slice(
            &fs::read(roi_pos_dir_path(&request.workspace_path, 1).join("index.json"))
                .expect("index"),
        )
        .expect("json");
        let time_indices = index
            .get("timeIndices")
            .and_then(|value| value.as_array())
            .expect("timeIndices present");
        assert_eq!(
            time_indices
                .iter()
                .map(|value| value.as_u64().expect("u64"))
                .collect::<Vec<_>>(),
            scan.times.iter().map(|&t| t as u64).collect::<Vec<_>>()
        );
        assert_eq!(
            index.get("timeCount").and_then(|value| value.as_u64()),
            Some(scan.times.len().max(1) as u64)
        );
    }

    #[test]
    fn retry_publishes_only_failed_position_and_keeps_successful_sibling() {
        let (_root, request, scan) = fixture(2);
        crop_roi_position(&request, &scan, 1, || false).expect("first sibling");
        let sibling_index =
            fs::read(roi_pos_dir_path(&request.workspace_path, 1).join("index.json"))
                .expect("sibling index");
        fs::write(
            bbox_csv_path(&request.workspace_path, 2),
            "roi,x,y,w,h\n1,3,3,4,4\n",
        )
        .expect("invalid bbox");

        let failed = crop_roi_position(&request, &scan, 2, || false);
        assert!(matches!(failed, Err(CropPositionError::Failed(_))));
        assert!(!roi_pos_dir_path(&request.workspace_path, 2).exists());
        assert_eq!(
            fs::read(roi_pos_dir_path(&request.workspace_path, 1).join("index.json"))
                .expect("sibling remains"),
            sibling_index
        );
        assert!(staging_entries(&request).is_empty());

        fs::write(
            bbox_csv_path(&request.workspace_path, 2),
            "roi,x,y,w,h\n1,0,0,2,2\n",
        )
        .expect("fixed bbox");
        crop_roi_position(&request, &scan, 2, || false).expect("position retry");
        assert!(roi_pos_dir_path(&request.workspace_path, 2)
            .join("index.json")
            .is_file());
        assert_eq!(
            fs::read(roi_pos_dir_path(&request.workspace_path, 1).join("index.json"))
                .expect("sibling still remains"),
            sibling_index
        );
    }

    #[test]
    fn crop_migrates_crop_header_then_writes_roi_stacks() {
        let (_root, request, scan) = fixture(1);
        fs::write(
            bbox_csv_path(&request.workspace_path, 1),
            "crop,x,y,w,h\n1,0,0,2,2\n",
        )
        .expect("crop header");

        crop_roi_position(&request, &scan, 1, || false).expect("crop");

        let csv = fs::read_to_string(bbox_csv_path(&request.workspace_path, 1)).expect("read");
        assert!(csv.starts_with("roi,x,y,w,h"), "{csv}");
        assert!(!csv.contains("crop"));
        assert!(roi_pos_dir_path(&request.workspace_path, 1)
            .join("Roi1.tif")
            .is_file());
    }

    fn frame_pixel(time: u32, x: u32, y: u32, width: u32) -> u16 {
        u16::try_from(1 + time + y * width + x).expect("pixel")
    }

    fn series_request(
        times: &[u32],
        width: u32,
        height: u32,
        csv: &str,
    ) -> (TempDir, CropRoiRequest, WorkspaceScan) {
        let root = tempfile::tempdir().expect("temp workspace");
        let workspace = root.path().join("workspace");
        let source = root.path().join("source");
        fs::create_dir_all(workspace.join("bbox")).expect("bbox dir");
        let source_pos = source.join("Pos1");
        fs::create_dir_all(&source_pos).expect("source position");
        for time in times {
            let mut image = GrayImage::new(width, height);
            for y in 0..height {
                for x in 0..width {
                    let value = frame_pixel(*time, x, y, width);
                    image.put_pixel(x, y, Luma([u8::try_from(value).expect("u8")]));
                }
            }
            image
                .save(source_pos.join(format!("img_{time}_0_0.png")))
                .expect("source frame");
        }
        fs::write(workspace.join("bbox").join("Pos1.csv"), csv).expect("bbox");
        let request = CropRoiRequest {
            output_format: Some(CropOutputFormat::Tiff),
            overwrite: true,
            positions: vec![1],
            request_id: "crop-drift".to_string(),
            source: AlignerSource::Folder {
                path: source.to_string_lossy().into_owned(),
                subfolder_template: "Pos{p}".to_string(),
                filename_template: "img_{t}_{c}_{z}".to_string(),
            },
            workspace_path: workspace.to_string_lossy().into_owned(),
        };
        let scan = scan_source(request.source.clone()).expect("scan fixture");
        (root, request, scan)
    }

    fn write_align(workspace: &str, drift: Option<serde_json::Value>) {
        let align_dir = Path::new(workspace).join("align");
        fs::create_dir_all(&align_dir).expect("align dir");
        let mut state = serde_json::json!({
            "excludedPatterns": [],
            "grid": {
                "enabled": true,
                "opacity": 0.5,
                "patternHeight": 20.0,
                "patternWidth": 12.0,
                "rotation": 0.0,
                "shape": "rect",
                "spacingA": 10.0,
                "spacingB": 10.0,
                "tx": 3.0,
                "ty": -4.0
            }
        });
        if let Some(drift) = drift {
            state["drift"] = drift;
        }
        fs::write(
            align_dir.join("Pos1.json"),
            serde_json::to_vec_pretty(&state).expect("align json"),
        )
        .expect("write align");
    }

    fn drift_with(reference_time: u32, keyframes: &[(u32, f64, f64)]) -> AlignDrift {
        AlignDrift {
            interpolation: AlignDriftInterpolation::Linear,
            keyframes: keyframes
                .iter()
                .map(|(time, dx, dy)| DriftKeyframe {
                    time: *time,
                    dx: *dx,
                    dy: *dy,
                })
                .collect(),
            reference_time,
        }
    }

    #[test]
    fn crop_shift_rounds_like_javascript() {
        assert_eq!(js_round(0.5), 1);
        assert_eq!(js_round(-0.5), 0);
        assert_eq!(js_round(1.5), 2);
        assert_eq!(js_round(-1.5), -1);
        assert_eq!(crop_shift(None, 5), (0, 0));

        let empty = drift_with(875, &[]);
        assert_eq!(crop_shift(Some(&empty), 10), (0, 0));

        let halfway = drift_with(0, &[(10, 1.0, -1.0)]);
        assert_eq!(crop_shift(Some(&halfway), 0), (0, 0));
        assert_eq!(crop_shift(Some(&halfway), 5), (1, 0));
        assert_eq!(crop_shift(Some(&halfway), 10), (1, -1));

        let explicit = drift_with(0, &[(5, -0.5, 0.5)]);
        assert_eq!(crop_shift(Some(&explicit), 5), (0, 1));

        let pinned = drift_with(0, &[(0, 2.0, -4.0), (10, 2.5, -4.5)]);
        assert_eq!(crop_shift(Some(&pinned), 0), (0, 0));
        assert_eq!(crop_shift(Some(&pinned), 10), (1, 0));
    }

    #[test]
    fn crop_without_drift_matches_unshifted_window() {
        let width = 8u32;
        let (_root, request, scan) = series_request(&[0], width, 4, "roi,x,y,w,h\n1,1,1,3,2\n");
        assert_eq!(scan.times, vec![0]);
        crop_roi_position(&request, &scan, 1, || false).expect("crop without align file");
        let roi_dir = roi_pos_dir_path(&request.workspace_path, 1);
        let tiff = fs::read(roi_dir.join("Roi1.tif")).expect("tiff");
        let index = fs::read(roi_dir.join("index.json")).expect("index");
        let page = tiff_io::load_tiff_frame_page(&roi_dir.join("Roi1.tif"), 0).expect("page");
        assert_eq!((page.width, page.height), (3, 2));
        assert_eq!(
            page.data,
            vec![
                frame_pixel(0, 1, 1, width),
                frame_pixel(0, 2, 1, width),
                frame_pixel(0, 3, 1, width),
                frame_pixel(0, 1, 2, width),
                frame_pixel(0, 2, 2, width),
                frame_pixel(0, 3, 2, width),
            ]
        );

        write_align(&request.workspace_path, None);
        crop_roi_position(&request, &scan, 1, || false).expect("crop without drift");
        assert_eq!(fs::read(roi_dir.join("Roi1.tif")).expect("tiff"), tiff);
        assert_eq!(fs::read(roi_dir.join("index.json")).expect("index"), index);
    }

    #[test]
    fn crop_shifts_signed_window_and_keeps_reference_page_size() {
        let width = 8u32;
        let times = [0u32, 5, 10, 15];
        let (_root, request, scan) =
            series_request(&times, width, 2, "roi,x,y,w,h\n0,0,0,1,1\n1,7,0,1,1\n");
        assert_eq!(scan.times, times);
        write_align(
            &request.workspace_path,
            Some(serde_json::json!({
                "referenceTime": 0,
                "interpolation": "linear",
                "keyframes": [
                    {"time": 5, "dx": -1.0, "dy": 0.0},
                    {"time": 10, "dx": 1.0, "dy": 0.0},
                    {"time": 15, "dx": -0.5, "dy": 0.5}
                ]
            })),
        );

        crop_roi_position(&request, &scan, 1, || false).expect("crop with drift");
        let roi_dir = roi_pos_dir_path(&request.workspace_path, 1);
        let index: serde_json::Value =
            serde_json::from_slice(&fs::read(roi_dir.join("index.json")).expect("index"))
                .expect("json");
        assert_eq!(index["rois"][0]["bbox"]["x"], 0);
        assert_eq!(index["rois"][0]["bbox"]["y"], 0);
        assert_eq!(index["rois"][0]["bbox"]["w"], 1);
        assert_eq!(index["rois"][0]["bbox"]["h"], 1);
        assert_eq!(index["rois"][1]["bbox"]["x"], 7);
        assert_eq!(index["rois"][1]["bbox"]["w"], 1);
        assert_eq!(index["rois"][1]["bbox"]["h"], 1);

        let left = |page: usize| {
            tiff_io::load_tiff_frame_page(&roi_dir.join("Roi0.tif"), page).expect("left page")
        };
        let right = |page: usize| {
            tiff_io::load_tiff_frame_page(&roi_dir.join("Roi1.tif"), page).expect("right page")
        };
        for page in 0..4 {
            let left_page = left(page);
            let right_page = right(page);
            assert_eq!((left_page.width, left_page.height), (1, 1));
            assert_eq!((right_page.width, right_page.height), (1, 1));
        }
        assert_eq!(left(0).data, vec![frame_pixel(0, 0, 0, width)]);
        assert_eq!(right(0).data, vec![frame_pixel(0, 7, 0, width)]);
        assert_eq!(left(1).data, vec![0]);
        assert_eq!(right(1).data, vec![frame_pixel(5, 6, 0, width)]);
        assert_eq!(left(2).data, vec![frame_pixel(10, 1, 0, width)]);
        assert_eq!(right(2).data, vec![0]);
        assert_eq!(left(3).data, vec![frame_pixel(15, 0, 1, width)]);
        assert_eq!(right(3).data, vec![frame_pixel(15, 7, 1, width)]);
    }
}

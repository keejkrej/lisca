use std::{
    collections::VecDeque,
    fs,
    fs::File,
    path::Path,
    sync::{
        atomic::{AtomicBool, Ordering as AtomicOrdering},
        mpsc, Arc, Mutex,
    },
};

use tiff::encoder::{colortype, TiffEncoder};

use crate::{
    image_source::{scan_source, CachedSourceReader, RawFrame},
    protocol::{
        CropRoiProgress, CropRoiRequest, CropRoiStatus, FrameRequest, RoiBbox, RoiIndexEntry,
        RoiIndexFile, WorkspaceScan,
    },
};

use super::workspace::{
    bbox_csv_path, list_saved_bbox_positions, parse_bbox_csv, roi_index_path, roi_pos_dir_path,
    roi_tiff_path,
};

const CROP_ROI_CHUNK_SIZE: usize = 32;

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
        let path = roi_tiff_path(&request.workspace_path, pos, bbox.roi);
        let file = File::create(&path).map_err(|error| error.to_string())?;
        let encoder = TiffEncoder::new(file).map_err(|error| error.to_string())?;
        Ok(Self {
            bbox: bbox.clone(),
            encoder,
        })
    }
}

type CropJobQueue = Arc<Mutex<VecDeque<(u32, Vec<RoiBbox>)>>>;

fn crop_position_worker(
    request: Arc<CropRoiRequest>,
    scan: Arc<WorkspaceScan>,
    queue: CropJobQueue,
    cancel: &AtomicBool,
    event_sender: mpsc::Sender<CropPositionEvent>,
) {
    let mut source_reader = match CachedSourceReader::open(request.source.clone()) {
        Ok(reader) => reader,
        Err(message) => {
            cancel.store(true, AtomicOrdering::SeqCst);
            let _ = event_sender.send(CropPositionEvent::Error { message });
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
            &mut source_reader,
        ) {
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
    source_reader: &mut CachedSourceReader,
) -> Result<(), CropPositionStop> {
    if cancel.load(AtomicOrdering::SeqCst) {
        return Err(CropPositionStop::Cancelled);
    }

    let target_dir = roi_pos_dir_path(&request.workspace_path, pos);
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
        write_roi_tiff_chunk_frame_major(request, scan, pos, chunk, cancel, source_reader)?;
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
    source_reader: &mut CachedSourceReader,
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
                let raw = source_reader
                    .load_frame(FrameRequest {
                        pos,
                        channel,
                        time,
                        z,
                    })
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
    let max_workers = std::env::var("LISCA_CROP_MAX_WORKERS")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(available);
    position_count.min(max_workers).max(1)
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
    fs::write(roi_index_path(&request.workspace_path, pos), bytes)
        .map_err(|error| error.to_string())
}

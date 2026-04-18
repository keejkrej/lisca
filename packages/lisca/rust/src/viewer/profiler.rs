use std::collections::HashMap;
use std::fmt::Write as _;
use std::fs::{self, File};
use std::io::BufWriter;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tiff::encoder::{colortype, TiffEncoder};

use crate::viewer::domain::{
    workspace_bbox_csv_path, workspace_roi_pos_dir_path, workspace_roi_tiff_path, RoiBbox,
    ViewerSource,
};
use crate::viewer::image::{
    build_channel_mapping, collect_tiffs, find_position_dir, load_tiff_frame, SourceReader,
};
use crate::viewer::roi::{crop_u16_frame, parse_bbox_csv, prepare_roi_output_dir, validate_bboxes};

#[derive(Clone, Debug)]
pub struct CropProfileOptions {
    pub workspace_path: String,
    pub source: ViewerSource,
    pub pos: u32,
    pub plane_offset: usize,
    pub batch_planes: usize,
    pub output_root: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CropProfileReport {
    pub workspace_path: String,
    pub source: ViewerSource,
    pub pos: u32,
    pub bbox_count: usize,
    pub available_plane_count: usize,
    pub selected_plane_count: usize,
    pub plane_offset: usize,
    pub batch_planes: usize,
    pub batch_timepoints: usize,
    pub output_dir: String,
    pub output_manifest_path: String,
    pub interpretation: String,
    pub steps: Vec<CropProfileStepSummary>,
    pub total_ms: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CropProfileStepSummary {
    pub step: String,
    pub count: u64,
    pub total_ms: f64,
    pub avg_ms: f64,
    pub percent_total: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProfileManifest {
    workspace_path: String,
    source: ViewerSource,
    pos: u32,
    bbox_count: usize,
    available_plane_count: usize,
    selected_plane_count: usize,
    plane_offset: usize,
    batch_planes: usize,
    batch_timepoints: usize,
    output_root: String,
}

#[derive(Clone, Copy, Debug)]
struct PlaneCoord {
    time: u32,
    channel: u32,
    z: u32,
}

type RoiEncoder = TiffEncoder<BufWriter<File>>;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum StepKind {
    BboxCsv,
    SourceOpen,
    SourceMetadata,
    OutputPrepare,
    WriterOpen,
    ReadFrame,
    CropCopy,
    WriteTiffs,
    IndexWrite,
}

impl StepKind {
    const ALL: [Self; 9] = [
        Self::BboxCsv,
        Self::SourceOpen,
        Self::SourceMetadata,
        Self::OutputPrepare,
        Self::WriterOpen,
        Self::ReadFrame,
        Self::CropCopy,
        Self::WriteTiffs,
        Self::IndexWrite,
    ];

    fn label(self) -> &'static str {
        match self {
            Self::BboxCsv => "bbox_csv",
            Self::SourceOpen => "source_open",
            Self::SourceMetadata => "source_metadata",
            Self::OutputPrepare => "output_prepare",
            Self::WriterOpen => "writer_open",
            Self::ReadFrame => "read_frame",
            Self::CropCopy => "crop_copy",
            Self::WriteTiffs => "write_tiffs",
            Self::IndexWrite => "index_write",
        }
    }
}

#[derive(Clone, Copy, Debug, Default)]
struct StepStat {
    count: u64,
    total: Duration,
}

impl StepStat {
    fn record(&mut self, duration: Duration) {
        self.count += 1;
        self.total += duration;
    }

    fn record_count(&mut self, duration: Duration, count: u64) {
        self.count += count;
        self.total += duration;
    }
}

#[derive(Default)]
struct StepStats {
    bbox_csv: StepStat,
    source_open: StepStat,
    source_metadata: StepStat,
    output_prepare: StepStat,
    writer_open: StepStat,
    read_frame: StepStat,
    crop_copy: StepStat,
    write_tiffs: StepStat,
    index_write: StepStat,
}

impl StepStats {
    fn get_mut(&mut self, step: StepKind) -> &mut StepStat {
        match step {
            StepKind::BboxCsv => &mut self.bbox_csv,
            StepKind::SourceOpen => &mut self.source_open,
            StepKind::SourceMetadata => &mut self.source_metadata,
            StepKind::OutputPrepare => &mut self.output_prepare,
            StepKind::WriterOpen => &mut self.writer_open,
            StepKind::ReadFrame => &mut self.read_frame,
            StepKind::CropCopy => &mut self.crop_copy,
            StepKind::WriteTiffs => &mut self.write_tiffs,
            StepKind::IndexWrite => &mut self.index_write,
        }
    }

    fn get(&self, step: StepKind) -> StepStat {
        match step {
            StepKind::BboxCsv => self.bbox_csv,
            StepKind::SourceOpen => self.source_open,
            StepKind::SourceMetadata => self.source_metadata,
            StepKind::OutputPrepare => self.output_prepare,
            StepKind::WriterOpen => self.writer_open,
            StepKind::ReadFrame => self.read_frame,
            StepKind::CropCopy => self.crop_copy,
            StepKind::WriteTiffs => self.write_tiffs,
            StepKind::IndexWrite => self.index_write,
        }
    }

    fn record(&mut self, step: StepKind, duration: Duration) {
        self.get_mut(step).record(duration);
    }

    fn record_count(&mut self, step: StepKind, duration: Duration, count: u64) {
        self.get_mut(step).record_count(duration, count);
    }

    fn to_summaries(&self, total: Duration) -> Vec<CropProfileStepSummary> {
        let total_secs = total.as_secs_f64();
        StepKind::ALL
            .into_iter()
            .map(|step| {
                let stat = self.get(step);
                let total_ms = stat.total.as_secs_f64() * 1000.0;
                let avg_ms = if stat.count == 0 {
                    0.0
                } else {
                    total_ms / stat.count as f64
                };
                let percent_total = if total_secs <= 0.0 {
                    0.0
                } else {
                    (stat.total.as_secs_f64() / total_secs) * 100.0
                };

                CropProfileStepSummary {
                    step: step.label().to_string(),
                    count: stat.count,
                    total_ms,
                    avg_ms,
                    percent_total,
                }
            })
            .collect()
    }
}

pub fn infer_viewer_source(source_path: &str) -> Result<ViewerSource, String> {
    let path = Path::new(source_path);
    if path.is_dir() {
        return Ok(ViewerSource::Tif {
            path: path.to_string_lossy().to_string(),
        });
    }

    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .ok_or_else(|| format!("Unable to infer source type from {}", path.display()))?;

    match extension.as_str() {
        "nd2" => Ok(ViewerSource::Nd2 {
            path: path.to_string_lossy().to_string(),
        }),
        "czi" => Ok(ViewerSource::Czi {
            path: path.to_string_lossy().to_string(),
        }),
        _ => Err(format!(
            "Unsupported source '{}' (expected ND2, CZI, or a TIFF folder)",
            path.display()
        )),
    }
}

pub fn profile_crop(options: CropProfileOptions) -> Result<CropProfileReport, String> {
    if options.batch_planes == 0 {
        return Err("batch must be greater than zero".to_string());
    }

    let overall_start = Instant::now();
    let mut stats = StepStats::default();

    let bbox_path = workspace_bbox_csv_path(&options.workspace_path, options.pos);
    let bbox_parse_start = Instant::now();
    let bboxes = parse_bbox_csv(&bbox_path)?;
    stats.record(StepKind::BboxCsv, bbox_parse_start.elapsed());

    let output_root = create_profile_root(options.pos, &options.output_root)?;

    let profile_result = match &options.source {
        ViewerSource::Nd2 { path } => {
            profile_nd2_source(Path::new(path), &output_root, &options, &bboxes, &mut stats)
        }
        ViewerSource::Tif { path } | ViewerSource::Jpg { path } => {
            profile_tif_source(Path::new(path), &output_root, &options, &bboxes, &mut stats)
        }
        ViewerSource::Czi { path } => {
            profile_czi_source(Path::new(path), &output_root, &options, &bboxes, &mut stats)
        }
    }?;

    let manifest_path = workspace_roi_pos_dir_path(&output_root.to_string_lossy(), options.pos)
        .join("profile.json");
    let manifest = ProfileManifest {
        workspace_path: options.workspace_path.clone(),
        source: options.source.clone(),
        pos: options.pos,
        bbox_count: bboxes.len(),
        available_plane_count: profile_result.available_plane_count,
        selected_plane_count: profile_result.selected_plane_count,
        plane_offset: options.plane_offset,
        batch_planes: options.batch_planes,
        batch_timepoints: profile_result.batch_timepoints,
        output_root: output_root.to_string_lossy().to_string(),
    };
    let index_write_start = Instant::now();
    let manifest_bytes = serde_json::to_vec_pretty(&manifest).map_err(|err| err.to_string())?;
    fs::write(&manifest_path, manifest_bytes).map_err(|err| err.to_string())?;
    stats.record(StepKind::IndexWrite, index_write_start.elapsed());

    let total = overall_start.elapsed();
    let steps = stats.to_summaries(total);
    let interpretation = build_interpretation(&steps);

    Ok(CropProfileReport {
        workspace_path: options.workspace_path,
        source: options.source,
        pos: options.pos,
        bbox_count: bboxes.len(),
        available_plane_count: profile_result.available_plane_count,
        selected_plane_count: profile_result.selected_plane_count,
        plane_offset: options.plane_offset,
        batch_planes: options.batch_planes,
        batch_timepoints: profile_result.batch_timepoints,
        output_dir: profile_result.output_dir.to_string_lossy().to_string(),
        output_manifest_path: manifest_path.to_string_lossy().to_string(),
        interpretation,
        steps,
        total_ms: total.as_secs_f64() * 1000.0,
    })
}

pub fn render_text_report(report: &CropProfileReport) -> String {
    let mut out = String::new();
    let _ = writeln!(&mut out, "Crop profile");
    let _ = writeln!(&mut out, "source: {}", source_label(&report.source));
    let _ = writeln!(&mut out, "workspace: {}", report.workspace_path);
    let _ = writeln!(&mut out, "pos: {}", report.pos);
    let _ = writeln!(&mut out, "batch target planes: {}", report.batch_planes);
    let _ = writeln!(&mut out, "batch timepoints: {}", report.batch_timepoints);
    let _ = writeln!(
        &mut out,
        "planes: {} selected / {} available (offset {})",
        report.selected_plane_count, report.available_plane_count, report.plane_offset
    );
    let _ = writeln!(&mut out, "bboxes: {}", report.bbox_count);
    let _ = writeln!(&mut out, "output: {}", report.output_dir);
    let _ = writeln!(
        &mut out,
        "{:<16} {:>8} {:>12} {:>12} {:>10}",
        "step", "count", "total ms", "avg ms", "% total"
    );
    for step in &report.steps {
        let _ = writeln!(
            &mut out,
            "{:<16} {:>8} {:>12.2} {:>12.2} {:>9.1}",
            step.step, step.count, step.total_ms, step.avg_ms, step.percent_total
        );
    }
    let _ = writeln!(&mut out, "total: {:.2} ms", report.total_ms);
    let _ = writeln!(&mut out, "interpretation: {}", report.interpretation);
    out
}

struct ProfileRunResult {
    available_plane_count: usize,
    selected_plane_count: usize,
    batch_timepoints: usize,
    output_dir: PathBuf,
}

struct Nd2BatchReadResult {
    order_index: usize,
    frame: Vec<u16>,
}

fn profile_nd2_source(
    path: &Path,
    output_root: &Path,
    options: &CropProfileOptions,
    bboxes: &[RoiBbox],
    stats: &mut StepStats,
) -> Result<ProfileRunResult, String> {
    let open_start = Instant::now();
    let mut reader = SourceReader::open_nd2(path)?;
    stats.record(StepKind::SourceOpen, open_start.elapsed());

    let metadata_start = Instant::now();
    let metadata = reader.metadata()?;
    let width = metadata.width;
    let height = metadata.height;
    let channels = metadata.channels.clone();
    let times = metadata.times.clone();
    let z_slices = metadata.z_slices.clone();
    if !metadata.contains_position(options.pos) {
        return Err(format!("Position index {} is out of range", options.pos));
    }
    let pos_index = metadata.position_index(options.pos)?;
    validate_bboxes(bboxes, width, height)?;
    let batch_selection = select_batch_planes(
        &times,
        &channels,
        &z_slices,
        options.plane_offset,
        options.batch_planes,
    )?;
    stats.record(StepKind::SourceMetadata, metadata_start.elapsed());

    let output_dir = prepare_profile_output_dir(output_root, options.pos, stats)?;
    let mut encoders = open_roi_writers(output_root, options.pos, bboxes, stats)?;
    let batch_read_start = Instant::now();
    let results = read_nd2_batch(path, pos_index, &batch_selection.planes)?;
    stats.record_count(
        StepKind::ReadFrame,
        batch_read_start.elapsed(),
        results.len() as u64,
    );
    for result in results {
        if result.frame.len() != width as usize * height as usize {
            return Err("Unexpected ND2 frame dimensions".to_string());
        }

        write_plane_crops(&result.frame, width, bboxes, &mut encoders, stats)?;
    }

    Ok(ProfileRunResult {
        available_plane_count: times.len() * channels.len() * z_slices.len(),
        selected_plane_count: batch_selection.planes.len(),
        batch_timepoints: batch_selection.timepoint_count,
        output_dir,
    })
}

fn profile_tif_source(
    root: &Path,
    output_root: &Path,
    options: &CropProfileOptions,
    bboxes: &[RoiBbox],
    stats: &mut StepStats,
) -> Result<ProfileRunResult, String> {
    let open_start = Instant::now();
    let pos_dir = find_position_dir(root, options.pos)?;
    stats.record(StepKind::SourceOpen, open_start.elapsed());

    let metadata_start = Instant::now();
    let mut index = HashMap::<(u32, u32, u32), PathBuf>::new();
    let mut channels = Vec::<u32>::new();
    let mut times = Vec::<u32>::new();
    let mut z_slices = Vec::<u32>::new();
    let mut time_set = std::collections::BTreeSet::new();
    let mut z_set = std::collections::BTreeSet::new();
    let mut source_images = Vec::new();

    for (path, parsed) in collect_tiffs(&pos_dir) {
        if parsed.position != options.pos {
            continue;
        }
        time_set.insert(parsed.time);
        z_set.insert(parsed.z);
        source_images.push((path, parsed));
    }

    let channel_mapping =
        build_channel_mapping(source_images.iter().map(|(_, parsed)| &parsed.channel));
    let mut channel_set = std::collections::BTreeSet::new();
    for (path, parsed) in source_images {
        let Some(channel) = channel_mapping.get(&parsed.channel).copied() else {
            continue;
        };
        channel_set.insert(channel);
        index.insert((channel, parsed.time, parsed.z), path);
    }

    channels.extend(channel_set);
    times.extend(time_set);
    z_slices.extend(z_set);
    if channels.is_empty() || times.is_empty() || z_slices.is_empty() {
        return Err(format!("No TIFF frames found for Pos{}", options.pos));
    }

    let first_path = index
        .get(&(channels[0], times[0], z_slices[0]))
        .ok_or_else(|| format!("Missing TIFF frame for Pos{}", options.pos))?;
    let first_frame = load_tiff_frame(first_path)?;
    validate_bboxes(bboxes, first_frame.width, first_frame.height)?;
    let batch_selection = select_batch_planes(
        &times,
        &channels,
        &z_slices,
        options.plane_offset,
        options.batch_planes,
    )?;
    stats.record(StepKind::SourceMetadata, metadata_start.elapsed());

    let output_dir = prepare_profile_output_dir(output_root, options.pos, stats)?;
    let mut encoders = open_roi_writers(output_root, options.pos, bboxes, stats)?;
    for plane in &batch_selection.planes {
        let path = index
            .get(&(plane.channel, plane.time, plane.z))
            .ok_or_else(|| {
                format!(
                    "Missing TIFF frame for Pos{}, channel {}, time {}, z {}",
                    options.pos, plane.channel, plane.time, plane.z
                )
            })?;
        let read_start = Instant::now();
        let frame = load_tiff_frame(path)?;
        stats.record(StepKind::ReadFrame, read_start.elapsed());

        if frame.width != first_frame.width || frame.height != first_frame.height {
            return Err("Inconsistent TIFF dimensions across stack".to_string());
        }

        write_plane_crops(&frame.data, frame.width, bboxes, &mut encoders, stats)?;
    }

    Ok(ProfileRunResult {
        available_plane_count: times.len() * channels.len() * z_slices.len(),
        selected_plane_count: batch_selection.planes.len(),
        batch_timepoints: batch_selection.timepoint_count,
        output_dir,
    })
}

fn read_nd2_batch(
    path: &Path,
    pos_index: usize,
    planes: &[PlaneCoord],
) -> Result<Vec<Nd2BatchReadResult>, String> {
    if planes.is_empty() {
        return Ok(Vec::new());
    }

    let worker_count = planes.len();
    let mut assignments = vec![Vec::<(usize, PlaneCoord)>::new(); worker_count];
    for (index, plane) in planes.iter().copied().enumerate() {
        assignments[index % worker_count].push((index, plane));
    }

    let path = path.to_path_buf();
    let mut handles = Vec::with_capacity(worker_count);
    for assignment in assignments
        .into_iter()
        .filter(|assignment| !assignment.is_empty())
    {
        let path = path.clone();
        handles.push(thread::spawn(
            move || -> Result<Vec<Nd2BatchReadResult>, String> {
                let open_start = Instant::now();
                let mut reader = SourceReader::open_nd2(&path)?;
                let _open_duration = open_start.elapsed();

                let mut results = Vec::with_capacity(assignment.len());
                for (_job_index, (order_index, plane)) in assignment.into_iter().enumerate() {
                    let frame = reader
                        .read_frame_2d(
                            pos_index,
                            plane.time as usize,
                            plane.channel as usize,
                            plane.z as usize,
                        )
                        .map_err(|err| err.to_string())?
                        .data;
                    results.push(Nd2BatchReadResult { order_index, frame });
                }

                Ok(results)
            },
        ));
    }

    let mut results = Vec::with_capacity(planes.len());
    for handle in handles {
        let worker_results = handle
            .join()
            .map_err(|_| "ND2 batch worker panicked".to_string())??;
        results.extend(worker_results);
    }
    results.sort_by_key(|result| result.order_index);
    Ok(results)
}

fn profile_czi_source(
    path: &Path,
    output_root: &Path,
    options: &CropProfileOptions,
    bboxes: &[RoiBbox],
    stats: &mut StepStats,
) -> Result<ProfileRunResult, String> {
    let open_start = Instant::now();
    let mut reader = SourceReader::open_czi(path)?;
    stats.record(StepKind::SourceOpen, open_start.elapsed());

    let metadata_start = Instant::now();
    let metadata = reader.metadata()?;
    let channels = metadata.channels.clone();
    let times = metadata.times.clone();
    let z_slices = metadata.z_slices.clone();
    if !metadata.contains_position(options.pos) {
        return Err(format!("Position index {} is out of range", options.pos));
    }

    let pos_index = metadata.position_index(options.pos)?;
    let preview_frame = reader.read_frame_2d(pos_index, 0, 0, 0)?;
    validate_bboxes(bboxes, preview_frame.width, preview_frame.height)?;
    let batch_selection = select_batch_planes(
        &times,
        &channels,
        &z_slices,
        options.plane_offset,
        options.batch_planes,
    )?;
    stats.record(StepKind::SourceMetadata, metadata_start.elapsed());

    let output_dir = prepare_profile_output_dir(output_root, options.pos, stats)?;
    let mut encoders = open_roi_writers(output_root, options.pos, bboxes, stats)?;
    for plane in &batch_selection.planes {
        let time_index = metadata.time_index(plane.time)?;
        let channel_index = metadata.channel_index(plane.channel)?;
        let z_index = metadata.z_index(plane.z)?;

        let read_start = Instant::now();
        let frame = reader.read_frame_2d(pos_index, time_index, channel_index, z_index)?;
        stats.record(StepKind::ReadFrame, read_start.elapsed());

        if frame.data.len() != preview_frame.width as usize * preview_frame.height as usize {
            return Err("Unexpected CZI frame dimensions".to_string());
        }

        write_plane_crops(
            &frame.data,
            preview_frame.width,
            bboxes,
            &mut encoders,
            stats,
        )?;
    }

    Ok(ProfileRunResult {
        available_plane_count: times.len() * channels.len() * z_slices.len(),
        selected_plane_count: batch_selection.planes.len(),
        batch_timepoints: batch_selection.timepoint_count,
        output_dir,
    })
}

fn prepare_profile_output_dir(
    output_root: &Path,
    pos: u32,
    stats: &mut StepStats,
) -> Result<PathBuf, String> {
    let start = Instant::now();
    let output_dir = prepare_roi_output_dir(&output_root.to_string_lossy(), pos)?;
    stats.record(StepKind::OutputPrepare, start.elapsed());
    Ok(output_dir)
}

fn open_roi_writers(
    output_root: &Path,
    pos: u32,
    bboxes: &[RoiBbox],
    stats: &mut StepStats,
) -> Result<Vec<RoiEncoder>, String> {
    let start = Instant::now();
    let encoders = bboxes
        .iter()
        .map(|bbox| {
            let path = workspace_roi_tiff_path(&output_root.to_string_lossy(), pos, bbox.roi);
            let file = File::create(path).map_err(|err| err.to_string())?;
            TiffEncoder::new(BufWriter::new(file)).map_err(|err| err.to_string())
        })
        .collect::<Result<Vec<_>, String>>()?;
    stats.record(StepKind::WriterOpen, start.elapsed());
    Ok(encoders)
}

fn write_plane_crops(
    frame: &[u16],
    frame_width: u32,
    bboxes: &[RoiBbox],
    encoders: &mut [RoiEncoder],
    stats: &mut StepStats,
) -> Result<(), String> {
    for (encoder, bbox) in encoders.iter_mut().zip(bboxes.iter()) {
        let crop_start = Instant::now();
        let cropped = crop_u16_frame(frame, frame_width, bbox);
        stats.record(StepKind::CropCopy, crop_start.elapsed());

        let write_start = Instant::now();
        encoder
            .write_image::<colortype::Gray16>(bbox.w, bbox.h, &cropped)
            .map_err(|err| err.to_string())?;
        stats.record(StepKind::WriteTiffs, write_start.elapsed());
    }
    Ok(())
}

struct BatchSelection {
    planes: Vec<PlaneCoord>,
    timepoint_count: usize,
}

fn select_batch_planes(
    times: &[u32],
    channels: &[u32],
    z_slices: &[u32],
    plane_offset: usize,
    batch_planes: usize,
) -> Result<BatchSelection, String> {
    let planes_per_timepoint = channels.len() * z_slices.len();
    if times.is_empty() || channels.is_empty() || z_slices.is_empty() {
        return Err("Source does not contain any frames".to_string());
    }
    let available_plane_count = times.len() * planes_per_timepoint;
    if plane_offset >= available_plane_count {
        return Err(format!(
            "plane-offset {} is out of range for {} available planes",
            plane_offset, available_plane_count
        ));
    }

    let start_time_index = plane_offset.div_ceil(planes_per_timepoint);
    if start_time_index >= times.len() {
        return Err(format!(
            "plane-offset {} resolves past the available timepoints",
            plane_offset
        ));
    }

    let timepoint_count = batch_planes.div_ceil(planes_per_timepoint).max(1);
    let end_time_index = start_time_index
        .saturating_add(timepoint_count)
        .min(times.len());
    let selected_times = &times[start_time_index..end_time_index];

    Ok(BatchSelection {
        planes: all_planes(selected_times, channels, z_slices),
        timepoint_count: selected_times.len(),
    })
}

fn all_planes(times: &[u32], channels: &[u32], z_slices: &[u32]) -> Vec<PlaneCoord> {
    let mut planes = Vec::with_capacity(times.len() * channels.len() * z_slices.len());
    for time in times {
        for channel in channels {
            for z in z_slices {
                planes.push(PlaneCoord {
                    time: *time,
                    channel: *channel,
                    z: *z,
                });
            }
        }
    }
    planes
}

fn create_profile_root(pos: u32, output_root: &str) -> Result<PathBuf, String> {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|err| err.to_string())?
        .as_nanos();
    let base = PathBuf::from(output_root);
    fs::create_dir_all(&base).map_err(|err| err.to_string())?;
    let root = base.join(format!("lisca-crop-profiler-pos{pos}-{stamp}"));
    fs::create_dir_all(&root).map_err(|err| err.to_string())?;
    Ok(root)
}

fn build_interpretation(steps: &[CropProfileStepSummary]) -> String {
    let read = lookup_step(steps, "read_frame");
    let write = lookup_step(steps, "write_tiffs");
    let crop = lookup_step(steps, "crop_copy");
    let io = read + write;

    if io > crop * 1.5 {
        format!(
            "I/O-dominant: read_frame + write_tiffs account for {:.1}% of total measured time",
            io
        )
    } else if crop > io * 1.5 {
        format!(
            "Compute-dominant: crop_copy accounts for {:.1}% of total measured time",
            crop
        )
    } else {
        format!(
            "Mixed: read_frame + write_tiffs are {:.1}% and crop_copy is {:.1}% of total measured time",
            io, crop
        )
    }
}

fn lookup_step(steps: &[CropProfileStepSummary], step: &str) -> f64 {
    steps
        .iter()
        .find(|summary| summary.step == step)
        .map(|summary| summary.percent_total)
        .unwrap_or(0.0)
}

fn source_label(source: &ViewerSource) -> &str {
    match source {
        ViewerSource::Tif { .. } => "tif",
        ViewerSource::Jpg { .. } => "jpg",
        ViewerSource::Nd2 { .. } => "nd2",
        ViewerSource::Czi { .. } => "czi",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn unique_test_dir(name: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("lisca-profiler-{name}-{suffix}"));
        fs::create_dir_all(&path).expect("create test directory");
        path
    }

    fn write_tiff(path: &Path, width: u32, height: u32, data: &[u16]) {
        let file = File::create(path).expect("create tiff");
        let mut encoder = TiffEncoder::new(BufWriter::new(file)).expect("create encoder");
        encoder
            .write_image::<colortype::Gray16>(width, height, data)
            .expect("write image");
    }

    #[test]
    fn build_interpretation_prefers_io_when_read_and_write_dominate() {
        let steps = vec![
            CropProfileStepSummary {
                step: "read_frame".to_string(),
                count: 1,
                total_ms: 10.0,
                avg_ms: 10.0,
                percent_total: 40.0,
            },
            CropProfileStepSummary {
                step: "write_tiffs".to_string(),
                count: 1,
                total_ms: 12.0,
                avg_ms: 12.0,
                percent_total: 42.0,
            },
            CropProfileStepSummary {
                step: "crop_copy".to_string(),
                count: 1,
                total_ms: 4.0,
                avg_ms: 4.0,
                percent_total: 10.0,
            },
        ];

        assert!(build_interpretation(&steps).starts_with("I/O-dominant"));
    }

    #[test]
    fn stats_to_summaries_compute_counts_and_totals() {
        let mut stats = StepStats::default();
        stats.record(StepKind::ReadFrame, Duration::from_millis(10));
        stats.record(StepKind::ReadFrame, Duration::from_millis(30));
        let summaries = stats.to_summaries(Duration::from_millis(100));
        let read = summaries
            .into_iter()
            .find(|summary| summary.step == "read_frame")
            .expect("read_frame summary");

        assert_eq!(read.count, 2);
        assert!((read.total_ms - 40.0).abs() < 0.001);
        assert!((read.avg_ms - 20.0).abs() < 0.001);
        assert!((read.percent_total - 40.0).abs() < 0.001);
    }

    #[test]
    fn profile_crop_profiles_tiff_source_without_touching_workspace_roi() {
        let root = unique_test_dir("tif");
        let workspace = root.join("workspace");
        let source = root.join("source");
        let pos_dir = source.join("Pos0");
        fs::create_dir_all(workspace.join("bbox")).expect("create bbox dir");
        fs::create_dir_all(&pos_dir).expect("create pos dir");

        write_tiff(
            &pos_dir.join("img_channel0_position0_time0_z0.tif"),
            3,
            2,
            &[1, 2, 3, 4, 5, 6],
        );
        write_tiff(
            &pos_dir.join("img_channel0_position0_time1_z0.tif"),
            3,
            2,
            &[7, 8, 9, 10, 11, 12],
        );
        fs::write(
            workspace.join("bbox").join("Pos0.csv"),
            "roi,x,y,w,h\n0,0,0,2,2\n1,1,0,2,2\n",
        )
        .expect("write bbox");

        let report = profile_crop(CropProfileOptions {
            workspace_path: workspace.to_string_lossy().to_string(),
            source: ViewerSource::Tif {
                path: source.to_string_lossy().to_string(),
            },
            pos: 0,
            plane_offset: 0,
            batch_planes: 1,
            output_root: root.join("profiles").to_string_lossy().to_string(),
        })
        .expect("profile crop");

        assert_eq!(report.selected_plane_count, 1);
        assert_eq!(report.available_plane_count, 2);
        assert!(!workspace.join("roi").exists());
        assert!(Path::new(&report.output_dir).is_dir());
        assert!(Path::new(&report.output_manifest_path).is_file());
        assert!(report
            .steps
            .iter()
            .any(|step| step.step == "read_frame" && step.count == 1));
        assert!(report
            .steps
            .iter()
            .any(|step| step.step == "crop_copy" && step.count == 2));
        assert!(report
            .steps
            .iter()
            .any(|step| step.step == "write_tiffs" && step.count == 2));

        let _ = fs::remove_dir_all(root);
        let temp_root = Path::new(&report.output_dir)
            .ancestors()
            .nth(2)
            .map(Path::to_path_buf);
        if let Some(temp_root) = temp_root {
            let _ = fs::remove_dir_all(temp_root);
        }
    }

    #[test]
    fn profile_crop_uses_explicit_output_root() {
        let root = unique_test_dir("explicit-output");
        let workspace = root.join("workspace");
        let source = root.join("source");
        let output_root = root.join("profiles");
        let pos_dir = source.join("Pos0");
        fs::create_dir_all(workspace.join("bbox")).expect("create bbox dir");
        fs::create_dir_all(&pos_dir).expect("create pos dir");

        write_tiff(
            &pos_dir.join("img_channel0_position0_time0_z0.tif"),
            2,
            1,
            &[1, 2],
        );
        fs::write(
            workspace.join("bbox").join("Pos0.csv"),
            "roi,x,y,w,h\n0,0,0,1,1\n",
        )
        .expect("write bbox");

        let report = profile_crop(CropProfileOptions {
            workspace_path: workspace.to_string_lossy().to_string(),
            source: ViewerSource::Tif {
                path: source.to_string_lossy().to_string(),
            },
            pos: 0,
            plane_offset: 0,
            batch_planes: 1,
            output_root: output_root.to_string_lossy().to_string(),
        })
        .expect("profile crop");

        assert!(Path::new(&report.output_dir).starts_with(&output_root));

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn select_batch_planes_rounds_up_to_whole_timepoints() {
        let selection =
            select_batch_planes(&[0, 1, 2], &[0, 1, 2], &[0], 0, 50).expect("select batch planes");

        assert_eq!(selection.timepoint_count, 3);
        assert_eq!(selection.planes.len(), 9);
        assert!(selection.planes.iter().any(|plane| plane.time == 0));
        assert!(selection.planes.iter().any(|plane| plane.time == 1));
        assert!(selection.planes.iter().any(|plane| plane.time == 2));
    }

    #[test]
    fn select_batch_planes_aligns_offset_to_next_full_timepoint() {
        let selection = select_batch_planes(&[0, 1, 2, 3], &[0, 1, 2], &[0], 4, 5)
            .expect("select batch planes");

        assert_eq!(selection.timepoint_count, 2);
        assert_eq!(selection.planes.len(), 6);
        assert!(selection.planes.iter().all(|plane| plane.time >= 2));
        assert!(selection.planes.iter().all(|plane| plane.time <= 3));
    }
}

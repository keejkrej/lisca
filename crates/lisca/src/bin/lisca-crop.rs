//! CLI for batch ROI cropping and benchmarking.
//!
//! Uses the same `aligner::crop_roi` path as the aligner/studio servers.
//! Build without studio deps: `cargo build -p lisca --release --bin lisca-crop --no-default-features`

use std::{
    env,
    sync::{atomic::AtomicBool, Arc},
    time::Instant,
};

use lisca::{
    aligner::{crop_roi, list_saved_bbox_positions, scan_source},
    protocol::{
        AlignerSource, AssayData, AssayJsonFile, CropOutputFormat, CropRoiProgress, CropRoiRequest,
        CropRoiStatus,
    },
};

#[cfg(target_os = "linux")]
mod monitor {
    use super::{Arc, AtomicBool, Instant};
    use std::{
        fs,
        sync::atomic::Ordering,
        thread::{self, JoinHandle},
        time::Duration,
    };

    const SAMPLE_INTERVAL: Duration = Duration::from_millis(500);

    pub struct ResourceMonitor {
        stop: Arc<AtomicBool>,
        handle: JoinHandle<ResourceSummary>,
    }

    #[derive(Clone, Debug, Default)]
    pub struct ResourceSummary {
        pub samples: u32,
        pub avg_process_cpu_pct: f64,
        pub peak_process_cpu_pct: f64,
        pub total_read_mb: f64,
        pub total_write_mb: f64,
        pub avg_read_mbps: f64,
        pub avg_write_mbps: f64,
        pub avg_disk_read_mbps: f64,
        pub avg_disk_write_mbps: f64,
    }

    impl ResourceMonitor {
        pub fn start() -> Self {
            let stop = Arc::new(AtomicBool::new(false));
            let stop_flag = stop.clone();
            let handle = thread::spawn(move || sampler(stop_flag));
            Self { stop, handle }
        }

        pub fn stop(self) -> ResourceSummary {
            self.stop.store(true, Ordering::Relaxed);
            self.handle.join().unwrap_or_default()
        }
    }

    fn sampler(stop: Arc<AtomicBool>) -> ResourceSummary {
        let cpu_count = thread::available_parallelism()
            .map(usize::from)
            .unwrap_or(1) as f64;
        let clock_ticks = clock_ticks_per_second();
        let mut summary = ResourceSummary::default();
        let mut last_sample = Instant::now();
        let mut last_process_ticks = process_cpu_ticks().unwrap_or(0);
        let mut last_io = process_io_bytes().unwrap_or((0, 0));
        let mut last_disk_sectors = disk_sectors().unwrap_or((0, 0));

        while !stop.load(Ordering::Relaxed) {
            thread::sleep(SAMPLE_INTERVAL);
            if stop.load(Ordering::Relaxed) {
                break;
            }

            let now = Instant::now();
            let elapsed = now.duration_since(last_sample).as_secs_f64();
            if elapsed <= 0.0 {
                continue;
            }

            if let Some(process_ticks) = process_cpu_ticks() {
                let delta_ticks = process_ticks.saturating_sub(last_process_ticks);
                let cpu_pct =
                    (delta_ticks as f64 / clock_ticks as f64) / elapsed / cpu_count * 100.0;
                summary.samples += 1;
                summary.avg_process_cpu_pct =
                    ((summary.avg_process_cpu_pct * (summary.samples - 1) as f64) + cpu_pct)
                        / summary.samples as f64;
                summary.peak_process_cpu_pct = summary.peak_process_cpu_pct.max(cpu_pct);
                last_process_ticks = process_ticks;
            }

            if let Some((read_bytes, write_bytes)) = process_io_bytes() {
                let read_delta = read_bytes.saturating_sub(last_io.0);
                let write_delta = write_bytes.saturating_sub(last_io.1);
                summary.total_read_mb += bytes_to_mb(read_delta);
                summary.total_write_mb += bytes_to_mb(write_delta);
                summary.avg_read_mbps = ((summary.avg_read_mbps
                    * (summary.samples.saturating_sub(1)) as f64)
                    + bytes_to_mbps(read_delta, elapsed))
                    / summary.samples.max(1) as f64;
                summary.avg_write_mbps = ((summary.avg_write_mbps
                    * (summary.samples.saturating_sub(1)) as f64)
                    + bytes_to_mbps(write_delta, elapsed))
                    / summary.samples.max(1) as f64;
                last_io = (read_bytes, write_bytes);
            }

            if let Some((read_sectors, write_sectors)) = disk_sectors() {
                let read_delta = read_sectors.saturating_sub(last_disk_sectors.0);
                let write_delta = write_sectors.saturating_sub(last_disk_sectors.1);
                let disk_read_mbps = sectors_to_mbps(read_delta, elapsed);
                let disk_write_mbps = sectors_to_mbps(write_delta, elapsed);
                summary.avg_disk_read_mbps = ((summary.avg_disk_read_mbps
                    * (summary.samples.saturating_sub(1)) as f64)
                    + disk_read_mbps)
                    / summary.samples.max(1) as f64;
                summary.avg_disk_write_mbps = ((summary.avg_disk_write_mbps
                    * (summary.samples.saturating_sub(1)) as f64)
                    + disk_write_mbps)
                    / summary.samples.max(1) as f64;
                last_disk_sectors = (read_sectors, write_sectors);
            }

            last_sample = now;
        }

        summary
    }

    fn clock_ticks_per_second() -> u64 {
        100
    }

    fn process_cpu_ticks() -> Option<u64> {
        let stat = fs::read_to_string("/proc/self/stat").ok()?;
        let rest = stat.split(')').nth(1)?.trim();
        let fields: Vec<_> = rest.split_whitespace().collect();
        let utime = fields.get(11)?.parse::<u64>().ok()?;
        let stime = fields.get(12)?.parse::<u64>().ok()?;
        Some(utime + stime)
    }

    fn process_io_bytes() -> Option<(u64, u64)> {
        let mut read_bytes = 0_u64;
        let mut write_bytes = 0_u64;
        for line in fs::read_to_string("/proc/self/io").ok()?.lines() {
            if let Some(value) = line.strip_prefix("read_bytes:") {
                read_bytes = value.trim().parse().ok()?;
            } else if let Some(value) = line.strip_prefix("write_bytes:") {
                write_bytes = value.trim().parse().ok()?;
            }
        }
        Some((read_bytes, write_bytes))
    }

    fn disk_sectors() -> Option<(u64, u64)> {
        let mut read_sectors = 0_u64;
        let mut write_sectors = 0_u64;
        for line in fs::read_to_string("/proc/diskstats").ok()?.lines() {
            let mut parts = line.split_whitespace();
            let _major = parts.next()?;
            let _minor = parts.next()?;
            let name = parts.next()?;
            if !is_physical_disk(name) {
                continue;
            }
            let _reads = parts.next()?;
            let _read_merges = parts.next()?;
            read_sectors += parts.next()?.parse::<u64>().ok()?;
            let _read_ms = parts.next()?;
            let _writes = parts.next()?;
            let _write_merges = parts.next()?;
            write_sectors += parts.next()?.parse::<u64>().ok()?;
        }
        Some((read_sectors, write_sectors))
    }

    fn is_physical_disk(name: &str) -> bool {
        if name.starts_with("loop") || name.starts_with("ram") || name.starts_with("dm-") {
            return false;
        }
        if name.starts_with("nvme") {
            return !name.contains('p');
        }
        name.starts_with("sd")
            && name.len() == 3
            && name.as_bytes().get(2).is_some_and(u8::is_ascii_alphabetic)
    }

    fn bytes_to_mb(bytes: u64) -> f64 {
        bytes as f64 / (1024.0 * 1024.0)
    }

    fn bytes_to_mbps(bytes: u64, seconds: f64) -> f64 {
        bytes_to_mb(bytes) / seconds
    }

    fn sectors_to_mbps(sectors: u64, seconds: f64) -> f64 {
        bytes_to_mbps(sectors.saturating_mul(512), seconds)
    }

    pub fn print_summary(summary: &ResourceSummary, elapsed: Duration) {
        eprintln!(
            "resources ({:.2}s, {} samples): process CPU avg {:.0}% peak {:.0}% | process IO read {:.1} MB ({:.1} MB/s avg) write {:.1} MB ({:.1} MB/s avg) | disk read {:.1} MB/s avg write {:.1} MB/s avg",
            elapsed.as_secs_f64(),
            summary.samples,
            summary.avg_process_cpu_pct,
            summary.peak_process_cpu_pct,
            summary.total_read_mb,
            summary.avg_read_mbps,
            summary.total_write_mb,
            summary.avg_write_mbps,
            summary.avg_disk_read_mbps,
            summary.avg_disk_write_mbps,
        );
    }
}

#[cfg(not(target_os = "linux"))]
mod monitor {
    use std::time::Duration;

    #[derive(Clone, Debug, Default)]
    pub struct ResourceSummary;

    pub struct ResourceMonitor;

    impl ResourceMonitor {
        pub fn start() -> Self {
            Self
        }

        pub fn stop(self) -> ResourceSummary {
            ResourceSummary
        }
    }

    pub fn print_summary(_summary: &ResourceSummary, _elapsed: Duration) {
        eprintln!("resource monitoring is only available on Linux");
    }
}

fn usage() -> &'static str {
    "\
Usage:
  lisca-crop --workspace PATH [--source PATH] [--positions 1,2] [--overwrite] [--workers N]
  lisca-crop PATH_TO_WORKSPACE ...

Source:
  --source PATH.nd2|.czi          single-file source
  --source DIR                    folder of frames (TIF/PNG/JPEG)
    --subfolder-template TMPL     default Pos{p}  (empty string = flat folder)
    --filename-template TMPL      default img_{t}_{c}_{z}.tif
  or assay.json: data (folder{path,template}|nd2{path}|czi{path})

Positions: --positions list, or all bbox/Pos*.csv under the workspace.
Env: LISCA_CROP_WORKERS overrides --workers (upper bound; default is 1)

ROI crop is Studio/CLI-owned; the Aligner app only saves bbox/align."
}

fn parse_flag(args: &[String], name: &str) -> Option<String> {
    let index = args.iter().position(|arg| arg == name)?;
    args.get(index + 1).cloned()
}

fn parse_positions(raw: &str) -> Result<Vec<u32>, String> {
    raw.split(',')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .map(|part| {
            part.parse::<u32>()
                .map_err(|error| format!("invalid position {part}: {error}"))
        })
        .collect()
}

fn first_positional(args: &[String]) -> Option<&str> {
    let mut i = 0;
    while i < args.len() {
        let arg = args[i].as_str();
        if arg == "--" {
            return args.get(i + 1).map(String::as_str);
        }
        if arg.starts_with('-') {
            if arg.contains('=') || matches!(arg, "--overwrite" | "-h" | "--help") {
                i += 1;
                continue;
            }
            i += 2;
            continue;
        }
        return Some(arg);
    }
    None
}

fn folder_source(
    path: String,
    subfolder_template: String,
    filename_template: String,
) -> Result<AlignerSource, String> {
    let root = std::path::Path::new(&path);
    if !root.is_dir() {
        return Err(format!("folder source is not a directory: {path}"));
    }
    Ok(AlignerSource::Folder {
        path,
        subfolder_template,
        filename_template,
    })
}

fn source_from_path(
    path: String,
    subfolder_template: Option<String>,
    filename_template: Option<String>,
) -> Result<AlignerSource, String> {
    let meta = std::fs::metadata(&path)
        .map_err(|error| format!("cannot access source {path}: {error}"))?;
    if meta.is_dir() {
        return folder_source(
            path,
            subfolder_template.unwrap_or_else(|| "Pos{p}".to_string()),
            filename_template.unwrap_or_else(|| "img_{t}_{c}_{z}.tif".to_string()),
        );
    }
    let lower = path.to_ascii_lowercase();
    if lower.ends_with(".nd2") {
        Ok(AlignerSource::Nd2 { path })
    } else if lower.ends_with(".czi") {
        Ok(AlignerSource::Czi { path })
    } else {
        Err(format!(
            "unsupported --source (use .nd2, .czi, or a folder of frames): {path}"
        ))
    }
}

fn source_from_assay_json(workspace: &str) -> Result<AlignerSource, String> {
    let path = std::path::Path::new(workspace).join("assay.json");
    let contents = std::fs::read_to_string(&path)
        .map_err(|error| format!("failed to read {}: {error}", path.display()))?;
    let assay: AssayJsonFile = serde_json::from_str(&contents)
        .map_err(|error| format!("invalid assay.json {}: {error}", path.display()))?;
    match assay.data {
        AssayData::Folder { path, template } => {
            folder_source(path, template.subfolder, template.filename)
        }
        AssayData::Nd2 { path } => Ok(AlignerSource::Nd2 { path }),
        AssayData::Czi { path } => Ok(AlignerSource::Czi { path }),
    }
}

fn main() {
    if let Err(message) = run(env::args().skip(1).collect()) {
        eprintln!("{message}");
        eprintln!("{}", usage());
        std::process::exit(1);
    }
}

fn run(args: Vec<String>) -> Result<(), String> {
    if args.is_empty() || args.iter().any(|a| matches!(a.as_str(), "-h" | "--help")) {
        eprintln!("{}", usage());
        return Ok(());
    }

    let workspace_path = parse_flag(&args, "--workspace")
        .or_else(|| first_positional(&args).map(str::to_string))
        .ok_or("missing --workspace (or positional workspace path)")?;
    let subfolder_template = parse_flag(&args, "--subfolder-template");
    let filename_template = parse_flag(&args, "--filename-template");
    let source = match parse_flag(&args, "--source") {
        Some(path) => source_from_path(path, subfolder_template, filename_template)?,
        None => source_from_assay_json(&workspace_path)?,
    };
    let overwrite =
        args.iter().any(|arg| arg == "--overwrite") || args.iter().any(|arg| arg == "--force");
    let positions = match parse_flag(&args, "--positions") {
        Some(raw) => parse_positions(&raw)?,
        None => list_saved_bbox_positions(&workspace_path)?,
    };
    if positions.is_empty() {
        return Err("no positions to crop".to_string());
    }
    if let Some(workers) = parse_flag(&args, "--workers") {
        let workers = workers
            .parse::<usize>()
            .map_err(|error| format!("invalid --workers value: {error}"))?;
        if workers == 0 {
            return Err("--workers must be at least 1".to_string());
        }
        env::set_var("LISCA_CROP_WORKERS", workers.to_string());
    }

    let scan = scan_source(source.clone())?;
    let frame_count = (scan.times.len().max(1) as u64)
        * (scan.channels.len().max(1) as u64)
        * (scan.z_slices.len().max(1) as u64);

    let source_display = match &source {
        AlignerSource::Nd2 { path } | AlignerSource::Czi { path } => path.clone(),
        AlignerSource::Folder { path, .. } => path.clone(),
    };
    eprintln!(
        "source={source_display}\nworkspace={workspace_path}\npositions={}  T={} C={} Z={}  frames/position={frame_count}",
        positions.len(),
        scan.times.len().max(1),
        scan.channels.len().max(1),
        scan.z_slices.len().max(1),
    );

    let cancel = Arc::new(AtomicBool::new(false));
    let request = CropRoiRequest {
        request_id: format!("cli-crop-{}", std::process::id()),
        workspace_path,
        source,
        positions,
        overwrite,
        output_format: Some(CropOutputFormat::Tiff),
    };

    let monitor = monitor::ResourceMonitor::start();
    let started = Instant::now();
    let mut last_progress = None::<CropRoiProgress>;
    crop_roi(request, &cancel, |progress| {
        if matches!(progress.status, CropRoiStatus::Running)
            && (progress.completed_rois == 0
                || progress.completed_positions
                    != last_progress
                        .as_ref()
                        .map(|p| p.completed_positions)
                        .unwrap_or(0)
                || progress
                    .completed_rois
                    .is_multiple_of(progress.total_rois.max(1) / 20))
        {
            eprintln!(
                "  Pos{:?}  positions {}/{}  rois {}/{}",
                progress.position,
                progress.completed_positions,
                progress.total_positions,
                progress.completed_rois,
                progress.total_rois,
            );
        }
        last_progress = Some(progress);
    })?;

    let elapsed = started.elapsed();
    let resources = monitor.stop();
    let progress = last_progress.ok_or("crop finished without progress")?;
    if !matches!(progress.status, CropRoiStatus::Completed) {
        return Err(progress
            .error
            .unwrap_or_else(|| format!("crop ended with status {:?}", progress.status)));
    }

    let roi_pages = progress.total_rois as f64;
    eprintln!(
        "done in {:.2}s  ({:.1} roi-pages/s, {:.1} positions/s)",
        elapsed.as_secs_f64(),
        roi_pages / elapsed.as_secs_f64(),
        progress.total_positions as f64 / elapsed.as_secs_f64(),
    );
    monitor::print_summary(&resources, elapsed);
    Ok(())
}

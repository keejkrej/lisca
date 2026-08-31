//! Transfection analysis CLI. Stages dispatch into `lisca-transfection`
//! (git crate) so outputs stay aligned with the Python `transfection` package.
//!
//! `--backend onnx` uses the local Studio ONNX segmenter; Otsu and all
//! downstream stages come from the sidecar crate.
//!
//! ```text
//! cargo run -p lisca --bin lisca-analyze -- --help
//! cargo run -p lisca --release --bin lisca-analyze -- auc ~/data/TF84
//! cargo run -p lisca --release --bin lisca-analyze -- pipeline ~/data/TF84
//! ```
//!
//! Requires the `studio` feature (default). Config is `assay.json` only.

use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process;
use std::time::Instant;

use lisca::analysis::assays::transfection::{
    default_fit_jobs, default_jobs, default_timeseries_jobs, interval_minutes, max_onset_minutes,
    run_auc, run_fit, run_plot_auc, run_plot_fit, run_plot_timeseries, run_segment,
    run_sync_with_mode, run_timeseries_with_mode, skip_segment, SegmentBackend, SegmentOptions,
};
use lisca::analysis::slide::{load_mapping_for_workspace, resolve_assay_path};
use lisca::protocol::AssayJsonFile;

fn main() {
    if let Err(error) = run() {
        eprintln!("error: {error}");
        process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.is_empty() || matches!(args[0].as_str(), "-h" | "--help" | "help") {
        print_help();
        return Ok(());
    }

    let command = args[0].as_str();
    let rest = &args[1..];
    match command {
        "segment" => cmd_segment(rest),
        "timeseries" => cmd_timeseries(rest),
        "auc" => cmd_auc(rest),
        "fit" => cmd_fit(rest),
        "plot-timeseries" => cmd_plot_timeseries(rest),
        "plot-auc" => cmd_plot_auc(rest),
        "plot-fit" => cmd_plot_fit(rest),
        "pipeline" | "analyze" | "all" => cmd_pipeline(rest),
        other => Err(format!(
            "unknown command {other:?}\n\nRun `lisca-analyze --help` for usage."
        )),
    }
}

fn print_help() {
    eprintln!(
        "\
lisca-analyze — transfection stages (`lisca-transfection` git crate + local ONNX)

Usage:
  lisca-analyze <command> [options] <workspace>

Commands (same stage names as `transfection`):
  segment           Masks → mask/PosN/ (default Otsu; optional ONNX U-Net)
  timeseries        Intensity metrics → analysis/Pos{{n}}/ch{{n}}.csv
  auc               Trapezoidal AUC → analysis/Pos{{n}}/auc.csv
  fit               Two-exponential kinetic fit → analysis/Pos{{n}}/fit.csv
  plot-timeseries   Per-sample traces/area PNGs + xlsx under results/<sample>/
  plot-auc          Cross-sample AUC boxplot at results/auc.png
  plot-fit          Parameter boxplots at results/ + per-sample fit/scatter packs
  pipeline          Full Studio order from assay.json
                    (aliases: analyze, all)

Common options:
  --assay PATH            assay.json (default: <workspace>/assay.json)
  --interval MINUTES      frame interval (default: assay.json interval.value/unit)
  --max-onset-minutes N   fit onset search cap (default: assay analysis.maxOnsetMinutes
                          or 120; 0 = onset fixed at 0)
  (timeseries/pipeline whole-ROI mode is controlled by assay.json
   analysis.skipSegment, not a CLI flag)
  --variation-radius N    segment local-variation radius (default: 2)
  --gaussian-sigma F      segment Gaussian sigma (default: 1.0)
  --backend otsu|onnx     segment backend (default: otsu)
  --model-dir PATH        ONNX dir (LISCA_PATTERN_SEG_MODEL / HF pattern U-Net)
  --image-size N          ONNX input size (default: 128)
  --threshold F           ONNX sigmoid threshold (default: 0.5)
  --batch-size N          ONNX frame batch size (default: 32)
  --force, -f             segment: overwrite existing masks
  --columns N             plot grid columns (default: 3)

Parallel stages always use available CPU cores (no --jobs).

Examples:
  transfection auc ~/data/TF84
  lisca-analyze auc ~/data/TF84

  lisca-analyze pipeline ~/data/TF84
"
    );
}

fn cmd_segment(args: &[String]) -> Result<(), String> {
    reject_removed_jobs_flag(args)?;
    let workspace = require_workspace(args)?;
    let assay = flag_path(args, "--assay");
    let mapping = load_mapping_for_workspace(&workspace, assay.as_deref())?;
    let backend = match flag_value(args, "--backend") {
        Some(value) => SegmentBackend::parse(value)?,
        None => SegmentBackend::Otsu,
    };
    let options = SegmentOptions {
        variation_radius: flag_u32(args, "--variation-radius")?.unwrap_or(2),
        gaussian_sigma: flag_f64(args, "--gaussian-sigma")?.unwrap_or(1.0),
        force: has_flag(args, "--force") || has_flag(args, "-f"),
        jobs: default_jobs(),
        backend,
        model_dir: flag_path(args, "--model-dir"),
        image_size: flag_u32(args, "--image-size")?.unwrap_or(128),
        threshold: flag_f64(args, "--threshold")?.unwrap_or(0.5) as f32,
        batch_size: flag_usize(args, "--batch-size")?.unwrap_or(32),
    };
    if options.gaussian_sigma < 0.0 {
        return Err("--gaussian-sigma must be >= 0".to_string());
    }
    if options.image_size == 0 {
        return Err("--image-size must be > 0".to_string());
    }
    eprintln!(
        "segment workspace={} assay={} backend={:?} jobs={} force={}",
        workspace.display(),
        resolve_assay_path(&workspace, assay.as_deref()).display(),
        options.backend,
        options.jobs,
        options.force
    );
    timed("segment", || run_segment(&workspace, &mapping, &options))
}

fn cmd_timeseries(args: &[String]) -> Result<(), String> {
    reject_removed_jobs_flag(args)?;
    let workspace = require_workspace(args)?;
    let assay = flag_path(args, "--assay");
    let mapping = load_mapping_for_workspace(&workspace, assay.as_deref())?;
    let jobs = default_timeseries_jobs();
    let full_frame = load_assay_json(&workspace)
        .map(|assay| skip_segment(&assay))
        .unwrap_or(false);
    eprintln!(
        "timeseries workspace={} assay={} jobs={} full_frame={full_frame}",
        workspace.display(),
        resolve_assay_path(&workspace, assay.as_deref()).display(),
        jobs
    );
    timed("timeseries", || {
        run_timeseries_with_mode(&workspace, &mapping, jobs, full_frame)
    })
}

fn cmd_auc(args: &[String]) -> Result<(), String> {
    let workspace = require_workspace(args)?;
    let interval = resolve_interval(&workspace, args)?;
    eprintln!("auc workspace={} interval={interval}", workspace.display());
    timed("auc", || {
        run_auc(&workspace, interval)?;
        Ok(())
    })
}

fn cmd_fit(args: &[String]) -> Result<(), String> {
    reject_removed_jobs_flag(args)?;
    let workspace = require_workspace(args)?;
    let interval = resolve_interval(&workspace, args)?;
    let max_onset = resolve_max_onset(&workspace, args)?;
    let jobs = default_fit_jobs();
    eprintln!(
        "fit workspace={} interval={interval} max_onset_minutes={max_onset} jobs={jobs}",
        workspace.display()
    );
    timed("fit", || {
        run_fit(&workspace, interval, max_onset, jobs)?;
        Ok(())
    })
}

fn cmd_plot_timeseries(args: &[String]) -> Result<(), String> {
    let workspace = require_workspace_or_timeseries_dir(args)?;
    let assay = flag_path(args, "--assay");
    let mapping = load_mapping_for_workspace(&workspace, assay.as_deref())?;
    let interval = resolve_interval(&workspace, args)?;
    let columns = flag_usize(args, "--columns")?;
    if columns == Some(0) {
        return Err("--columns must be >= 1".to_string());
    }
    eprintln!(
        "plot-timeseries workspace={} interval={interval} columns={}",
        workspace.display(),
        columns
            .map(|value| value.to_string())
            .unwrap_or_else(|| "auto".to_string())
    );
    timed("plot-timeseries", || {
        run_plot_timeseries(&workspace, &mapping, interval, columns)
    })
}

fn cmd_plot_auc(args: &[String]) -> Result<(), String> {
    let workspace = require_workspace_or_results_parent(args, "auc.csv")?;
    let assay = flag_path(args, "--assay");
    let mapping = load_mapping_for_workspace(&workspace, assay.as_deref())?;
    eprintln!("plot-auc workspace={}", workspace.display());
    timed("plot-auc", || run_plot_auc(&workspace, &mapping))
}

fn cmd_plot_fit(args: &[String]) -> Result<(), String> {
    let workspace = require_workspace_or_results_parent(args, "fit.csv")?;
    let assay = flag_path(args, "--assay");
    let mapping = load_mapping_for_workspace(&workspace, assay.as_deref())?;
    let interval = resolve_interval(&workspace, args)?;
    let columns = flag_usize(args, "--columns")?;
    if columns == Some(0) {
        return Err("--columns must be >= 1".to_string());
    }
    eprintln!(
        "plot-fit workspace={} interval={interval} columns={}",
        workspace.display(),
        columns
            .map(|value| value.to_string())
            .unwrap_or_else(|| "auto".to_string())
    );
    timed("plot-fit", || {
        run_plot_fit(&workspace, &mapping, interval, columns)
    })
}

fn cmd_pipeline(args: &[String]) -> Result<(), String> {
    reject_removed_jobs_flag(args)?;
    let workspace = require_workspace(args)?;
    let assay = load_assay_json(&workspace)?;
    let interval = interval_minutes(&assay)?;
    let max_onset = max_onset_minutes(&assay);
    let full_frame = skip_segment(&assay);
    eprintln!(
        "pipeline workspace={} assayType={:?} interval={interval} max_onset_minutes={max_onset} full_frame={full_frame}",
        workspace.display(),
        assay.type_
    );
    timed("pipeline", || {
        run_sync_with_mode(&workspace, &assay, full_frame)
    })
}

fn timed(label: &str, work: impl FnOnce() -> Result<(), String>) -> Result<(), String> {
    let started = Instant::now();
    work()?;
    eprintln!("{label} done in {:.2}s", started.elapsed().as_secs_f64());
    Ok(())
}

fn reject_removed_jobs_flag(args: &[String]) -> Result<(), String> {
    if has_flag(args, "--jobs") || args.iter().any(|arg| arg.starts_with("--jobs=")) {
        return Err(
            "--jobs was removed; parallel stages always use available CPU cores".to_string(),
        );
    }
    Ok(())
}

fn require_workspace(args: &[String]) -> Result<PathBuf, String> {
    let path = first_positional(args).ok_or_else(|| {
        "missing WORKSPACE path (directory with assay.json / roi/ / analysis/)".to_string()
    })?;
    let path = PathBuf::from(path);
    if !path.is_dir() {
        return Err(format!("workspace is not a directory: {}", path.display()));
    }
    Ok(path)
}

/// Accept either `<workspace>` or `<workspace>/analysis` (sidecar plot-timeseries shape).
fn require_workspace_or_timeseries_dir(args: &[String]) -> Result<PathBuf, String> {
    let path = require_workspace(args)?;
    let dir_name = path.file_name().and_then(|n| n.to_str());
    if matches!(dir_name, Some("analysis") | Some("timeseries")) {
        return path
            .parent()
            .map(Path::to_path_buf)
            .ok_or_else(|| "analysis path has no parent workspace".to_string());
    }
    Ok(path)
}

/// Accept a workspace directory or an analysis/results CSV path.
fn require_workspace_or_results_parent(
    args: &[String],
    file_name: &str,
) -> Result<PathBuf, String> {
    let raw = first_positional(args)
        .ok_or_else(|| format!("missing WORKSPACE or analysis/PosN/{file_name} path"))?;
    let path = PathBuf::from(raw);
    if path.is_file() {
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default();
        if name != file_name {
            return Err(format!("expected {file_name}, got {}", path.display()));
        }
        // analysis/PosN/auc.csv → workspace, or legacy results/auc.csv → workspace
        let parent = path
            .parent()
            .ok_or_else(|| format!("{} has no parent", path.display()))?;
        let grandparent = parent
            .parent()
            .ok_or_else(|| format!("{} has no workspace parent", path.display()))?;
        if parent
            .file_name()
            .and_then(|n| n.to_str())
            .is_some_and(|n| n.starts_with("Pos"))
        {
            return grandparent
                .parent()
                .map(Path::to_path_buf)
                .ok_or_else(|| format!("{} has no workspace parent", path.display()));
        }
        return Ok(grandparent.to_path_buf());
    }
    if !path.is_dir() {
        return Err(format!(
            "path is not a directory or file: {}",
            path.display()
        ));
    }
    Ok(path)
}

fn resolve_interval(workspace: &Path, args: &[String]) -> Result<f64, String> {
    if let Some(value) = flag_f64(args, "--interval")? {
        if value <= 0.0 {
            return Err("--interval must be > 0".to_string());
        }
        return Ok(value);
    }
    let assay = load_assay_json(workspace)?;
    // Transfection assay defaults to 10 min when interval.value is missing.
    interval_minutes(&assay)
}

fn resolve_max_onset(workspace: &Path, args: &[String]) -> Result<f64, String> {
    if let Some(value) = flag_f64(args, "--max-onset-minutes")? {
        if value < 0.0 {
            return Err("--max-onset-minutes must be >= 0".to_string());
        }
        return Ok(value);
    }
    let assay = load_assay_json(workspace)?;
    Ok(max_onset_minutes(&assay))
}

fn load_assay_json(workspace: &Path) -> Result<AssayJsonFile, String> {
    let path = workspace.join("assay.json");
    let contents = fs::read_to_string(&path)
        .map_err(|error| format!("failed to read {}: {error}", path.display()))?;
    serde_json::from_str(&contents)
        .map_err(|error| format!("invalid assay.json {}: {error}", path.display()))
}

fn first_positional(args: &[String]) -> Option<&str> {
    let mut i = 0;
    while i < args.len() {
        let arg = args[i].as_str();
        if arg == "--" {
            return args.get(i + 1).map(String::as_str);
        }
        if arg.starts_with('-') {
            if arg.contains('=') {
                i += 1;
                continue;
            }
            // boolean flags without values
            if matches!(arg, "-f" | "--force" | "-h" | "--help") {
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

fn has_flag(args: &[String], name: &str) -> bool {
    args.iter().any(|arg| arg == name)
}

fn flag_path(args: &[String], name: &str) -> Option<PathBuf> {
    flag_value(args, name).map(PathBuf::from)
}

fn flag_value<'a>(args: &'a [String], name: &str) -> Option<&'a str> {
    let mut i = 0;
    while i < args.len() {
        let arg = args[i].as_str();
        if let Some(rest) = arg.strip_prefix(&format!("{name}=")) {
            return Some(rest);
        }
        if arg == name {
            return args.get(i + 1).map(String::as_str);
        }
        i += 1;
    }
    None
}

fn flag_f64(args: &[String], name: &str) -> Result<Option<f64>, String> {
    match flag_value(args, name) {
        None => Ok(None),
        Some(raw) => raw
            .parse::<f64>()
            .map(Some)
            .map_err(|_| format!("invalid {name} value: {raw}")),
    }
}

fn flag_u32(args: &[String], name: &str) -> Result<Option<u32>, String> {
    match flag_value(args, name) {
        None => Ok(None),
        Some(raw) => raw
            .parse::<u32>()
            .map(Some)
            .map_err(|_| format!("invalid {name} value: {raw}")),
    }
}

fn flag_usize(args: &[String], name: &str) -> Result<Option<usize>, String> {
    match flag_value(args, name) {
        None => Ok(None),
        Some(raw) => raw
            .parse::<usize>()
            .map(Some)
            .map_err(|_| format!("invalid {name} value: {raw}")),
    }
}

//! Transfection analysis CLI for parity with the Python `transfection` package.
//!
//! Stage commands mirror `transfection segment|timeseries|auc|fit|plot-*|pipeline`
//! so the same workspace can be driven from either tool and outputs compared.
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

use lisca::analysis::assays::gene_expression::{
    default_fit_jobs, default_timeseries_jobs, run_auc, run_fit, run_plot_auc, run_plot_fit,
    run_plot_timeseries, run_segment, run_sync, run_timeseries, SegmentOptions,
    DEFAULT_PLOT_COLUMNS,
};
use lisca::analysis::slide::{
    load_mapping_for_workspace, parse_interval_minutes, resolve_assay_path,
};
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
lisca-analyze — transfection stages (Rust parity with `transfection` CLI)

Usage:
  lisca-analyze <command> [options] <workspace>

Commands (same stage names as `transfection`):
  segment           Otsu masks → mask/PosN/
  timeseries        Mask-corrected intensity → timeseries/sc*_ch*.csv
  auc               Trapezoidal AUC → results/auc.csv
  fit               Two-exponential kinetic fit → results/fit.csv
  plot-timeseries   Trace / area PNGs under results/
  plot-auc          AUC boxplots (linear + log)
  plot-fit          Fit parameter boxplots + traces_fit.png
  pipeline          Full Studio order from assay.json
                    (aliases: analyze, all)

Common options:
  --assay PATH            assay.json (default: <workspace>/assay.json)
  --interval MINUTES      frame interval (default: assay.json info2.timelapse*)
  --jobs N                worker threads (segment/timeseries/fit; default: CPUs)
  --max-onset-minutes N   fit onset search cap (default: assay analysis.maxOnsetMinutes or 0)
  --variation-radius N    segment local-variation radius (default: 2)
  --gaussian-sigma F      segment Gaussian sigma (default: 1.0)
  --force, -f             segment: overwrite existing masks
  --columns N             plot grid columns (default: 3)

Examples:
  transfection auc ~/data/TF84
  lisca-analyze auc ~/data/TF84

  lisca-analyze pipeline ~/data/TF84
"
    );
}

fn cmd_segment(args: &[String]) -> Result<(), String> {
    let workspace = require_workspace(args)?;
    let assay = flag_path(args, "--assay");
    let mapping = load_mapping_for_workspace(&workspace, assay.as_deref())?;
    let options = SegmentOptions {
        variation_radius: flag_u32(args, "--variation-radius")?.unwrap_or(2),
        gaussian_sigma: flag_f64(args, "--gaussian-sigma")?.unwrap_or(1.0),
        force: has_flag(args, "--force") || has_flag(args, "-f"),
        jobs: flag_usize(args, "--jobs")?.unwrap_or_else(default_timeseries_jobs),
    };
    if options.gaussian_sigma < 0.0 {
        return Err("--gaussian-sigma must be >= 0".to_string());
    }
    eprintln!(
        "segment workspace={} assay={} jobs={} force={}",
        workspace.display(),
        resolve_assay_path(&workspace, assay.as_deref()).display(),
        options.jobs,
        options.force
    );
    timed("segment", || run_segment(&workspace, &mapping, &options))
}

fn cmd_timeseries(args: &[String]) -> Result<(), String> {
    let workspace = require_workspace(args)?;
    let assay = flag_path(args, "--assay");
    let mapping = load_mapping_for_workspace(&workspace, assay.as_deref())?;
    let jobs = flag_usize(args, "--jobs")?.unwrap_or_else(default_timeseries_jobs);
    eprintln!(
        "timeseries workspace={} assay={} jobs={}",
        workspace.display(),
        resolve_assay_path(&workspace, assay.as_deref()).display(),
        jobs
    );
    timed("timeseries", || run_timeseries(&workspace, &mapping, jobs))
}

fn cmd_auc(args: &[String]) -> Result<(), String> {
    let workspace = require_workspace(args)?;
    let interval = resolve_interval(&workspace, args)?;
    eprintln!(
        "auc workspace={} interval={interval}",
        workspace.display()
    );
    timed("auc", || {
        run_auc(&workspace, interval)?;
        Ok(())
    })
}

fn cmd_fit(args: &[String]) -> Result<(), String> {
    let workspace = require_workspace(args)?;
    let interval = resolve_interval(&workspace, args)?;
    let max_onset = resolve_max_onset(&workspace, args)?;
    let jobs = flag_usize(args, "--jobs")?.unwrap_or_else(default_fit_jobs);
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
    let columns = flag_usize(args, "--columns")?.unwrap_or(DEFAULT_PLOT_COLUMNS);
    if columns == 0 {
        return Err("--columns must be >= 1".to_string());
    }
    eprintln!(
        "plot-timeseries workspace={} interval={interval} columns={columns}",
        workspace.display()
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
    let columns = flag_usize(args, "--columns")?.unwrap_or(DEFAULT_PLOT_COLUMNS);
    if columns == 0 {
        return Err("--columns must be >= 1".to_string());
    }
    eprintln!(
        "plot-fit workspace={} interval={interval} columns={columns}",
        workspace.display()
    );
    timed("plot-fit", || {
        run_plot_fit(&workspace, &mapping, interval, columns)
    })
}

fn cmd_pipeline(args: &[String]) -> Result<(), String> {
    let workspace = require_workspace(args)?;
    let assay = load_assay_json(&workspace)?;
    let interval = parse_interval_minutes(
        assay.info2.timelapse_amount,
        Some(assay.info2.timelapse_unit.as_str()),
    )
    .ok_or_else(|| "invalid timelapseAmount/timelapseUnit in assay.json".to_string())?;
    let max_onset = assay
        .analysis
        .as_ref()
        .and_then(|analysis| analysis.max_onset_minutes)
        .unwrap_or(0.0);
    eprintln!(
        "pipeline workspace={} assayId={:?} interval={interval} max_onset_minutes={max_onset}",
        workspace.display(),
        assay.assay_id
    );
    timed("pipeline", || run_sync(&workspace, &assay))
}

fn timed(label: &str, work: impl FnOnce() -> Result<(), String>) -> Result<(), String> {
    let started = Instant::now();
    work()?;
    eprintln!("{label} done in {:.2}s", started.elapsed().as_secs_f64());
    Ok(())
}

fn require_workspace(args: &[String]) -> Result<PathBuf, String> {
    let path = first_positional(args).ok_or_else(|| {
        "missing WORKSPACE path (directory with assay.json / roi/ / timeseries/)".to_string()
    })?;
    let path = PathBuf::from(path);
    if !path.is_dir() {
        return Err(format!("workspace is not a directory: {}", path.display()));
    }
    Ok(path)
}

/// Accept either `<workspace>` or `<workspace>/timeseries` (transfection plot-timeseries shape).
fn require_workspace_or_timeseries_dir(args: &[String]) -> Result<PathBuf, String> {
    let path = require_workspace(args)?;
    if path.file_name().and_then(|n| n.to_str()) == Some("timeseries") {
        return path
            .parent()
            .map(Path::to_path_buf)
            .ok_or_else(|| "timeseries path has no parent workspace".to_string());
    }
    if path.join("timeseries").is_dir() || path.join("assay.json").is_file() {
        return Ok(path);
    }
    Ok(path)
}

/// Accept either `<workspace>` or `<workspace>/results/auc.csv` / `fit.csv`.
fn require_workspace_or_results_parent(args: &[String], file_name: &str) -> Result<PathBuf, String> {
    let raw = first_positional(args).ok_or_else(|| {
        format!("missing WORKSPACE or results/{file_name} path")
    })?;
    let path = PathBuf::from(raw);
    if path.is_file() {
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default();
        if name != file_name {
            return Err(format!(
                "expected {file_name}, got {}",
                path.display()
            ));
        }
        let results = path
            .parent()
            .ok_or_else(|| format!("{} has no parent", path.display()))?;
        let workspace = results
            .parent()
            .ok_or_else(|| format!("{} has no workspace parent", path.display()))?;
        return Ok(workspace.to_path_buf());
    }
    if !path.is_dir() {
        return Err(format!("path is not a directory or file: {}", path.display()));
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
    parse_interval_minutes(
        assay.info2.timelapse_amount,
        Some(assay.info2.timelapse_unit.as_str()),
    )
    .ok_or_else(|| {
        "missing --interval and could not read a positive timelapseAmount from assay.json"
            .to_string()
    })
}

fn resolve_max_onset(workspace: &Path, args: &[String]) -> Result<f64, String> {
    if let Some(value) = flag_f64(args, "--max-onset-minutes")? {
        if value < 0.0 {
            return Err("--max-onset-minutes must be >= 0".to_string());
        }
        return Ok(value);
    }
    let assay = load_assay_json(workspace)?;
    Ok(assay
        .analysis
        .as_ref()
        .and_then(|analysis| analysis.max_onset_minutes)
        .unwrap_or(0.0))
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

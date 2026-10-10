//! Assay analysis CLI. Transfection stages dispatch into `lisca-transfection`.
//! `killing` and `killing-engagement` dispatch into the killing assay and take
//! a workspace path only.
//!
//! `--backend onnx` uses the local Studio ONNX segmenter; Otsu and all
//! downstream transfection stages come from the sidecar crate.
//!
//! ```text
//! cargo run -p lisca --bin lisca-analyze -- --help
//! cargo run -p lisca --release --bin lisca-analyze -- auc ~/data/TF84
//! cargo run -p lisca --release --bin lisca-analyze -- pipeline ~/data/TF84
//! cargo run -p lisca --bin lisca-analyze -- killing ~/data/killing_pi
//! cargo run -p lisca --bin lisca-analyze -- killing-engagement ~/data/killing_tcell
//! ```
//!
//! Requires the `studio` feature (default). Config is `assay.json` only.

use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process;
use std::time::Instant;

use lisca::analysis::assays::killing;
use lisca::analysis::assays::killing_engagement;
use lisca::analysis::assays::transfection::{
    default_fit_jobs, default_jobs, default_traces_jobs, interval_minutes, max_onset_minutes,
    publish_sample_tables_xlsx, publish_sample_traces_xlsx, run_auc, run_fit, run_plot_auc,
    run_plot_fit, run_plot_traces, run_segment, run_sync_with_mode, run_traces_with_mode,
    skip_segment, SegmentBackend, SegmentOptions,
};
use lisca::analysis::sample::{
    build_sample_mapping, load_mapping_for_workspace, parse_interval_minutes, resolve_assay_path,
};
use lisca::protocol::{AssayJsonFile, AssayType};

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
        "traces" => cmd_traces(rest),
        "auc" => cmd_auc(rest),
        "fit" => cmd_fit(rest),
        "plot-traces" => cmd_plot_traces(rest),
        "plot-auc" => cmd_plot_auc(rest),
        "plot-fit" => cmd_plot_fit(rest),
        "pipeline" | "analyze" | "all" => cmd_pipeline(rest),
        "killing" => cmd_killing(rest),
        "killing-engagement" => cmd_killing_engagement(rest),
        other => Err(format!(
            "unknown command {other:?}\n\nRun `lisca-analyze --help` for usage."
        )),
    }
}

fn print_help() {
    eprintln!(
        "\
lisca-analyze — assay CLI
  segment | traces | auc | fit | plot-traces | plot-auc | plot-fit | pipeline
  killing <workspace>
  killing-engagement <workspace>

Transfection stages call `lisca-transfection`. `killing` and `killing-engagement`
call the killing dispatch and take a workspace path only. This binary does not
run the classifier and has no `fluorescence`, `clean`, or `predict` command.

Usage:
  lisca-analyze <command> [options] <workspace>
  lisca-analyze killing <workspace>
  lisca-analyze killing-engagement <workspace>

Commands (transfection stage names):
  segment           Masks → mask/PosN/ (default Otsu; optional ONNX U-Net)
  traces            Intensity traces → analysis/Pos{{n}}/ch{{n}}.csv
  auc               Trapezoidal AUC → analysis/Pos{{n}}/auc.csv
  fit               Two-exponential kinetic fit → analysis/Pos{{n}}/fit.csv
  plot-traces       Per-sample traces/area PNGs + xlsx under results/<sample>/
  plot-auc          Cross-sample AUC boxplot at results/auc.png
  plot-fit          Parameter boxplots at results/ + per-sample fit/scatter packs
  pipeline          Full Studio order from assay.json
                    (aliases: analyze, all)

  killing           Killing (death reporter): fluorescence CSVs, traces.xlsx,
                    traces.png, traces_shared_y.png, traces_summary.png,
                    traces_summary_shared_y.png
  killing-engagement
                    Killing (engagement): engagement.csv, engagement_summary.csv,
                    the engagement workbooks, engagement_traces.png,
                    engagement_traces_shared_y.png, engagement_traces_summary.png,
                    engagement_traces_summary_shared_y.png

Transfection stage options (not accepted by killing or killing-engagement):
  --assay PATH            assay.json (default: <workspace>/assay.json)
  --interval MINUTES      frame interval (default: assay.json interval.value/unit)
  --max-onset-minutes N   fit onset time t0 search cap (default: assay analysis.maxOnsetMinutes
                          or 120; 0 = onset time t0 fixed at 0)
  (traces/pipeline whole-ROI mode is controlled by assay.json
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
  lisca-analyze auc ~/data/TF84
  lisca-analyze pipeline ~/data/TF84
  lisca-analyze killing ~/data/killing_pi
  lisca-analyze killing-engagement ~/data/killing_tcell
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

fn cmd_traces(args: &[String]) -> Result<(), String> {
    reject_removed_jobs_flag(args)?;
    let workspace = require_workspace(args)?;
    let assay = flag_path(args, "--assay");
    let mapping = load_mapping_for_workspace(&workspace, assay.as_deref())?;
    let jobs = default_traces_jobs();
    let full_frame = load_assay_json(&workspace)
        .map(|assay| skip_segment(&assay))
        .unwrap_or(false);
    eprintln!(
        "traces workspace={} assay={} jobs={} full_frame={full_frame}",
        workspace.display(),
        resolve_assay_path(&workspace, assay.as_deref()).display(),
        jobs
    );
    timed("traces", || {
        run_traces_with_mode(&workspace, &mapping, jobs, full_frame)
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

fn cmd_plot_traces(args: &[String]) -> Result<(), String> {
    let workspace = require_workspace_or_analysis_dir(args)?;
    let assay = flag_path(args, "--assay");
    let mapping = load_mapping_for_workspace(&workspace, assay.as_deref())?;
    let interval = resolve_interval(&workspace, args)?;
    let columns = flag_usize(args, "--columns")?;
    if columns == Some(0) {
        return Err("--columns must be >= 1".to_string());
    }
    eprintln!(
        "plot-traces workspace={} interval={interval} columns={}",
        workspace.display(),
        columns
            .map(|value| value.to_string())
            .unwrap_or_else(|| "auto".to_string())
    );
    timed("plot-traces", || {
        publish_sample_traces_xlsx(&workspace, &mapping)?;
        run_plot_traces(&workspace, &mapping, interval, columns)
    })
}

fn cmd_plot_auc(args: &[String]) -> Result<(), String> {
    let workspace = require_workspace_or_results_parent(args, "auc.csv")?;
    migrate_workspace(&workspace)?;
    let assay = flag_path(args, "--assay");
    let mapping = load_mapping_for_workspace(&workspace, assay.as_deref())?;
    eprintln!("plot-auc workspace={}", workspace.display());
    timed("plot-auc", || {
        publish_sample_tables_xlsx(&workspace, &mapping, "auc")?;
        run_plot_auc(&workspace, &mapping)
    })
}

fn cmd_plot_fit(args: &[String]) -> Result<(), String> {
    let workspace = require_workspace_or_results_parent(args, "fit.csv")?;
    migrate_workspace(&workspace)?;
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
        publish_sample_tables_xlsx(&workspace, &mapping, "fit")?;
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

fn cmd_killing(args: &[String]) -> Result<(), String> {
    let workspace = killing_workspace(args, "killing")?;
    let assay = load_assay_json(&workspace)?;
    if assay.type_ != AssayType::Killing {
        return Err(format!(
            "lisca-analyze killing requires assay.json type killing, found {}",
            assay.type_
        ));
    }
    timed("killing", || killing::run_sync(&workspace, &assay))
}

fn cmd_killing_engagement(args: &[String]) -> Result<(), String> {
    let workspace = killing_workspace(args, "killing-engagement")?;
    let assay = load_assay_json(&workspace)?;
    if assay.type_ != AssayType::KillingEngagement {
        return Err(format!(
            "lisca-analyze killing-engagement requires assay.json type killing-engagement, found {}",
            assay.type_
        ));
    }
    let interval = parse_interval_minutes(assay.interval.value, Some(assay.interval.unit.as_str()))
        .ok_or_else(|| "invalid interval.value/unit in assay.json".to_string())?;
    let mapping = build_sample_mapping(&assay)?;
    timed("killing-engagement", || {
        for position in mapping.positions() {
            killing_engagement::run_position(&workspace, &mapping, position, interval)?;
        }
        killing_engagement::run_plot_traces(&workspace, &mapping, interval)?;
        killing_engagement::write_summary(&workspace, &mapping)?;
        Ok(())
    })
}

/// One workspace directory and no flags. A dashed argument is an error before
/// the workspace is read, because `first_positional` would skip it.
fn killing_workspace(args: &[String], command: &str) -> Result<PathBuf, String> {
    if args.iter().any(|arg| arg.starts_with('-')) || args.len() != 1 {
        return Err(format!("{command} takes only a workspace path"));
    }
    let path = PathBuf::from(&args[0]);
    if !path.is_dir() {
        return Err(format!("workspace is not a directory: {}", path.display()));
    }
    migrate_workspace(&path)?;
    Ok(path)
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
    migrate_workspace(&path)?;
    Ok(path)
}

/// Rewrite old on-disk names (e.g. `assay.json` samples by slide channel)
/// before any stage reads the workspace.
fn migrate_workspace(workspace: &Path) -> Result<(), String> {
    lisca::migrations::migrate_workspace(workspace).map(|_| ())
}

/// Accept either `<workspace>` or `<workspace>/analysis` (sidecar plot-traces shape).
fn require_workspace_or_analysis_dir(args: &[String]) -> Result<PathBuf, String> {
    let path = require_workspace(args)?;
    let dir_name = path.file_name().and_then(|n| n.to_str());
    if dir_name == Some("analysis") {
        let workspace = path
            .parent()
            .map(Path::to_path_buf)
            .ok_or_else(|| "analysis path has no parent workspace".to_string())?;
        migrate_workspace(&workspace)?;
        return Ok(workspace);
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

#[cfg(test)]
mod tests {
    use super::*;

    fn assay_json(assay_type: &str, interval_value: &str) -> String {
        format!(
            r#"{{
                "type": "{assay_type}",
                "name": "cli",
                "workspace": {{ "path": "" }},
                "data": {{ "type": "folder", "path": "", "template": {{ "subfolder": "", "filename": "" }} }},
                "interval": {{ "value": {interval_value}, "unit": "minute" }},
                "samples": [{{ "name": "tcells", "positions": "1" }}],
                "analysis": {{ "channels": {{ "segmentation": 0, "signal": [1] }} }}
            }}"#
        )
    }

    fn write_assay(root: &Path, assay_type: &str, interval_value: &str) {
        fs::write(
            root.join("assay.json"),
            assay_json(assay_type, interval_value),
        )
        .unwrap();
    }

    #[test]
    fn wrong_assay_type_writes_nothing() {
        let killing_on_transfection = tempfile::tempdir().unwrap();
        let root = killing_on_transfection.path();
        write_assay(root, "transfection", "2.75");
        let error = cmd_killing(&[root.display().to_string()]).unwrap_err();
        assert_eq!(
            error,
            "lisca-analyze killing requires assay.json type killing, found transfection"
        );
        assert!(!root.join("analysis").exists());
        assert!(!root.join("results").exists());

        let engagement_on_killing = tempfile::tempdir().unwrap();
        let root = engagement_on_killing.path();
        write_assay(root, "killing", "2.75");
        let error = cmd_killing_engagement(&[root.display().to_string()]).unwrap_err();
        assert_eq!(
            error,
            "lisca-analyze killing-engagement requires assay.json type killing-engagement, found killing"
        );
        assert!(!root.join("analysis").exists());
        assert!(!root.join("results").exists());
    }

    #[test]
    fn missing_or_non_positive_interval_writes_nothing() {
        let missing = tempfile::tempdir().unwrap();
        let root = missing.path();
        write_assay(root, "killing", "null");
        let error = cmd_killing(&[root.display().to_string()]).unwrap_err();
        assert_eq!(error, "invalid interval.value/unit in assay.json");
        assert!(!root.join("analysis").exists());

        let non_positive = tempfile::tempdir().unwrap();
        let root = non_positive.path();
        write_assay(root, "killing-engagement", "0");
        let error = cmd_killing_engagement(&[root.display().to_string()]).unwrap_err();
        assert_eq!(error, "invalid interval.value/unit in assay.json");
        assert!(!root.join("analysis").exists());
    }

    #[test]
    fn dashed_arguments_are_rejected_before_the_workspace_is_read() {
        assert_eq!(
            cmd_killing(&["--interval".into(), "10".into()]).unwrap_err(),
            "killing takes only a workspace path"
        );
        assert_eq!(
            cmd_killing(&["--interval=10".into()]).unwrap_err(),
            "killing takes only a workspace path"
        );
        assert_eq!(
            cmd_killing_engagement(&["--assay".into(), "/tmp/other.json".into(), "/tmp/ws".into()])
                .unwrap_err(),
            "killing-engagement takes only a workspace path"
        );
        assert_eq!(
            cmd_killing_engagement(&["-f".into(), "/tmp/ws".into()]).unwrap_err(),
            "killing-engagement takes only a workspace path"
        );
    }

    fn write_pages(path: &Path, pages: &[Vec<u8>]) {
        let file = fs::File::create(path).expect("create tiff");
        let mut encoder = tiff::encoder::TiffEncoder::new(file).expect("encoder");
        for page in pages {
            let image = encoder
                .new_image::<tiff::encoder::colortype::Gray8>(2, 2)
                .expect("gray image");
            image.write_data(page).expect("write page");
        }
    }

    /// TCZYX: channel 0 then channel 1 at each time. Engagement reads channel 0
    /// as the tumor mask and channel 1 as the engager signal.
    fn write_engagement_position(workspace: &Path) {
        let pos_dir = workspace.join("roi/Pos1");
        fs::create_dir_all(&pos_dir).unwrap();
        write_pages(
            &pos_dir.join("Roi0.tif"),
            &[
                vec![255; 4],
                vec![1, 2, 3, 40],
                vec![255; 4],
                vec![10, 10, 10, 10],
            ],
        );
        let index = serde_json::json!({
            "position": 1,
            "axisOrder": "TCZYX",
            "channelCount": 2,
            "timeCount": 2,
            "zCount": 1,
            "rois": [{
                "roi": 0,
                "fileName": "Roi0.tif",
                "bbox": { "roi": 0, "x": 0, "y": 0, "w": 2, "h": 2 }
            }]
        });
        fs::write(
            pos_dir.join("index.json"),
            serde_json::to_string(&index).unwrap(),
        )
        .unwrap();
    }

    #[test]
    fn killing_engagement_writes_the_trace_png_and_the_summary_csv() {
        let workspace = tempfile::tempdir().unwrap();
        let root = workspace.path();
        write_assay(root, "killing-engagement", "2.75");
        write_engagement_position(root);

        cmd_killing_engagement(&[root.display().to_string()]).unwrap();

        assert!(root.join("results/tcells/engagement_traces.png").is_file());
        assert!(root.join("analysis/Pos1/engagement_summary.csv").is_file());
    }
}

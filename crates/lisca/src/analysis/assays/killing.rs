mod clean;
mod plot;
mod predict;

use std::path::{Path, PathBuf};
use std::{collections::BTreeMap, fs};

use crate::protocol::{AnalysisCsvFile, AnalysisProgress, AnalysisStage, AssayJsonFile};

use crate::analysis::output::collect_csv_outputs;
use crate::analysis::progress::{analysis_progress, run_blocking};
use crate::analysis::slide::{build_slide_mapping, parse_interval_minutes};

pub fn resolve_model_path(workspace: &Path) -> Result<PathBuf, String> {
    // Killing-assay brain (HF keejkrej/killing-assay-resnet18). This repo
    // curls the ONNX at Studio package time; do not grow a third weights tree.
    let mut candidates = vec![
        workspace.join("models/killing-assay-resnet18"),
        crate::onnx::workspace_models_dir().join("killing-assay-resnet18"),
        PathBuf::from("models/killing-assay-resnet18"),
    ];
    candidates.extend(
        crate::onnx::bundled_models_dirs()
            .into_iter()
            .map(|dir| dir.join("killing-assay-resnet18")),
    );
    crate::onnx::resolve_model_path("LISCA_KILL_MODEL", candidates)
}

pub fn run_sync(workspace: &Path, assay_json: &AssayJsonFile) -> Result<(), String> {
    let interval = parse_interval_minutes(
        assay_json.interval.value,
        Some(assay_json.interval.unit.as_str()),
    )
    .ok_or_else(|| "invalid interval.value/unit in assay.json".to_string())?;

    let mapping = build_slide_mapping(assay_json)?;

    let model_dir = resolve_model_path(workspace)?;
    predict::run_predict(
        workspace,
        &mapping,
        &model_dir,
        predict::PredictOptions::default(),
    )?;
    plot::run_plot_timeseries(workspace, &mapping, interval, None)?;
    clean::run_clean(workspace, &mapping)?;
    plot::run_plot_kill(workspace, &mapping, interval)?;
    plot::run_plot_death_times(workspace, &mapping, interval)?;
    Ok(())
}

pub fn run_predict_shard(
    workspace: &Path,
    output_workspace: &Path,
    mapping: &crate::analysis::slide::SlideMapping,
    model_dir: &Path,
) -> Result<(), String> {
    predict::run_predict_to(
        workspace,
        output_workspace,
        mapping,
        model_dir,
        predict::PredictOptions::default(),
    )
}

pub fn merge_prediction_shards(workspace: &Path, shards: &[PathBuf]) -> Result<(), String> {
    let mut files = BTreeMap::<PathBuf, Vec<PathBuf>>::new();
    for shard in shards {
        for relative_dir in ["timeseries", "results"] {
            let directory = shard.join(relative_dir);
            // Recursively walk the shard subdirectory and key merged files by
            // their path relative to the shard root, so nested
            // `timeseries/Pos{N}/ch{M}.csv` leaves survive the merge. A flat
            // walk would treat the `Pos{N}/` directories as non-files and
            // silently drop every timeseries CSV in the sharded pipeline.
            collect_shard_files(&directory, shard, &mut files)?;
        }
    }
    for (relative, parts) in files {
        let target = workspace.join(relative);
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        let mut merged = String::new();
        for (index, part) in parts.iter().enumerate() {
            let contents = fs::read_to_string(part)
                .map_err(|error| format!("failed to read {}: {error}", part.display()))?;
            let mut lines = contents.lines();
            let header = lines
                .next()
                .ok_or_else(|| format!("prediction shard is empty: {}", part.display()))?;
            if index == 0 {
                merged.push_str(header);
                merged.push('\n');
            }
            for line in lines {
                if !line.trim().is_empty() {
                    merged.push_str(line);
                    merged.push('\n');
                }
            }
        }
        let staging = target.with_extension("analysis-stage");
        fs::write(&staging, merged).map_err(|error| error.to_string())?;
        fs::rename(&staging, &target).map_err(|error| error.to_string())?;
    }
    Ok(())
}

/// Recursively collect every `.csv` file under `directory` into `files`,
/// keying by the path relative to `shard` so nested
/// `timeseries/Pos{N}/ch{M}.csv` leaves keep their relative path. A missing
/// directory is treated as "no files for this shard subtree".
///
/// Only `.csv` files are collected because the merge concatenates with
/// line-based header dedup — a CSV-only operation. `write_csv`
/// (`analysis::csv_io`) emits a binary `.xlsx` sidecar next to every CSV
/// (`results/predictions.xlsx`, `timeseries/Pos{N}/ch{M}.xlsx`); reading
/// those as UTF-8 text would crash the merge, and the merge cannot
/// meaningfully concatenate binary workbooks. The xlsx is not a collected
/// deliverable (`collect_csv_outputs` only gathers `.csv`), and downstream
/// stages read the `.csv`, so skipping non-CSV sidecars is safe.
fn collect_shard_files(
    directory: &Path,
    shard: &Path,
    files: &mut BTreeMap<PathBuf, Vec<PathBuf>>,
) -> Result<(), String> {
    let entries = match fs::read_dir(directory) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(format!("failed to list {}: {error}", directory.display())),
    };
    for entry in entries {
        let entry = entry.map_err(|error| {
            format!(
                "failed to read an entry in {}: {error}",
                directory.display()
            )
        })?;
        let path = entry.path();
        if path.is_dir() {
            collect_shard_files(&path, shard, files)?;
        } else if path.is_file() && path.extension().is_some_and(|ext| ext == "csv") {
            let relative = path
                .strip_prefix(shard)
                .map_err(|error| error.to_string())?;
            files.entry(relative.to_path_buf()).or_default().push(path);
        }
    }
    Ok(())
}

pub fn run_plot_timeseries_stage(
    workspace: &Path,
    mapping: &crate::analysis::slide::SlideMapping,
    interval: f64,
) -> Result<(), String> {
    plot::run_plot_timeseries(workspace, mapping, interval, None)
}

pub fn run_clean_stage(
    workspace: &Path,
    mapping: &crate::analysis::slide::SlideMapping,
) -> Result<(), String> {
    clean::run_clean(workspace, mapping)
}

pub fn run_plot_kill_stage(
    workspace: &Path,
    mapping: &crate::analysis::slide::SlideMapping,
    interval: f64,
) -> Result<(), String> {
    plot::run_plot_kill(workspace, mapping, interval)
}

pub fn run_plot_death_times_stage(
    workspace: &Path,
    mapping: &crate::analysis::slide::SlideMapping,
    interval: f64,
) -> Result<(), String> {
    plot::run_plot_death_times(workspace, mapping, interval)
}

pub async fn run<F>(
    workspace_path: PathBuf,
    request_id: String,
    assay_json: AssayJsonFile,
    update_progress: F,
) -> Result<Vec<AnalysisCsvFile>, String>
where
    F: Fn(AnalysisProgress) + Send + Sync + 'static,
{
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Preparing,
        5.0,
        "Preparing killing analysis",
    ));

    let kill_workspace = workspace_path.clone();
    let kill_assay = assay_json.clone();
    run_blocking(move || run_sync(&kill_workspace, &kill_assay))
        .await
        .map_err(|error| format!("killing analysis failed: {error}"))?;

    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Segment,
        35.0,
        "Completed P(dead) inference",
    ));
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Timeseries,
        65.0,
        "Cleaned kill predictions",
    ));
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Auc,
        85.0,
        "Computed death times and kill curve",
    ));
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Fit,
        98.0,
        "Generated kill curve plots",
    ));

    let outputs = collect_csv_outputs(&workspace_path)?;
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Completed,
        100.0,
        "Killing analysis completed",
    ));
    Ok(outputs)
}

#[cfg(test)]
mod scheduler_stage_tests {
    use super::*;
    use crate::analysis::slide::SlideChannelMapping;

    fn unique_root(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "lisca-killing-merge-{label}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ))
    }

    #[test]
    fn prediction_shards_merge_without_repeating_headers() {
        let root = std::env::temp_dir().join(format!("lisca-immune-shard-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        let workspace = root.join("workspace");
        let first = root.join("first");
        let second = root.join("second");
        for shard in [&first, &second] {
            fs::create_dir_all(shard.join("results")).unwrap();
        }
        fs::write(
            first.join("results/predictions.csv"),
            "t,crop,p_dead,label,pos,slide\n0,1,0.1,false,0,0\n",
        )
        .unwrap();
        fs::write(
            second.join("results/predictions.csv"),
            "t,crop,p_dead,label,pos,slide\n0,1,0.9,true,1,0\n",
        )
        .unwrap();

        merge_prediction_shards(&workspace, &[first, second]).unwrap();
        let merged = fs::read_to_string(workspace.join("results/predictions.csv")).unwrap();
        assert_eq!(
            merged
                .lines()
                .filter(|line| line.starts_with("t,crop"))
                .count(),
            1
        );
        assert!(merged.contains("false,0,0"));
        assert!(merged.contains("true,1,0"));
        fs::remove_dir_all(root).unwrap();
    }

    /// Regression for the nested-timeseries drop: a shard that writes
    /// `timeseries/Pos{N}/ch{M}.csv` (the layout `predict.rs` produces) must
    /// fold those leaves into the live workspace with their nested path
    /// intact. The previous flat walk treated `Pos{N}/` as a non-file and
    /// silently dropped every timeseries CSV.
    #[test]
    fn merge_prediction_shards_preserves_nested_timeseries_csvs() {
        let root = unique_root("nested");
        let _ = fs::remove_dir_all(&root);
        let workspace = root.join("workspace");
        let shard = root.join("sc0-Pos1");
        fs::create_dir_all(shard.join("timeseries/Pos1")).unwrap();
        fs::create_dir_all(shard.join("results")).unwrap();
        fs::write(
            shard.join("timeseries/Pos1/ch0.csv"),
            "roi,t,p_dead\n0,0,0.1\n0,1,0.2\n",
        )
        .unwrap();
        fs::write(
            shard.join("results/predictions.csv"),
            "t,crop,p_dead,label,pos,slide\n0,1,0.1,false,1,0\n",
        )
        .unwrap();

        merge_prediction_shards(&workspace, &[shard]).unwrap();

        // Flat results file is still merged (pre-existing behavior).
        assert!(workspace.join("results/predictions.csv").is_file());
        // Nested timeseries CSV survives the merge — the bug dropped this.
        let ts = workspace.join("timeseries/Pos1/ch0.csv");
        assert!(
            ts.is_file(),
            "nested timeseries CSV was not merged into the workspace"
        );
        assert_eq!(
            fs::read_to_string(&ts).unwrap(),
            "roi,t,p_dead\n0,0,0.1\n0,1,0.2\n"
        );
        fs::remove_dir_all(root).unwrap();
    }

    /// Shards are partitioned per position (Studio `routes.rs:401-406`), so
    /// each `timeseries/Pos{N}/ch{M}.csv` relative path is produced by exactly
    /// one shard. The recursive merge must bring every shard's disjoint
    /// `Pos{N}` slice into the workspace, while the shared
    /// `results/predictions.csv` still concatenates with header dedup.
    #[test]
    fn merge_prediction_shards_merges_disjoint_positions_across_shards() {
        let root = unique_root("disjoint");
        let _ = fs::remove_dir_all(&root);
        let workspace = root.join("workspace");
        let shard1 = root.join("sc0-Pos1");
        let shard2 = root.join("sc0-Pos2");
        // Shard 1 owns Pos1.
        fs::create_dir_all(shard1.join("timeseries/Pos1")).unwrap();
        fs::create_dir_all(shard1.join("results")).unwrap();
        fs::write(
            shard1.join("timeseries/Pos1/ch0.csv"),
            "roi,t,p_dead\n0,0,0.1\n",
        )
        .unwrap();
        fs::write(
            shard1.join("results/predictions.csv"),
            "t,crop,p_dead,label,pos,slide\n0,1,0.1,false,1,0\n",
        )
        .unwrap();
        // Shard 2 owns Pos2.
        fs::create_dir_all(shard2.join("timeseries/Pos2")).unwrap();
        fs::create_dir_all(shard2.join("results")).unwrap();
        fs::write(
            shard2.join("timeseries/Pos2/ch0.csv"),
            "roi,t,p_dead\n0,0,0.9\n",
        )
        .unwrap();
        fs::write(
            shard2.join("results/predictions.csv"),
            "t,crop,p_dead,label,pos,slide\n0,1,0.9,true,2,0\n",
        )
        .unwrap();

        merge_prediction_shards(&workspace, &[shard1, shard2]).unwrap();

        // Each shard's disjoint Pos{N}/ch0.csv survives with its nested path.
        assert_eq!(
            fs::read_to_string(workspace.join("timeseries/Pos1/ch0.csv")).unwrap(),
            "roi,t,p_dead\n0,0,0.1\n"
        );
        assert_eq!(
            fs::read_to_string(workspace.join("timeseries/Pos2/ch0.csv")).unwrap(),
            "roi,t,p_dead\n0,0,0.9\n"
        );
        // The flat results file concatenates both shards and drops the second
        // header.
        let merged = fs::read_to_string(workspace.join("results/predictions.csv")).unwrap();
        assert_eq!(
            merged
                .lines()
                .filter(|line| line.starts_with("t,crop"))
                .count(),
            1,
            "results/predictions.csv header must not repeat across shards"
        );
        assert!(merged.contains("false,1,0"));
        assert!(merged.contains("true,2,0"));
        fs::remove_dir_all(root).unwrap();
    }

    /// A shard with no `timeseries/` directory must still merge its `results/`
    /// file (NotFound is tolerated at every level of the recursive walk).
    #[test]
    fn merge_prediction_shards_skips_missing_timeseries_directory() {
        let root = unique_root("missing-ts");
        let _ = fs::remove_dir_all(&root);
        let workspace = root.join("workspace");
        let shard = root.join("sc0-Pos1");
        fs::create_dir_all(shard.join("results")).unwrap();
        fs::write(
            shard.join("results/predictions.csv"),
            "t,crop,p_dead,label,pos,slide\n0,1,0.1,false,1,0\n",
        )
        .unwrap();

        merge_prediction_shards(&workspace, &[shard]).unwrap();

        assert!(workspace.join("results/predictions.csv").is_file());
        assert!(!workspace.join("timeseries").exists());
        fs::remove_dir_all(root).unwrap();
    }

    /// End-to-end with the REAL producer: `predict.rs` writes every CSV via
    /// `write_csv`, which also emits a binary `.xlsx` sidecar next to each
    /// `.csv` (both `results/predictions.xlsx` and
    /// `timeseries/Pos{N}/ch{M}.xlsx`). The merge must skip those binary
    /// sidecars — `fs::read_to_string` on a binary xlsx crashes the merge
    /// (and BTreeMap order processes `results/predictions.xlsx` before the
    /// nested timeseries, so the crash would happen BEFORE the timeseries
    /// is merged). This test reproduces that exact production payload via
    /// `write_csv` and asserts the merge folds the CSVs (skipping xlsx)
    /// and `run_plot_timeseries_stage` renders `results/traces.png`.
    #[test]
    fn merge_skips_binary_xlsx_sidecars_and_renders_traces() {
        use crate::analysis::csv_io::write_csv;
        let root = unique_root("xlsx");
        let _ = fs::remove_dir_all(&root);
        let workspace = root.join("workspace");
        let shard = root.join("sc0-Pos1");
        fs::create_dir_all(shard.join("timeseries/Pos1")).unwrap();
        fs::create_dir_all(shard.join("results")).unwrap();

        // Use the real producer: `write_csv` writes `predictions.csv` AND
        // `predictions.xlsx` (binary) — exactly what `predict.rs` does.
        write_csv(
            &shard.join("results/predictions.csv"),
            &["t", "crop", "p_dead", "label", "pos", "slide"],
            &[
                vec![
                    "0".into(),
                    "1".into(),
                    "0.1".into(),
                    "false".into(),
                    "1".into(),
                    "0".into(),
                ],
                vec![
                    "1".into(),
                    "1".into(),
                    "0.3".into(),
                    "false".into(),
                    "1".into(),
                    "0".into(),
                ],
            ],
        )
        .unwrap();
        // `predict.rs::write_timeseries_csv` also uses `write_csv`, so each
        // timeseries leaf gets a binary `ch0.xlsx` sidecar too.
        write_csv(
            &shard.join("timeseries/Pos1/ch0.csv"),
            &["roi", "t", "p_dead"],
            &[
                vec!["0".into(), "0".into(), "0.1".into()],
                vec!["0".into(), "1".into(), "0.2".into()],
            ],
        )
        .unwrap();

        // Sanity: the binary sidecars really exist on disk.
        assert!(shard.join("results/predictions.xlsx").is_file());
        assert!(shard.join("timeseries/Pos1/ch0.xlsx").is_file());

        // The merge must not crash on the binary sidecars.
        merge_prediction_shards(&workspace, std::slice::from_ref(&shard)).unwrap();

        // CSVs survive (merged) and xlsx sidecars are skipped (not collected).
        assert!(workspace.join("results/predictions.csv").is_file());
        assert!(!workspace.join("results/predictions.xlsx").exists());
        assert!(workspace.join("timeseries/Pos1/ch0.csv").is_file());
        assert!(!workspace.join("timeseries/Pos1/ch0.xlsx").exists());

        let mut mapping = crate::analysis::slide::SlideMapping::new();
        mapping.insert(
            0,
            SlideChannelMapping {
                positions: vec![1],
                signal: vec![0],
                mask: 0,
                sample_name: "A".into(),
            },
        );

        run_plot_timeseries_stage(&workspace, &mapping, 30.0).unwrap();
        assert!(
            workspace.join("results/traces.png").is_file(),
            "traces.png must be produced once timeseries/ survives the merge"
        );
        fs::remove_dir_all(root).unwrap();
    }
}

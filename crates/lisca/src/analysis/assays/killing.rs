mod fluorescence;
mod mapping;
mod plot;

pub(crate) use mapping::to_killing_mapping;

pub use fluorescence::run_position_traces;
pub use lisca_killing::{PredictControl, PredictFailure};

use std::path::{Path, PathBuf};
use std::{collections::BTreeMap, fs};

use crate::protocol::{AnalysisCsvFile, AnalysisProgress, AnalysisStage, AssayJsonFile};

use crate::analysis::output::collect_csv_outputs;
use crate::analysis::progress::{analysis_progress, run_blocking};
use crate::analysis::sample::{build_sample_mapping, parse_interval_minutes, SampleMapping};

pub fn resolve_model_path(workspace: &Path) -> Result<PathBuf, String> {
    // Killing-assay brain (HF keejkrej/killing-assay-resnet18). Installers do
    // not ship the ONNX; resolve a local cache or LISCA_KILL_MODEL.
    let mut candidates = vec![
        workspace.join("models/killing-assay-resnet18"),
        crate::config::config_dir().join("models/killing-assay-resnet18"),
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

    let mapping = build_sample_mapping(assay_json)?;
    fluorescence::run_traces(workspace, &mapping)?;
    plot::run_plot_traces(workspace, &mapping, interval, None)?;
    Ok(())
}

pub fn run_predict_shard(
    workspace: &Path,
    output_workspace: &Path,
    mapping: &SampleMapping,
    model_dir: &Path,
) -> Result<(), String> {
    lisca_killing::run_predict_to(
        workspace,
        output_workspace,
        &to_killing_mapping(mapping),
        model_dir,
        lisca_killing::PredictOptions::default(),
    )
}

pub fn run_predict_shard_controlled(
    workspace: &Path,
    output_workspace: &Path,
    mapping: &SampleMapping,
    model_dir: &Path,
    control: &PredictControl<'_>,
) -> Result<(), PredictFailure> {
    lisca_killing::run_predict_to_controlled(
        workspace,
        output_workspace,
        &to_killing_mapping(mapping),
        model_dir,
        lisca_killing::PredictOptions::default(),
        control,
    )
}

pub fn merge_prediction_shards(workspace: &Path, shards: &[PathBuf]) -> Result<(), String> {
    let mut files = BTreeMap::<PathBuf, Vec<PathBuf>>::new();
    for shard in shards {
        for relative_dir in ["traces", "results"] {
            let directory = shard.join(relative_dir);
            // Recursively walk the shard subdirectory and key merged files by
            // their path relative to the shard root, so nested
            // `traces/Pos{N}/ch{M}.csv` leaves survive the merge. A flat
            // walk would treat the `Pos{N}/` directories as non-files and
            // silently drop every trace CSV in the sharded pipeline.
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
/// `traces/Pos{N}/ch{M}.csv` leaves keep their relative path. A missing
/// directory is treated as "no files for this shard subtree".
///
/// Only `.csv` files are collected because the merge concatenates with
/// line-based header dedup — a CSV-only operation. `write_csv`
/// (`analysis::csv_io`) emits a binary `.xlsx` sidecar next to every CSV
/// (`results/predictions.xlsx`, `traces/Pos{N}/ch{M}.xlsx`); reading
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

pub fn run_plot_traces_stage(
    workspace: &Path,
    mapping: &SampleMapping,
    interval: f64,
) -> Result<(), String> {
    plot::run_plot_traces(workspace, mapping, interval, None)
}

pub fn run_clean_stage(workspace: &Path, mapping: &SampleMapping) -> Result<(), String> {
    lisca_killing::run_clean(workspace, &to_killing_mapping(mapping))
}

pub fn run_plot_kill_stage(
    workspace: &Path,
    mapping: &SampleMapping,
    interval: f64,
) -> Result<(), String> {
    plot::run_plot_kill(workspace, mapping, interval)
}

pub fn run_plot_death_times_stage(
    workspace: &Path,
    mapping: &SampleMapping,
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
        "Measuring signal-channel fluorescence",
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
        "Measured fluorescence in each crop",
    ));
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Traces,
        65.0,
        "Wrote per-cell fluorescence time series",
    ));
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Auc,
        85.0,
        "Averaged fluorescence for each sample",
    ));
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Fit,
        98.0,
        "Wrote sample comparison figures",
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
    use crate::analysis::sample::SampleAnalysis;

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
            "t,crop,p_dead,label,pos,sample\n0,1,0.1,true,0,A\n",
        )
        .unwrap();
        fs::write(
            second.join("results/predictions.csv"),
            "t,crop,p_dead,label,pos,sample\n0,1,0.9,false,1,A\n",
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
        assert!(merged.contains("true,0,A"));
        assert!(merged.contains("false,1,A"));
        fs::remove_dir_all(root).unwrap();
    }

    /// Regression for the nested-traces drop: a shard that writes
    /// `traces/Pos{N}/ch{M}.csv` (the layout `predict.rs` produces) must
    /// fold those leaves into the live workspace with their nested path
    /// intact. The previous flat walk treated `Pos{N}/` as a non-file and
    /// silently dropped every trace CSV.
    #[test]
    fn merge_prediction_shards_preserves_nested_trace_csvs() {
        let root = unique_root("nested");
        let _ = fs::remove_dir_all(&root);
        let workspace = root.join("workspace");
        let shard = root.join("sc0-Pos1");
        fs::create_dir_all(shard.join("traces/Pos1")).unwrap();
        fs::create_dir_all(shard.join("results")).unwrap();
        fs::write(
            shard.join("traces/Pos1/ch0.csv"),
            "roi,t,p_dead\n0,0,0.1\n0,1,0.2\n",
        )
        .unwrap();
        fs::write(
            shard.join("results/predictions.csv"),
            "t,crop,p_dead,label,pos,sample\n0,1,0.1,false,1,A\n",
        )
        .unwrap();

        merge_prediction_shards(&workspace, &[shard]).unwrap();

        // Flat results file is still merged (pre-existing behavior).
        assert!(workspace.join("results/predictions.csv").is_file());
        // Nested trace CSV survives the merge — the bug dropped this.
        let ts = workspace.join("traces/Pos1/ch0.csv");
        assert!(
            ts.is_file(),
            "nested trace CSV was not merged into the workspace"
        );
        assert_eq!(
            fs::read_to_string(&ts).unwrap(),
            "roi,t,p_dead\n0,0,0.1\n0,1,0.2\n"
        );
        fs::remove_dir_all(root).unwrap();
    }

    /// Shards are partitioned per position (Studio `routes.rs:401-406`), so
    /// each `traces/Pos{N}/ch{M}.csv` relative path is produced by exactly
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
        fs::create_dir_all(shard1.join("traces/Pos1")).unwrap();
        fs::create_dir_all(shard1.join("results")).unwrap();
        fs::write(
            shard1.join("traces/Pos1/ch0.csv"),
            "roi,t,p_dead\n0,0,0.1\n",
        )
        .unwrap();
        fs::write(
            shard1.join("results/predictions.csv"),
            "t,crop,p_dead,label,pos,sample\n0,1,0.1,false,1,A\n",
        )
        .unwrap();
        // Shard 2 owns Pos2.
        fs::create_dir_all(shard2.join("traces/Pos2")).unwrap();
        fs::create_dir_all(shard2.join("results")).unwrap();
        fs::write(
            shard2.join("traces/Pos2/ch0.csv"),
            "roi,t,p_dead\n0,0,0.9\n",
        )
        .unwrap();
        fs::write(
            shard2.join("results/predictions.csv"),
            "t,crop,p_dead,label,pos,sample\n0,1,0.9,true,2,A\n",
        )
        .unwrap();

        merge_prediction_shards(&workspace, &[shard1, shard2]).unwrap();

        // Each shard's disjoint Pos{N}/ch0.csv survives with its nested path.
        assert_eq!(
            fs::read_to_string(workspace.join("traces/Pos1/ch0.csv")).unwrap(),
            "roi,t,p_dead\n0,0,0.1\n"
        );
        assert_eq!(
            fs::read_to_string(workspace.join("traces/Pos2/ch0.csv")).unwrap(),
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
        assert!(merged.contains("false,1,A"));
        assert!(merged.contains("true,2,A"));
        fs::remove_dir_all(root).unwrap();
    }

    /// A shard with no `traces/` directory must still merge its `results/`
    /// file (NotFound is tolerated at every level of the recursive walk).
    #[test]
    fn merge_prediction_shards_skips_missing_traces_directory() {
        let root = unique_root("missing-ts");
        let _ = fs::remove_dir_all(&root);
        let workspace = root.join("workspace");
        let shard = root.join("sc0-Pos1");
        fs::create_dir_all(shard.join("results")).unwrap();
        fs::write(
            shard.join("results/predictions.csv"),
            "t,crop,p_dead,label,pos,sample\n0,1,0.1,false,1,A\n",
        )
        .unwrap();

        merge_prediction_shards(&workspace, &[shard]).unwrap();

        assert!(workspace.join("results/predictions.csv").is_file());
        assert!(!workspace.join("traces").exists());
        fs::remove_dir_all(root).unwrap();
    }

    /// End-to-end with the REAL producer: `predict.rs` writes every CSV via
    /// `write_csv`, which also emits a binary `.xlsx` sidecar next to each
    /// `.csv` (both `results/predictions.xlsx` and
    /// `traces/Pos{N}/ch{M}.xlsx`). The merge must skip those binary
    /// sidecars — `fs::read_to_string` on a binary xlsx crashes the merge
    /// (and BTreeMap order processes `results/predictions.xlsx` before the
    /// nested traces, so the crash would happen BEFORE the traces
    /// is merged). This test reproduces that exact production payload via
    /// `write_csv` and asserts the merge folds the CSVs (skipping xlsx)
    /// and `run_plot_traces_stage` renders `results/<sample>/traces.png`.
    #[test]
    fn merge_skips_binary_xlsx_sidecars_and_renders_traces() {
        use crate::analysis::csv_io::write_csv;
        let root = unique_root("xlsx");
        let _ = fs::remove_dir_all(&root);
        let workspace = root.join("workspace");
        let shard = root.join("sc0-Pos1");
        fs::create_dir_all(shard.join("traces/Pos1")).unwrap();
        fs::create_dir_all(shard.join("results")).unwrap();

        // Use the real producer: `write_csv` writes `predictions.csv` AND
        // `predictions.xlsx` (binary) — exactly what `predict.rs` does.
        write_csv(
            &shard.join("results/predictions.csv"),
            &["t", "crop", "p_dead", "label", "pos", "sample"],
            &[
                vec![
                    "0".into(),
                    "1".into(),
                    "0.1".into(),
                    "false".into(),
                    "1".into(),
                    "A".into(),
                ],
                vec![
                    "1".into(),
                    "1".into(),
                    "0.3".into(),
                    "false".into(),
                    "1".into(),
                    "A".into(),
                ],
            ],
        )
        .unwrap();
        // `predict.rs::write_trace_csv` also uses `write_csv`, so each
        // trace leaf gets a binary `ch0.xlsx` sidecar too.
        write_csv(
            &shard.join("traces/Pos1/ch0.csv"),
            &["roi", "t", "area", "background", "sum", "corrected"],
            &[
                vec![
                    "0".into(),
                    "0".into(),
                    "4".into(),
                    "1".into(),
                    "10".into(),
                    "6".into(),
                ],
                vec![
                    "0".into(),
                    "1".into(),
                    "4".into(),
                    "1".into(),
                    "12".into(),
                    "8".into(),
                ],
            ],
        )
        .unwrap();

        // Sanity: the binary sidecars really exist on disk.
        assert!(shard.join("results/predictions.xlsx").is_file());
        assert!(shard.join("traces/Pos1/ch0.xlsx").is_file());

        // The merge must not crash on the binary sidecars.
        merge_prediction_shards(&workspace, std::slice::from_ref(&shard)).unwrap();

        // CSVs survive (merged) and xlsx sidecars are skipped (not collected).
        assert!(workspace.join("results/predictions.csv").is_file());
        assert!(!workspace.join("results/predictions.xlsx").exists());
        assert!(workspace.join("traces/Pos1/ch0.csv").is_file());
        assert!(!workspace.join("traces/Pos1/ch0.xlsx").exists());

        let mapping = SampleMapping(vec![SampleAnalysis {
            name: "A".into(),
            positions: vec![1],
            signal: vec![0],
            segmentation: 0,
        }]);

        fs::create_dir_all(workspace.join("analysis/Pos1")).unwrap();
        fs::copy(
            workspace.join("traces/Pos1/ch0.csv"),
            workspace.join("analysis/Pos1/ch0.csv"),
        )
        .unwrap();
        run_plot_traces_stage(&workspace, &mapping, 30.0).unwrap();
        assert!(
            workspace.join("results/A/traces.png").is_file(),
            "per-sample traces.png must be produced from analysis/Pos1/ch0.csv"
        );
        assert!(workspace.join("results/A/traces.xlsx").is_file());
        assert!(!workspace.join("results/traces.png").exists());
        fs::remove_dir_all(root).unwrap();
    }
}

#[cfg(test)]
mod model_path_tests {
    use super::*;
    use crate::config::test_lock::TEST_CONFIG_LOCK;

    struct RestoreVar {
        key: &'static str,
        previous: Option<String>,
    }

    impl RestoreVar {
        fn set(key: &'static str, value: Option<&str>) -> Self {
            let previous = std::env::var(key).ok();
            match value {
                Some(value) => std::env::set_var(key, value),
                None => std::env::remove_var(key),
            }
            Self { key, previous }
        }
    }

    impl Drop for RestoreVar {
        fn drop(&mut self) {
            match &self.previous {
                Some(value) => std::env::set_var(self.key, value),
                None => std::env::remove_var(self.key),
            }
        }
    }

    #[test]
    fn resolve_model_path_uses_the_user_config_cache() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let root = std::env::temp_dir().join(format!(
            "lisca-kill-config-cache-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let _ = fs::remove_dir_all(&root);
        let model_dir = root.join("models/killing-assay-resnet18");
        fs::create_dir_all(&model_dir).unwrap();
        fs::write(model_dir.join("model.onnx"), b"onnx").unwrap();
        let workspace = root.join("workspace");
        fs::create_dir_all(&workspace).unwrap();
        let _config = RestoreVar::set("LISCA_CONFIG_DIR", Some(root.to_str().unwrap()));
        let _model = RestoreVar::set("LISCA_KILL_MODEL", None);
        let resolved = resolve_model_path(&workspace).unwrap();
        assert_eq!(resolved, model_dir);
        fs::remove_dir_all(root).unwrap();
    }
}

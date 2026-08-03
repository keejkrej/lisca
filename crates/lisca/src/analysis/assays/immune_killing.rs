mod clean;
mod plot;
mod predict;

use std::path::{Path, PathBuf};
use std::{collections::BTreeMap, fs};

use crate::protocol::{AnalysisCsvFile, AnalysisProgress, AnalysisStage, AssayJsonFile};

use crate::analysis::output::collect_csv_outputs;
use crate::analysis::plot::DEFAULT_PLOT_COLUMNS;
use crate::analysis::progress::{analysis_progress, run_blocking};
use crate::analysis::slide::{build_slide_mapping, parse_interval_minutes};

pub fn resolve_model_path(workspace: &Path) -> Result<PathBuf, String> {
    crate::onnx::resolve_model_path(
        "LISCA_KILL_MODEL",
        [
            workspace.join("models/immune-killing-resnet18"),
            crate::onnx::workspace_models_dir().join("immune-killing-resnet18"),
            PathBuf::from("models/immune-killing-resnet18"),
        ],
    )
}

pub fn run_sync(workspace: &Path, assay_json: &AssayJsonFile) -> Result<(), String> {
    let interval = parse_interval_minutes(
        assay_json.info2.timelapse_amount,
        Some(assay_json.info2.timelapse_unit.as_str()),
    )
    .ok_or_else(|| "invalid timelapseAmount/timelapseUnit in assay.json".to_string())?;

    let mapping = build_slide_mapping(&assay_json.info3)?;

    let model_dir = resolve_model_path(workspace)?;
    predict::run_predict(
        workspace,
        &mapping,
        &model_dir,
        predict::PredictOptions::default(),
    )?;
    plot::run_plot_timeseries(workspace, &mapping, interval, DEFAULT_PLOT_COLUMNS)?;
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
            let Ok(entries) = fs::read_dir(&directory) else {
                continue;
            };
            for entry in entries.flatten() {
                if entry.path().is_file() {
                    files
                        .entry(PathBuf::from(relative_dir).join(entry.file_name()))
                        .or_default()
                        .push(entry.path());
                }
            }
        }
    }
    for (relative, parts) in files {
        let target = workspace.join(relative);
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        let mut merged = String::new();
        for (index, part) in parts.iter().enumerate() {
            let contents = fs::read_to_string(part).map_err(|error| error.to_string())?;
            let mut lines = contents.lines();
            let header = lines.next().unwrap_or_default();
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

pub fn run_plot_timeseries_stage(
    workspace: &Path,
    mapping: &crate::analysis::slide::SlideMapping,
    interval: f64,
) -> Result<(), String> {
    plot::run_plot_timeseries(workspace, mapping, interval, DEFAULT_PLOT_COLUMNS)
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
        "Preparing immune killing analysis",
    ));

    let kill_workspace = workspace_path.clone();
    let kill_assay = assay_json.clone();
    run_blocking(move || run_sync(&kill_workspace, &kill_assay))
        .await
        .map_err(|error| format!("immune killing analysis failed: {error}"))?;

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
        "Immune killing analysis completed",
    ));
    Ok(outputs)
}

#[cfg(test)]
mod scheduler_stage_tests {
    use super::*;

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
            "t,crop,p_dead,label,pos,slide_channel\n0,1,0.1,false,0,0\n",
        )
        .unwrap();
        fs::write(
            second.join("results/predictions.csv"),
            "t,crop,p_dead,label,pos,slide_channel\n0,1,0.9,true,1,0\n",
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
}

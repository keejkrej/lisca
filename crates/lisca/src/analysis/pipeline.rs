use std::fs;
use std::path::PathBuf;

use crate::protocol::{
    AnalysisCsvFile, AnalysisProgress, AnalysisStage, AnalysisStatus, AssayJsonFile,
};

use super::auc::run_auc;
use super::fit::{default_fit_jobs, run_fit};
use super::output::collect_csv_outputs;
use super::plot::{run_plot_auc, run_plot_fit, run_plot_timeseries, DEFAULT_PLOT_COLUMNS};
use super::segment::{run_segment, SegmentOptions};
use super::slide::{build_slide_mapping, parse_interval_minutes, write_slide_mapping};
use super::timeseries::{default_timeseries_jobs, run_timeseries};

pub async fn run_analysis_pipeline<F>(
    workspace_path: PathBuf,
    request_id: String,
    update_progress: F,
) -> Result<Vec<AnalysisCsvFile>, String>
where
    F: Fn(AnalysisProgress) + Send + Sync + 'static,
{
    if !workspace_path.exists() {
        return Err("workspace path does not exist".to_string());
    }
    if !workspace_path.is_dir() {
        return Err("workspace path is not a directory".to_string());
    }

    let assay_path = workspace_path.join("assay.json");
    if !assay_path.is_file() {
        return Err(format!("missing assay.json at {}", assay_path.display()));
    }

    let assay_contents = fs::read_to_string(&assay_path)
        .map_err(|error| format!("failed to read assay.json: {error}"))?;
    let assay_json: AssayJsonFile = serde_json::from_str(&assay_contents)
        .map_err(|error| format!("invalid assay.json: {error}"))?;

    let interval = parse_interval_minutes(
        assay_json.info2.timelapse_amount,
        Some(assay_json.info2.timelapse_unit.as_str()),
    )
    .ok_or_else(|| "invalid timelapseAmount/timelapseUnit in assay.json".to_string())?;

    let mapping = build_slide_mapping(&assay_json.info3)?;
    let jobs = default_timeseries_jobs();
    let workspace = workspace_path.clone();
    let request_id_for_progress = request_id.clone();

    let make_progress = move |stage: AnalysisStage, progress: f64, message: &str| AnalysisProgress {
        request_id: request_id_for_progress.clone(),
        status: if stage == AnalysisStage::Completed {
            AnalysisStatus::Completed
        } else {
            AnalysisStatus::Running
        },
        stage,
        progress,
        message: Some(message.to_string()),
        result_files: Vec::new(),
        error: None,
    };

    update_progress(make_progress(
        AnalysisStage::Preparing,
        5.0,
        "Building slide mapping",
    ));
    write_slide_mapping(&workspace_path, &mapping)?;

    let segment_workspace = workspace_path.clone();
    let segment_mapping = mapping.clone();
    tokio::task::spawn_blocking(move || {
        run_segment(
            &segment_workspace,
            &segment_mapping,
            &SegmentOptions {
                jobs,
                ..SegmentOptions::default()
            },
        )
    })
    .await
    .map_err(|error| format!("analysis task join failed: {error}"))?
    .map_err(|error| format!("segment step failed: {error}"))?;
    update_progress(make_progress(
        AnalysisStage::Segment,
        30.0,
        "Completed segmentation",
    ));

    let timeseries_workspace = workspace_path.clone();
    let timeseries_mapping = mapping.clone();
    tokio::task::spawn_blocking(move || run_timeseries(&timeseries_workspace, &timeseries_mapping, jobs))
        .await
        .map_err(|error| format!("analysis task join failed: {error}"))?
        .map_err(|error| format!("timeseries step failed: {error}"))?;
    update_progress(make_progress(
        AnalysisStage::Timeseries,
        60.0,
        "Computed timeseries metrics",
    ));

    let plot_ts_workspace = workspace_path.clone();
    let plot_ts_mapping = mapping.clone();
    tokio::task::spawn_blocking(move || {
        run_plot_timeseries(
            &plot_ts_workspace,
            &plot_ts_mapping,
            interval,
            DEFAULT_PLOT_COLUMNS,
        )
    })
    .await
    .map_err(|error| format!("analysis task join failed: {error}"))?
    .map_err(|error| format!("plot-timeseries step failed: {error}"))?;

    let auc_workspace = workspace_path.clone();
    tokio::task::spawn_blocking(move || run_auc(&auc_workspace, interval))
        .await
        .map_err(|error| format!("analysis task join failed: {error}"))?
        .map_err(|error| format!("auc step failed: {error}"))?;
    update_progress(make_progress(AnalysisStage::Auc, 85.0, "Computed AUC table"));

    let plot_auc_workspace = workspace_path.clone();
    let plot_auc_mapping = mapping.clone();
    tokio::task::spawn_blocking(move || run_plot_auc(&plot_auc_workspace, &plot_auc_mapping))
        .await
        .map_err(|error| format!("analysis task join failed: {error}"))?
        .map_err(|error| format!("plot-auc step failed: {error}"))?;

    let fit_workspace = workspace_path.clone();
    tokio::task::spawn_blocking(move || run_fit(&fit_workspace, interval, 0.0, default_fit_jobs()))
        .await
        .map_err(|error| format!("analysis task join failed: {error}"))?
        .map_err(|error| format!("fit step failed: {error}"))?;
    update_progress(make_progress(AnalysisStage::Fit, 98.0, "Computed fit table"));

    let plot_fit_workspace = workspace_path.clone();
    let plot_fit_mapping = mapping.clone();
    tokio::task::spawn_blocking(move || {
        run_plot_fit(
            &plot_fit_workspace,
            &plot_fit_mapping,
            interval,
            DEFAULT_PLOT_COLUMNS,
        )
    })
    .await
    .map_err(|error| format!("analysis task join failed: {error}"))?
    .map_err(|error| format!("plot-fit step failed: {error}"))?;

    let outputs = collect_csv_outputs(&workspace)?;
    update_progress(make_progress(
        AnalysisStage::Completed,
        100.0,
        "Analysis pipeline completed",
    ));
    Ok(outputs)
}

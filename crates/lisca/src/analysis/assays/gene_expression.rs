mod auc;
mod fit;
mod image_ops;
mod metrics;
mod plot;
mod segment;
mod timeseries;
mod traces;

pub use auc::discover_timeseries_csvs;
pub use traces::{load_trace_panel, TracePanel};

use std::path::{Path, PathBuf};

use crate::protocol::{AnalysisCsvFile, AnalysisProgress, AnalysisStage, AssayJsonFile};

use crate::analysis::output::collect_csv_outputs;
use crate::analysis::progress::{analysis_progress, run_blocking};
use crate::analysis::slide::{build_slide_mapping, parse_interval_minutes, write_slide_mapping};

use plot::{run_plot_auc, run_plot_fit, run_plot_timeseries, DEFAULT_PLOT_COLUMNS};
use segment::{run_segment, SegmentOptions};
use timeseries::{default_timeseries_jobs, run_timeseries};

pub async fn run<F>(
    workspace_path: PathBuf,
    request_id: String,
    assay_json: AssayJsonFile,
    update_progress: F,
) -> Result<Vec<AnalysisCsvFile>, String>
where
    F: Fn(AnalysisProgress) + Send + Sync + 'static,
{
    let interval = parse_interval_minutes(
        assay_json.info2.timelapse_amount,
        Some(assay_json.info2.timelapse_unit.as_str()),
    )
    .ok_or_else(|| "invalid timelapseAmount/timelapseUnit in assay.json".to_string())?;

    let mapping = build_slide_mapping(&assay_json.info3)?;
    let jobs = default_timeseries_jobs();

    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Preparing,
        5.0,
        "Building slide mapping",
    ));
    write_slide_mapping(&workspace_path, &mapping)?;

    let segment_workspace = workspace_path.clone();
    let segment_mapping = mapping.clone();
    run_blocking(move || {
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
    .map_err(|error| format!("segment step failed: {error}"))?;
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Segment,
        30.0,
        "Completed segmentation",
    ));

    let timeseries_workspace = workspace_path.clone();
    let timeseries_mapping = mapping.clone();
    run_blocking(move || run_timeseries(&timeseries_workspace, &timeseries_mapping, jobs))
        .await
        .map_err(|error| format!("timeseries step failed: {error}"))?;
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Timeseries,
        60.0,
        "Computed timeseries metrics",
    ));

    let plot_ts_workspace = workspace_path.clone();
    let plot_ts_mapping = mapping.clone();
    run_blocking(move || {
        run_plot_timeseries(
            &plot_ts_workspace,
            &plot_ts_mapping,
            interval,
            DEFAULT_PLOT_COLUMNS,
        )
    })
    .await
    .map_err(|error| format!("plot-timeseries step failed: {error}"))?;

    run_blocking({
        let workspace = workspace_path.clone();
        move || auc::run_auc(&workspace, interval)
    })
    .await
    .map_err(|error| format!("auc step failed: {error}"))?;
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Auc,
        85.0,
        "Computed AUC table",
    ));

    let plot_auc_workspace = workspace_path.clone();
    let plot_auc_mapping = mapping.clone();
    run_blocking(move || run_plot_auc(&plot_auc_workspace, &plot_auc_mapping))
        .await
        .map_err(|error| format!("plot-auc step failed: {error}"))?;

    run_blocking({
        let workspace = workspace_path.clone();
        move || fit::run_fit(&workspace, interval, 0.0, fit::default_fit_jobs())
    })
    .await
    .map_err(|error| format!("fit step failed: {error}"))?;
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Fit,
        98.0,
        "Computed fit table",
    ));

    let plot_fit_workspace = workspace_path.clone();
    let plot_fit_mapping = mapping.clone();
    run_blocking(move || {
        run_plot_fit(
            &plot_fit_workspace,
            &plot_fit_mapping,
            interval,
            DEFAULT_PLOT_COLUMNS,
        )
    })
    .await
    .map_err(|error| format!("plot-fit step failed: {error}"))?;

    let outputs = collect_csv_outputs(&workspace_path)?;
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Completed,
        100.0,
        "Analysis pipeline completed",
    ));
    Ok(outputs)
}

#[allow(dead_code)]
pub fn run_sync(workspace: &Path, assay_json: &AssayJsonFile) -> Result<(), String> {
    let interval = parse_interval_minutes(
        assay_json.info2.timelapse_amount,
        Some(assay_json.info2.timelapse_unit.as_str()),
    )
    .ok_or_else(|| "invalid timelapseAmount/timelapseUnit in assay.json".to_string())?;

    let mapping = build_slide_mapping(&assay_json.info3)?;
    let jobs = default_timeseries_jobs();
    write_slide_mapping(workspace, &mapping)?;
    run_segment(
        workspace,
        &mapping,
        &SegmentOptions {
            jobs,
            ..SegmentOptions::default()
        },
    )?;
    run_timeseries(workspace, &mapping, jobs)?;
    run_plot_timeseries(workspace, &mapping, interval, DEFAULT_PLOT_COLUMNS)?;
    auc::run_auc(workspace, interval)?;
    run_plot_auc(workspace, &mapping)?;
    fit::run_fit(workspace, interval, 0.0, fit::default_fit_jobs())?;
    run_plot_fit(workspace, &mapping, interval, DEFAULT_PLOT_COLUMNS)?;
    Ok(())
}

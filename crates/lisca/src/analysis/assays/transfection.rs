mod auc;
mod fit;
mod image_ops;
mod metrics;
mod plot;
mod segment;
mod timeseries;
mod traces;

pub use auc::run_auc;
pub use fit::{default_fit_jobs, run_fit};
pub use plot::{run_plot_auc, run_plot_fit, run_plot_timeseries, DEFAULT_PLOT_COLUMNS};
pub use segment::{default_jobs, run_segment, SegmentOptions};
pub use timeseries::{default_timeseries_jobs, run_timeseries, run_timeseries_with_mode};

use std::path::PathBuf;

use crate::protocol::{AnalysisCsvFile, AnalysisProgress, AnalysisStage, AssayJsonFile};

use crate::analysis::output::collect_csv_outputs;
use crate::analysis::progress::{analysis_progress, run_blocking};
use crate::analysis::slide::{build_slide_mapping, parse_interval_minutes};

/// Default second-pass **onset time** (\(t_0\)) search cap when assay.json
/// omits `analysis.maxOnsetMinutes` (minutes). `0` still means “onset fixed
/// at 0” when the field is set explicitly. Fit uses the basic
/// translation–degradation model (Müller et al. 2024 Eq. 3; no maturation).
pub const DEFAULT_MAX_ONSET_MINUTES: f64 = 120.0;

/// Default frame interval (minutes) when assay.json omits a positive
/// `interval.value` / unit for this assay.
pub const DEFAULT_INTERVAL_MINUTES: f64 = 10.0;

/// Transfection-only analysis option. Other assays ignore `analysis.maxOnsetMinutes`.
pub fn max_onset_minutes(assay_json: &AssayJsonFile) -> f64 {
    if !matches!(assay_json.type_, crate::protocol::AssayType::Transfection) {
        return 0.0;
    }
    assay_json
        .analysis
        .as_ref()
        .and_then(|analysis| analysis.max_onset_minutes)
        .unwrap_or(DEFAULT_MAX_ONSET_MINUTES)
}

/// Whether to skip mask-based segmentation and use whole-ROI metrics instead
/// (assay.json `analysis.skipSegment`). Defaults to `false`.
pub fn skip_segment(assay_json: &AssayJsonFile) -> bool {
    assay_json
        .analysis
        .as_ref()
        .and_then(|analysis| analysis.skip_segment)
        .unwrap_or(false)
}

/// Resolve frame interval. Prefers assay.json `interval.value`/`interval.unit`.
/// When missing, uses the assay-specific default (transfection: 10 min). Other assays
/// require an explicit positive interval.
pub fn interval_minutes(assay_json: &AssayJsonFile) -> Result<f64, String> {
    if let Some(interval) = parse_interval_minutes(
        assay_json.interval.value,
        Some(assay_json.interval.unit.as_str()),
    ) {
        return Ok(interval);
    }
    match assay_json.type_ {
        crate::protocol::AssayType::Transfection => Ok(DEFAULT_INTERVAL_MINUTES),
        other => Err(format!(
            "missing interval.value/unit for assay {other:?} (no default interval)"
        )),
    }
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
    let interval = interval_minutes(&assay_json)?;
    let mapping = build_slide_mapping(&assay_json)?;
    let jobs = default_timeseries_jobs();
    let skip_segment_stage = skip_segment(&assay_json);

    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Preparing,
        5.0,
        "Building sample mapping from assay.json",
    ));

    if !skip_segment_stage {
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
    }
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Segment,
        30.0,
        "Completed segmentation",
    ));

    let timeseries_workspace = workspace_path.clone();
    let timeseries_mapping = mapping.clone();
    run_blocking(move || {
        run_timeseries_with_mode(
            &timeseries_workspace,
            &timeseries_mapping,
            jobs,
            skip_segment_stage,
        )
    })
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
        run_plot_timeseries(&plot_ts_workspace, &plot_ts_mapping, interval, None)
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

    let max_onset = max_onset_minutes(&assay_json);
    run_blocking({
        let workspace = workspace_path.clone();
        move || fit::run_fit(&workspace, interval, max_onset, fit::default_fit_jobs())
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
        run_plot_fit(&plot_fit_workspace, &plot_fit_mapping, interval, None)
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

/// Synchronous full transfection pipeline (parity CLI / tests).
///
/// Same stage order as Studio: segment → timeseries → plot-timeseries → auc →
/// plot-auc → fit → plot-fit. Sample mapping is read from `assay.json` only.
pub fn run_sync(workspace: &std::path::Path, assay_json: &AssayJsonFile) -> Result<(), String> {
    run_sync_with_mode(workspace, assay_json, skip_segment(assay_json))
}

pub fn run_sync_with_mode(
    workspace: &std::path::Path,
    assay_json: &AssayJsonFile,
    full_frame: bool,
) -> Result<(), String> {
    let interval = interval_minutes(assay_json)?;

    let mapping = build_slide_mapping(assay_json)?;
    let jobs = default_timeseries_jobs();

    if !full_frame {
        run_segment(
            workspace,
            &mapping,
            &SegmentOptions {
                jobs,
                ..SegmentOptions::default()
            },
        )?;
    }
    run_timeseries_with_mode(workspace, &mapping, jobs, full_frame)?;
    run_plot_timeseries(workspace, &mapping, interval, None)?;
    run_auc(workspace, interval)?;
    run_plot_auc(workspace, &mapping)?;
    let max_onset = max_onset_minutes(assay_json);
    run_fit(workspace, interval, max_onset, default_fit_jobs())?;
    run_plot_fit(workspace, &mapping, interval, None)?;
    Ok(())
}

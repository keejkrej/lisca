//! Thin dispatch into the `lisca-transfection` git crate.
//!
//! Transfection **analysis** (Otsu segment, timeseries, AUC, kinetic fit, plots)
//! lives in [`lisca_transfection`]. Crop (`lisca-crop`) stays in this repo.
//! Studio ONNX segment may stay as a local adapter until the sidecar un-stubs
//! it; pattern-U-Net weights come from HF / `LISCA_PATTERN_SEG_MODEL`, not as
//! a lisca-owned `models/` brain. The on-disk workspace (`assay.json` + `roi/`)
//! is the contract; ndarray types are not passed across the crate boundary.

mod mapping;
mod segment;
#[cfg(feature = "smart")]
mod segment_onnx;

pub use crate::analysis::plot::DEFAULT_PLOT_COLUMNS;
pub use segment::{default_jobs, run_segment, SegmentBackend, SegmentOptions};

use std::path::{Path, PathBuf};

use crate::analysis::output::collect_csv_outputs;
use crate::analysis::progress::{analysis_progress, run_blocking};
use crate::analysis::slide::{build_slide_mapping, parse_interval_minutes, SlideMapping};
use crate::protocol::{AnalysisCsvFile, AnalysisProgress, AnalysisStage, AssayJsonFile};

use mapping::to_sidecar_mapping;

/// Default second-pass **onset time** (\(t_0\)) search cap when assay.json
/// omits `analysis.maxOnsetMinutes` (minutes). `0` still means “onset time
/// \(t_0\) fixed at 0” when the field is set explicitly. Fit uses the basic
/// translation–degradation model (Müller et al. 2024 Eq. 3; no maturation).
pub const DEFAULT_MAX_ONSET_MINUTES: f64 = lisca_transfection::DEFAULT_MAX_ONSET_MINUTES;

/// Default frame interval (minutes) when assay.json omits a positive
/// `interval.value` / unit for this assay.
pub const DEFAULT_INTERVAL_MINUTES: f64 = lisca_transfection::DEFAULT_INTERVAL_MINUTES;

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

pub fn default_timeseries_jobs() -> usize {
    lisca_transfection::default_timeseries_jobs()
}

pub fn default_fit_jobs() -> usize {
    lisca_transfection::default_fit_jobs()
}

pub fn run_timeseries(workspace: &Path, mapping: &SlideMapping, jobs: usize) -> Result<(), String> {
    run_timeseries_with_mode(workspace, mapping, jobs, false)
}

pub fn run_timeseries_with_mode(
    workspace: &Path,
    mapping: &SlideMapping,
    jobs: usize,
    full_frame: bool,
) -> Result<(), String> {
    lisca_transfection::run_timeseries_with_mode(
        workspace,
        &to_sidecar_mapping(mapping),
        jobs,
        full_frame,
    )
}

pub fn run_auc(workspace: &Path, interval: f64) -> Result<Vec<PathBuf>, String> {
    lisca_transfection::run_auc(workspace, interval)
}

pub fn run_fit(
    workspace: &Path,
    interval: f64,
    max_onset_minutes: f64,
    jobs: usize,
) -> Result<Vec<PathBuf>, String> {
    lisca_transfection::run_fit(workspace, interval, max_onset_minutes, jobs)
}

pub fn run_plot_timeseries(
    workspace: &Path,
    mapping: &SlideMapping,
    interval: f64,
    columns: Option<usize>,
) -> Result<(), String> {
    lisca_transfection::run_plot_timeseries(
        workspace,
        &to_sidecar_mapping(mapping),
        interval,
        columns,
    )
}

pub fn run_plot_auc(workspace: &Path, mapping: &SlideMapping) -> Result<(), String> {
    lisca_transfection::run_plot_auc(workspace, &to_sidecar_mapping(mapping))
}

pub fn run_plot_fit(
    workspace: &Path,
    mapping: &SlideMapping,
    interval: f64,
    columns: Option<usize>,
) -> Result<(), String> {
    lisca_transfection::run_plot_fit(workspace, &to_sidecar_mapping(mapping), interval, columns)
}

/// Per-sample `results/<sample>/traces.xlsx`. Plot stages write PNG only.
pub fn publish_sample_traces_xlsx(
    workspace: &Path,
    mapping: &SlideMapping,
) -> Result<Vec<PathBuf>, String> {
    lisca_transfection::publish_sample_traces_xlsx(workspace, &to_sidecar_mapping(mapping))
}

/// Per-sample `results/<sample>/{auc,fit}.xlsx`. Plot stages write PNG only.
pub fn publish_sample_tables_xlsx(
    workspace: &Path,
    mapping: &SlideMapping,
    kind: &str,
) -> Result<Vec<PathBuf>, String> {
    lisca_transfection::publish_sample_tables_xlsx(workspace, &to_sidecar_mapping(mapping), kind)
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
        publish_sample_traces_xlsx(&plot_ts_workspace, &plot_ts_mapping)?;
        run_plot_timeseries(&plot_ts_workspace, &plot_ts_mapping, interval, None)
    })
    .await
    .map_err(|error| format!("plot-timeseries step failed: {error}"))?;

    run_blocking({
        let workspace = workspace_path.clone();
        move || run_auc(&workspace, interval).map(|_| ())
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
    run_blocking(move || {
        publish_sample_tables_xlsx(&plot_auc_workspace, &plot_auc_mapping, "auc")?;
        run_plot_auc(&plot_auc_workspace, &plot_auc_mapping)
    })
    .await
    .map_err(|error| format!("plot-auc step failed: {error}"))?;

    let max_onset = max_onset_minutes(&assay_json);
    run_blocking({
        let workspace = workspace_path.clone();
        move || run_fit(&workspace, interval, max_onset, default_fit_jobs()).map(|_| ())
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
        publish_sample_tables_xlsx(&plot_fit_workspace, &plot_fit_mapping, "fit")?;
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
/// Science stages run in `lisca-transfection` (Otsu default).
pub fn run_sync(workspace: &Path, assay_json: &AssayJsonFile) -> Result<(), String> {
    run_sync_with_mode(workspace, assay_json, skip_segment(assay_json))
}

pub fn run_sync_with_mode(
    workspace: &Path,
    _assay_json: &AssayJsonFile,
    full_frame: bool,
) -> Result<(), String> {
    let sidecar_assay = lisca_transfection::load_assay_for_workspace(workspace, None)?;
    lisca_transfection::run_pipeline_with_mode(workspace, &sidecar_assay, full_frame)
}

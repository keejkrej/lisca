//! Thin dispatch into the `lisca-transfection` git crate.
//!
//! Transfection **analysis** (Otsu segment, traces, AUC, kinetic fit, plots)
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

use crate::analysis::sample::{parse_interval_minutes, SampleMapping};
use crate::protocol::AssayJsonFile;

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

/// Mask method from `analysis.segmentationMode`. `smart` uses the model.
/// A missing field, and `logstd`, stay on the local log-std (Otsu) path.
pub fn segment_backend(assay_json: &AssayJsonFile) -> SegmentBackend {
    match assay_json
        .analysis
        .as_ref()
        .and_then(|analysis| analysis.segmentation_mode.as_ref())
    {
        Some(crate::protocol::AssaySegmentationMode::Smart) => SegmentBackend::Onnx,
        _ => SegmentBackend::Otsu,
    }
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

pub fn default_traces_jobs() -> usize {
    lisca_transfection::default_traces_jobs()
}

pub fn default_fit_jobs() -> usize {
    lisca_transfection::default_fit_jobs()
}

pub fn run_traces(workspace: &Path, mapping: &SampleMapping, jobs: usize) -> Result<(), String> {
    run_traces_with_mode(workspace, mapping, jobs, false)
}

pub fn run_traces_with_mode(
    workspace: &Path,
    mapping: &SampleMapping,
    jobs: usize,
    full_frame: bool,
) -> Result<(), String> {
    lisca_transfection::run_traces_with_mode(
        workspace,
        &to_sidecar_mapping(mapping),
        jobs,
        full_frame,
    )
}

/// Traces for one Position (the Studio `analysis/transfection/traces/Pos{n}` Step).
pub fn run_position_traces(
    workspace: &Path,
    mapping: &SampleMapping,
    position: u32,
    full_frame: bool,
) -> Result<(), String> {
    lisca_transfection::run_position_traces(
        workspace,
        &to_sidecar_mapping(mapping),
        position,
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

pub fn run_plot_traces(
    workspace: &Path,
    mapping: &SampleMapping,
    interval: f64,
    columns: Option<usize>,
) -> Result<(), String> {
    lisca_transfection::run_plot_traces(workspace, &to_sidecar_mapping(mapping), interval, columns)
}

pub fn run_plot_auc(workspace: &Path, mapping: &SampleMapping) -> Result<(), String> {
    lisca_transfection::run_plot_auc(workspace, &to_sidecar_mapping(mapping))
}

pub fn run_plot_fit(
    workspace: &Path,
    mapping: &SampleMapping,
    interval: f64,
    columns: Option<usize>,
) -> Result<(), String> {
    lisca_transfection::run_plot_fit(workspace, &to_sidecar_mapping(mapping), interval, columns)
}

/// Per-sample `results/<sample>/traces.xlsx`. Plot stages write PNG only.
pub fn publish_sample_traces_xlsx(
    workspace: &Path,
    mapping: &SampleMapping,
) -> Result<Vec<PathBuf>, String> {
    lisca_transfection::publish_sample_traces_xlsx(workspace, &to_sidecar_mapping(mapping))
}

/// Per-sample `results/<sample>/{auc,fit}.xlsx`. Plot stages write PNG only.
pub fn publish_sample_tables_xlsx(
    workspace: &Path,
    mapping: &SampleMapping,
    kind: &str,
) -> Result<Vec<PathBuf>, String> {
    lisca_transfection::publish_sample_tables_xlsx(workspace, &to_sidecar_mapping(mapping), kind)
}

/// Synchronous full transfection pipeline (parity CLI / tests).
///
/// Same stage order as Studio: segment → traces → plot-traces → auc →
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

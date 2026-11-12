//! Thin caller into [`lisca_transfection`].

use std::path::{Path, PathBuf};

use crate::analysis::sample::{parse_interval_minutes, SampleMapping};
use crate::protocol::AssayJsonFile;

pub const DEFAULT_PLOT_COLUMNS: usize = 3;
pub const DEFAULT_MAX_ONSET_MINUTES: f64 = lisca_transfection::DEFAULT_MAX_ONSET_MINUTES;
pub const DEFAULT_INTERVAL_MINUTES: f64 = lisca_transfection::DEFAULT_INTERVAL_MINUTES;

fn to_sidecar_mapping(mapping: &SampleMapping) -> lisca_transfection::SampleMapping {
    mapping
        .iter()
        .map(|sample| lisca_transfection::SampleAnalysis {
            name: sample.name.clone(),
            positions: sample.positions.clone(),
            signal: sample.signal.clone(),
            segmentation: sample.segmentation,
        })
        .collect()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum SegmentBackend {
    #[default]
    Otsu,
}

impl SegmentBackend {
    pub fn parse(value: &str) -> Result<Self, String> {
        match value.trim().to_ascii_lowercase().as_str() {
            "otsu" | "classical" | "default" | "logstd" => Ok(Self::Otsu),
            other => Err(format!(
                "unknown segment backend {other:?} (expected otsu|logstd)"
            )),
        }
    }
}

#[derive(Debug, Clone)]
pub struct SegmentOptions {
    pub variation_radius: u32,
    pub gaussian_sigma: f64,
    pub force: bool,
    pub jobs: usize,
    pub backend: SegmentBackend,
}

impl Default for SegmentOptions {
    fn default() -> Self {
        Self {
            variation_radius: 2,
            gaussian_sigma: 1.0,
            force: false,
            jobs: default_jobs(),
            backend: SegmentBackend::Otsu,
        }
    }
}

pub fn default_jobs() -> usize {
    lisca_transfection::default_jobs()
}

pub fn default_traces_jobs() -> usize {
    lisca_transfection::default_traces_jobs()
}

pub fn default_fit_jobs() -> usize {
    lisca_transfection::default_fit_jobs()
}

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

pub fn skip_segment(assay_json: &AssayJsonFile) -> bool {
    assay_json
        .analysis
        .as_ref()
        .and_then(|analysis| analysis.skip_segment)
        .unwrap_or(false)
}

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

pub fn run_segment(
    workspace: &Path,
    mapping: &SampleMapping,
    options: &SegmentOptions,
) -> Result<(), String> {
    let SegmentBackend::Otsu = options.backend;
    let sidecar_options = lisca_transfection::SegmentOptions {
        variation_radius: options.variation_radius,
        gaussian_sigma: options.gaussian_sigma,
        force: options.force,
        jobs: options.jobs,
        backend: lisca_transfection::SegmentBackend::Otsu,
        model_dir: None,
        image_size: 128,
        threshold: 0.5,
        batch_size: 32,
    };
    lisca_transfection::run_segment(workspace, &to_sidecar_mapping(mapping), &sidecar_options)
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

pub fn publish_sample_traces_xlsx(
    workspace: &Path,
    mapping: &SampleMapping,
) -> Result<Vec<PathBuf>, String> {
    lisca_transfection::publish_sample_traces_xlsx(workspace, &to_sidecar_mapping(mapping))
}

pub fn publish_sample_tables_xlsx(
    workspace: &Path,
    mapping: &SampleMapping,
    kind: &str,
) -> Result<Vec<PathBuf>, String> {
    lisca_transfection::publish_sample_tables_xlsx(workspace, &to_sidecar_mapping(mapping), kind)
}

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::analysis::sample::{SampleAnalysis, SampleMapping};

    #[test]
    fn segment_errors_on_empty_mapping() {
        let workspace = tempfile::tempdir().unwrap();
        let mapping = SampleMapping::new();
        let err = run_segment(workspace.path(), &mapping, &SegmentOptions::default()).unwrap_err();
        assert!(err.contains("no valid positions"));
    }

    #[test]
    fn segment_errors_when_all_positions_missing() {
        let workspace = tempfile::tempdir().unwrap();
        let mapping = SampleMapping(vec![SampleAnalysis {
            name: "test".to_string(),
            positions: vec![1, 2],
            signal: vec![1],
            segmentation: 0,
        }]);
        let err = run_segment(workspace.path(), &mapping, &SegmentOptions::default()).unwrap_err();
        assert!(err.contains("No ROI masks written"), "{err}");
    }
}

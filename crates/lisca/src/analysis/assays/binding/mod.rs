//! Thin caller into [`lisca_binding::lnp_binding`].

use std::path::Path;

use crate::analysis::sample::{build_sample_mapping, parse_interval_minutes, SampleMapping};
use crate::protocol::{AssayAnalysisConfig, AssayJsonFile};

pub use lisca_binding::lnp_binding::{BindingDetectParams, DEFAULT_BOX_SIZE, DEFAULT_MIN_GRADIENT};

fn to_binding_mapping(mapping: &SampleMapping) -> lisca_binding::SampleMapping {
    mapping
        .iter()
        .map(|sample| lisca_binding::SampleAnalysis {
            name: sample.name.clone(),
            positions: sample.positions.clone(),
            signal: sample.signal.clone(),
            segmentation: sample.segmentation,
        })
        .collect()
}

pub fn detect_params(
    analysis: Option<&AssayAnalysisConfig>,
) -> Result<BindingDetectParams, String> {
    lisca_binding::lnp_binding::validate_detect_params(
        analysis.and_then(|config| config.min_gradient),
        analysis.and_then(|config| config.box_size),
    )
}

pub fn run_sync(workspace: &Path, assay_json: &AssayJsonFile) -> Result<(), String> {
    let interval = parse_interval_minutes(
        assay_json.interval.value,
        Some(assay_json.interval.unit.as_str()),
    )
    .ok_or_else(|| "invalid interval.value/unit in assay.json".to_string())?;
    let mapping = build_sample_mapping(assay_json)?;
    let params = detect_params(assay_json.analysis.as_ref())?;
    lisca_binding::lnp_binding::run_pipeline(
        workspace,
        &to_binding_mapping(&mapping),
        interval,
        params,
    )
}

pub fn run_position(
    workspace: &Path,
    mapping: &SampleMapping,
    position: u32,
    interval_minutes: f64,
    params: BindingDetectParams,
) -> Result<(), String> {
    lisca_binding::lnp_binding::run_position(
        workspace,
        &to_binding_mapping(mapping),
        position,
        interval_minutes,
        params,
    )
}

pub fn run_plot_traces(
    workspace: &Path,
    mapping: &SampleMapping,
    interval_minutes: f64,
) -> Result<(), String> {
    lisca_binding::lnp_binding::run_plot_traces(
        workspace,
        &to_binding_mapping(mapping),
        interval_minutes,
    )
}

pub fn write_summary(workspace: &Path, mapping: &SampleMapping) -> Result<(), String> {
    lisca_binding::lnp_binding::write_summary(workspace, &to_binding_mapping(mapping))
}

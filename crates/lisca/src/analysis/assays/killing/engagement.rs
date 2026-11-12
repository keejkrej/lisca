//! Thin caller into [`lisca_killing`] for `killing-engagement`.

use std::path::Path;

use crate::analysis::sample::{build_sample_mapping, parse_interval_minutes, SampleMapping};
use crate::protocol::AssayJsonFile;

use super::to_killing_mapping;

pub fn run_sync(workspace: &Path, assay_json: &AssayJsonFile) -> Result<(), String> {
    let interval = parse_interval_minutes(
        assay_json.interval.value,
        Some(assay_json.interval.unit.as_str()),
    )
    .ok_or_else(|| "invalid interval.value/unit in assay.json".to_string())?;
    let mapping = build_sample_mapping(assay_json)?;
    let sidecar_mapping = to_killing_mapping(&mapping);
    lisca_killing::run_engagement_pipeline(workspace, &sidecar_mapping, interval)?;
    lisca_killing::run_plot_engagement_traces(workspace, &sidecar_mapping, interval)
}

pub fn run_position(
    workspace: &Path,
    mapping: &SampleMapping,
    position: u32,
    interval_minutes: f64,
) -> Result<(), String> {
    lisca_killing::run_position_engagement(
        workspace,
        &to_killing_mapping(mapping),
        position,
        interval_minutes,
    )
}

pub fn run_plot_traces(
    workspace: &Path,
    mapping: &SampleMapping,
    interval_minutes: f64,
) -> Result<(), String> {
    lisca_killing::run_plot_engagement_traces(
        workspace,
        &to_killing_mapping(mapping),
        interval_minutes,
    )
}

pub fn write_summary(workspace: &Path, mapping: &SampleMapping) -> Result<(), String> {
    lisca_killing::write_engagement_summary(workspace, &to_killing_mapping(mapping))
}

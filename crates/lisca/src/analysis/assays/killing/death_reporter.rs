//! Thin caller into [`lisca_killing`] for `killing-death-reporter`.

use std::path::{Path, PathBuf};

use crate::analysis::sample::{build_sample_mapping, parse_interval_minutes, SampleMapping};
use crate::protocol::AssayJsonFile;

use super::to_killing_mapping;

pub use lisca_killing::{PredictControl, PredictFailure};

pub fn resolve_model_path(workspace: &Path) -> Result<PathBuf, String> {
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
    lisca_killing::run_death_reporter_pipeline(workspace, &to_killing_mapping(&mapping), interval)
}

pub fn run_position_traces(
    workspace: &Path,
    mapping: &SampleMapping,
    position: u32,
) -> Result<(), String> {
    lisca_killing::run_position_fluorescence(workspace, &to_killing_mapping(mapping), position)
}

pub fn run_plot_traces_stage(
    workspace: &Path,
    mapping: &SampleMapping,
    interval: f64,
) -> Result<(), String> {
    lisca_killing::run_plot_traces(workspace, &to_killing_mapping(mapping), interval, None)
}

pub fn run_viability_stage(
    workspace: &Path,
    mapping: &SampleMapping,
    interval: f64,
) -> Result<(), String> {
    lisca_killing::run_viability(workspace, &to_killing_mapping(mapping), interval)
}

pub fn run_plot_survival_stage(
    workspace: &Path,
    mapping: &SampleMapping,
    interval: f64,
) -> Result<(), String> {
    lisca_killing::run_plot_survival(workspace, &to_killing_mapping(mapping), interval)
}

pub fn run_plot_kill_stage(
    workspace: &Path,
    mapping: &SampleMapping,
    interval: f64,
) -> Result<(), String> {
    lisca_killing::run_plot_kill(workspace, &to_killing_mapping(mapping), interval)
}

pub fn run_plot_death_times_stage(
    workspace: &Path,
    mapping: &SampleMapping,
    interval: f64,
) -> Result<(), String> {
    lisca_killing::run_plot_death_times(workspace, &to_killing_mapping(mapping), interval)
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
    lisca_killing::merge_prediction_shards(workspace, shards)
}

pub fn run_clean_stage(workspace: &Path, mapping: &SampleMapping) -> Result<(), String> {
    lisca_killing::run_clean(workspace, &to_killing_mapping(mapping))
}

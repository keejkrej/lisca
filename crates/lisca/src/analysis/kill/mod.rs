mod clean;
mod plot;
mod predict;

use std::path::{Path, PathBuf};

use crate::protocol::AssayJsonFile;

use super::output::collect_csv_outputs;
use super::slide::{build_slide_mapping, parse_interval_minutes, write_slide_mapping};
pub fn resolve_kill_model_path(workspace: &Path) -> Result<PathBuf, String> {
    if let Ok(env_path) = std::env::var("LISCA_KILL_MODEL") {
        let path = PathBuf::from(env_path.trim());
        if path.join("model.onnx").is_file() {
            return Ok(path);
        }
        if path.file_name().is_some_and(|name| name == "model.onnx") && path.is_file() {
            return Ok(path
                .parent()
                .map(Path::to_path_buf)
                .unwrap_or_else(|| PathBuf::from(".")));
        }
        return Err(format!(
            "LISCA_KILL_MODEL is set but no model.onnx found at {}",
            path.display()
        ));
    }

    let workspace_model_dir = workspace.join("models/mupattern-resnet18");
    let workspace_model = workspace_model_dir.join("model.onnx");
    if workspace_model.is_file() {
        return Ok(workspace_model_dir);
    }

    Err(
        "immune killing model not found: set LISCA_KILL_MODEL or place model.onnx at \
         workspace/models/mupattern-resnet18/model.onnx (export from keejkrej/mupattern-resnet18)"
            .to_string(),
    )
}

pub fn run_kill_pipeline(workspace: &Path, assay_json: &AssayJsonFile) -> Result<(), String> {
    let interval = parse_interval_minutes(
        assay_json.info2.timelapse_amount,
        Some(assay_json.info2.timelapse_unit.as_str()),
    )
    .ok_or_else(|| "invalid timelapseAmount/timelapseUnit in assay.json".to_string())?;

    let mapping = build_slide_mapping(&assay_json.info3)?;
    write_slide_mapping(workspace, &mapping)?;

    let model_dir = resolve_kill_model_path(workspace)?;
    predict::run_predict(workspace, &mapping, &model_dir, predict::PredictOptions::default())?;
    clean::run_clean(workspace, &mapping)?;
    plot::run_plot_kill(workspace, &mapping, interval)?;
    Ok(())
}

pub fn collect_kill_outputs(
    workspace: &Path,
) -> Result<Vec<crate::protocol::AnalysisCsvFile>, String> {
    collect_csv_outputs(workspace)
}

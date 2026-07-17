use std::fs;
use std::path::PathBuf;

use crate::protocol::{AnalysisCsvFile, AssayJsonFile};

use super::{assays, AnalysisError};

pub async fn run_analysis_pipeline<F>(
    workspace_path: PathBuf,
    request_id: String,
    update_progress: F,
) -> Result<Vec<AnalysisCsvFile>, AnalysisError>
where
    F: Fn(crate::protocol::AnalysisProgress) + Send + Sync + 'static,
{
    if !workspace_path.exists() {
        return Err(AnalysisError::Failed(
            "workspace path does not exist".to_string(),
        ));
    }
    if !workspace_path.is_dir() {
        return Err(AnalysisError::Failed(
            "workspace path is not a directory".to_string(),
        ));
    }

    let assay_path = workspace_path.join("assay.json");
    if !assay_path.is_file() {
        return Err(AnalysisError::Failed(format!(
            "missing assay.json at {}",
            assay_path.display()
        )));
    }

    let assay_contents = fs::read_to_string(&assay_path)
        .map_err(|error| AnalysisError::Failed(format!("failed to read assay.json: {error}")))?;
    let assay_json: AssayJsonFile = serde_json::from_str(&assay_contents)
        .map_err(|error| AnalysisError::Failed(format!("invalid assay.json: {error}")))?;

    assays::run(workspace_path, request_id, assay_json, update_progress).await
}

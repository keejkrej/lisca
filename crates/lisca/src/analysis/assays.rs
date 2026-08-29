//! Per-assay analysis pipelines. Add a new submodule here when Studio supports
//! another `assayId`, then register it in `run`.

pub mod killing;
pub mod transfection;

use std::path::PathBuf;

use crate::analysis::AnalysisError;
use crate::protocol::{AnalysisCsvFile, AnalysisProgress, AssayJsonFile, AssayType};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SupportedAssay {
    Transfection,
    Killing,
}

fn dispatch(assay_id: AssayType) -> Result<SupportedAssay, AnalysisError> {
    match assay_id {
        AssayType::Transfection => Ok(SupportedAssay::Transfection),
        AssayType::Killing => Ok(SupportedAssay::Killing),
        AssayType::LnpBinding => Err(AnalysisError::UnsupportedAssay { assay_id }),
    }
}

pub async fn run<F>(
    workspace_path: PathBuf,
    request_id: String,
    assay_json: AssayJsonFile,
    update_progress: F,
) -> Result<Vec<AnalysisCsvFile>, AnalysisError>
where
    F: Fn(AnalysisProgress) + Send + Sync + 'static,
{
    match dispatch(assay_json.type_)? {
        SupportedAssay::Transfection => {
            transfection::run(workspace_path, request_id, assay_json, update_progress)
                .await
                .map_err(AnalysisError::Failed)
        }
        SupportedAssay::Killing => {
            killing::run(workspace_path, request_id, assay_json, update_progress)
                .await
                .map_err(AnalysisError::Failed)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unsupported_assay_ids_have_typed_errors_that_name_the_id() {
        let assay_id = AssayType::LnpBinding;
        let error = dispatch(assay_id).unwrap_err();
        assert_eq!(error, AnalysisError::UnsupportedAssay { assay_id });
        assert!(error.to_string().contains(assay_id.to_string().as_str()));
    }
}

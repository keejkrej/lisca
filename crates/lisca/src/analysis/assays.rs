//! Per-assay analysis pipelines. Add a new submodule here when Studio supports
//! another `assayId`, then register it in `run`.

pub mod killing;
pub mod killing_engagement;
pub mod lnp_binding;
pub mod transfection;

use std::path::PathBuf;

use crate::analysis::AnalysisError;
use crate::protocol::{AnalysisCsvFile, AnalysisProgress, AssayJsonFile, AssayType};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SupportedAssay {
    Transfection,
    Killing,
    KillingEngagement,
    LnpBinding,
}

fn dispatch(assay_id: AssayType) -> Result<SupportedAssay, AnalysisError> {
    match assay_id {
        AssayType::Transfection => Ok(SupportedAssay::Transfection),
        AssayType::KillingDeathReporter => Ok(SupportedAssay::Killing),
        AssayType::KillingEngagement => Ok(SupportedAssay::KillingEngagement),
        AssayType::LnpBinding => Ok(SupportedAssay::LnpBinding),
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
        SupportedAssay::KillingEngagement => {
            killing_engagement::run(workspace_path, request_id, assay_json, update_progress)
                .await
                .map_err(AnalysisError::Failed)
        }
        SupportedAssay::LnpBinding => {
            lnp_binding::run(workspace_path, request_id, assay_json, update_progress)
                .await
                .map_err(AnalysisError::Failed)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_assay_ids_dispatch_to_supported_pipelines() {
        assert_eq!(
            dispatch(AssayType::Transfection),
            Ok(SupportedAssay::Transfection)
        );
        assert_eq!(
            dispatch(AssayType::KillingDeathReporter),
            Ok(SupportedAssay::Killing)
        );
        assert_eq!(
            dispatch(AssayType::KillingEngagement),
            Ok(SupportedAssay::KillingEngagement)
        );
        assert_eq!(
            dispatch(AssayType::LnpBinding),
            Ok(SupportedAssay::LnpBinding)
        );
    }
}

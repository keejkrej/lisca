//! Per-assay analysis pipelines. Add a new submodule here when Studio supports
//! another `assayId`, then register it in `run`.

pub mod gene_expression;
pub mod immune_killing;

use std::path::PathBuf;

use crate::protocol::{AnalysisCsvFile, AnalysisProgress, AssayJsonFile, AssayName};

pub async fn run<F>(
    workspace_path: PathBuf,
    request_id: String,
    assay_json: AssayJsonFile,
    update_progress: F,
) -> Result<Vec<AnalysisCsvFile>, String>
where
    F: Fn(AnalysisProgress) + Send + Sync + 'static,
{
    match assay_json.assay_id {
        AssayName::ImmuneKilling => {
            immune_killing::run(workspace_path, request_id, assay_json, update_progress).await
        }
        AssayName::GeneExpression | AssayName::LnpBinding | AssayName::CustomAssay => {
            gene_expression::run(workspace_path, request_id, assay_json, update_progress).await
        }
    }
}

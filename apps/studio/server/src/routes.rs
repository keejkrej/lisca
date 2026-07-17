use std::path::{Path, PathBuf};

use axum::{
    extract::{DefaultBodyLimit, Query, State},
    routing::{get, post},
    Json, Router,
};
use lisca::http::FsError;
use lisca::{
    analysis,
    protocol::{
        AnalysisProgress, AnalysisProgressQuery, AnalysisStartRequest, LatestAnalysisQuery,
        SaveAssayJsonRequest, SaveAssayJsonResponse, SaveResultPdfRequest, SaveResultPdfResponse,
    },
};
use lisca_server::normalize_workspace_path;

use crate::analysis::HasAnalysisJobs;

pub fn router<S>() -> Router<S>
where
    S: HasAnalysisJobs + Clone + Send + Sync + 'static,
{
    Router::new()
        .route("/studio/save-assay-json", post(save_assay_json_handler))
        .route(
            "/studio/save-result-pdf",
            post(save_result_pdf_handler).layer(DefaultBodyLimit::max(32 * 1024 * 1024)),
        )
        .route("/studio/start-analysis", post(start_analysis_handler::<S>))
        .route(
            "/studio/analysis-progress",
            get(analysis_progress_handler::<S>),
        )
        .route(
            "/studio/latest-analysis",
            get(analysis_latest_progress_handler::<S>),
        )
        .route("/studio/analysis-results", get(analysis_results_handler))
}

async fn save_assay_json_handler(
    Json(payload): Json<SaveAssayJsonRequest>,
) -> Result<Json<SaveAssayJsonResponse>, FsError> {
    let save_to = payload.save_to.trim();
    if save_to.is_empty() {
        return Err(FsError::new("saveTo is required"));
    }

    let target = PathBuf::from(save_to).join("assay.json");
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| FsError::new(format!("failed to create assay folder: {error}")))?;
    }
    std::fs::write(&target, payload.contents)
        .map_err(|error| FsError::new(format!("failed to save assay.json: {error}")))?;

    Ok(Json(SaveAssayJsonResponse {
        ok: true,
        path: target.to_string_lossy().to_string(),
    }))
}

async fn save_result_pdf_handler(
    Json(payload): Json<SaveResultPdfRequest>,
) -> Result<Json<SaveResultPdfResponse>, FsError> {
    use base64::Engine;

    let workspace_path = payload.workspace_path.trim();
    if workspace_path.is_empty() {
        return Err(FsError::new("workspacePath is required"));
    }

    let file_name = payload.file_name.trim();
    if file_name.is_empty() {
        return Err(FsError::new("fileName is required"));
    }
    if file_name.contains('/') || file_name.contains('\\') {
        return Err(FsError::new(format!("invalid fileName: {file_name}")));
    }
    if !file_name.ends_with(".pdf") {
        return Err(FsError::new("fileName must end with .pdf"));
    }

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(payload.contents_base64.trim())
        .map_err(|error| FsError::new(format!("failed to decode {file_name}: {error}")))?;

    let results_dir = PathBuf::from(workspace_path).join("results");
    std::fs::create_dir_all(&results_dir)
        .map_err(|error| FsError::new(format!("failed to create results folder: {error}")))?;

    let target = results_dir.join(file_name);
    std::fs::write(&target, bytes)
        .map_err(|error| FsError::new(format!("failed to save {file_name}: {error}")))?;

    Ok(Json(SaveResultPdfResponse {
        ok: true,
        directory: results_dir.to_string_lossy().to_string(),
        path: target.to_string_lossy().to_string(),
    }))
}

async fn start_analysis_handler<S: HasAnalysisJobs>(
    State(state): State<S>,
    Json(payload): Json<AnalysisStartRequest>,
) -> Result<Json<AnalysisProgress>, FsError> {
    let analysis = state.analysis_jobs();
    let request_id = payload.request_id.trim();
    if request_id.is_empty() {
        return Err(FsError::new("analysis request id is required"));
    }

    let workspace_path = normalize_workspace_path(&payload.workspace_path);
    if workspace_path.is_empty() {
        return Err(FsError::new("analysis workspace path is required"));
    }

    let request_id = request_id.to_string();
    let workspace_path = workspace_path.to_string();
    let initial = AnalysisProgress {
        request_id: request_id.clone(),
        status: lisca::protocol::AnalysisStatus::Queued,
        stage: lisca::protocol::AnalysisStage::Queued,
        progress: 0.0,
        message: Some("Queued analysis".to_string()),
        result_files: Vec::new(),
        error: None,
    };
    let inserted = analysis
        .insert_unique(
            request_id.clone(),
            Some(workspace_path.clone()),
            initial.clone(),
        )
        .map_err(|_| FsError::new("analysis job state is poisoned"))?;
    if !inserted {
        return Err(FsError::new("analysis request id already exists"));
    }
    let jobs = analysis.clone();
    let path = PathBuf::from(workspace_path.clone());
    let run_request_id = request_id.clone();
    tokio::spawn(async move {
        let update_progress = {
            let jobs = jobs.clone();
            move |progress: AnalysisProgress| {
                let _ = jobs.update(&progress.request_id, |current| {
                    *current = progress.clone();
                });
            }
        };

        let result =
            analysis::run_analysis_pipeline(path.clone(), run_request_id.clone(), update_progress)
                .await;
        match result {
            Ok(result_files) => {
                let final_progress = AnalysisProgress {
                    request_id: run_request_id,
                    status: lisca::protocol::AnalysisStatus::Completed,
                    stage: lisca::protocol::AnalysisStage::Completed,
                    progress: 100.0,
                    message: Some("Completed".to_string()),
                    result_files,
                    error: None,
                };
                let _ = jobs.update(&final_progress.request_id, |current| {
                    *current = final_progress.clone();
                });
            }
            Err(error) => {
                let final_progress = AnalysisProgress {
                    request_id: run_request_id.clone(),
                    status: lisca::protocol::AnalysisStatus::Error,
                    stage: lisca::protocol::AnalysisStage::Queued,
                    progress: 0.0,
                    message: Some("Analysis failed".to_string()),
                    result_files: Vec::new(),
                    error: Some(error.to_string()),
                };
                let _ = jobs.update(&final_progress.request_id, |current| {
                    *current = final_progress.clone();
                });
            }
        }
    });

    Ok(Json(initial))
}

async fn analysis_progress_handler<S: HasAnalysisJobs>(
    State(state): State<S>,
    Query(query): Query<AnalysisProgressQuery>,
) -> Result<Json<AnalysisProgress>, FsError> {
    let analysis = state.analysis_jobs();
    analysis
        .get(&query.request_id)
        .map_err(|_| FsError::new("analysis job state is poisoned"))?
        .map(Json)
        .ok_or_else(|| FsError::new("analysis job not found"))
}

async fn analysis_latest_progress_handler<S: HasAnalysisJobs>(
    State(state): State<S>,
    Query(query): Query<LatestAnalysisQuery>,
) -> Result<Json<Option<AnalysisProgress>>, FsError> {
    let analysis = state.analysis_jobs();
    let workspace_path = normalize_workspace_path(&query.workspace_path);
    if workspace_path.is_empty() {
        return Err(FsError::new("analysis workspace path is required"));
    }

    let latest = analysis
        .latest(&workspace_path)
        .map_err(|_| FsError::new("analysis job state is poisoned"))?;
    let Some(progress) = latest else {
        let workspace = Path::new(&workspace_path);
        let result_files = match analysis::workspace_analysis_manifest(workspace) {
            Ok(result_files) if !result_files.is_empty() => result_files,
            Ok(_) => return Ok(Json(None)),
            Err(_) => return Ok(Json(None)),
        };

        let synthetic = AnalysisProgress {
            request_id: workspace_path.clone(),
            status: lisca::protocol::AnalysisStatus::Completed,
            stage: lisca::protocol::AnalysisStage::Completed,
            progress: 100.0,
            message: Some("Using existing workspace CSV results".to_string()),
            result_files,
            error: None,
        };
        return Ok(Json(Some(synthetic)));
    };
    Ok(Json(Some(progress)))
}

async fn analysis_results_handler(
    Query(query): Query<LatestAnalysisQuery>,
) -> Result<Json<Option<AnalysisProgress>>, FsError> {
    let workspace_path = normalize_workspace_path(&query.workspace_path);
    if workspace_path.is_empty() {
        return Err(FsError::new("analysis workspace path is required"));
    }
    let workspace = Path::new(&workspace_path);
    if !workspace.is_dir() {
        return Ok(Json(None));
    }

    let result_files = match analysis::workspace_analysis_manifest(workspace) {
        Ok(result_files) if !result_files.is_empty() => result_files,
        Ok(_) => return Ok(Json(None)),
        Err(_) => return Ok(Json(None)),
    };

    let synthetic = AnalysisProgress {
        request_id: workspace_path,
        status: lisca::protocol::AnalysisStatus::Completed,
        stage: lisca::protocol::AnalysisStage::Completed,
        progress: 100.0,
        message: Some("Loaded workspace results".to_string()),
        result_files,
        error: None,
    };
    Ok(Json(Some(synthetic)))
}

#[cfg(test)]
mod tests {
    use std::{
        fs,
        path::PathBuf,
        time::{Duration, SystemTime, UNIX_EPOCH},
    };

    use axum::extract::State;
    use lisca::protocol::{AnalysisProgress, AnalysisStartRequest, AnalysisStatus, AssayType};

    use super::start_analysis_handler;
    use crate::analysis::{AnalysisJobState, HasAnalysisJobs};

    #[derive(Clone, Default)]
    struct TestState {
        analysis: AnalysisJobState,
    }

    impl HasAnalysisJobs for TestState {
        fn analysis_jobs(&self) -> &AnalysisJobState {
            &self.analysis
        }
    }

    fn test_workspace(assay_id: AssayType) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after the Unix epoch")
            .as_nanos();
        let workspace = std::env::temp_dir().join(format!(
            "lisca-studio-unsupported-assay-{}-{nonce}",
            std::process::id()
        ));
        fs::create_dir_all(&workspace).expect("test workspace should be created");

        let assay = format!(
            r#"{{
                "assayId": "{assay_id}",
                "assayLabel": "Unsupported assay",
                "dataSourceKind": null,
                "info1": {{
                    "dataPath": "",
                    "folderFilenameTemplate": "",
                    "folderSubfolderTemplate": "",
                    "name": "Unsupported assay",
                    "saveTo": ""
                }},
                "info2": {{
                    "selectedFeatures": [],
                    "timelapseAmount": 1.0,
                    "timelapseUnit": "minute"
                }},
                "info3": {{ "samples": [] }}
            }}"#
        );
        fs::write(workspace.join("assay.json"), assay).expect("assay fixture should be written");
        workspace
    }

    async fn wait_for_terminal_progress(state: &TestState, request_id: &str) -> AnalysisProgress {
        for _ in 0..100 {
            let progress = state
                .analysis
                .get(request_id)
                .expect("analysis job state should not be poisoned")
                .expect("analysis job should exist");
            if progress.status == AnalysisStatus::Error {
                return progress;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
        panic!("analysis did not reach an error state");
    }

    #[tokio::test]
    async fn unsupported_assays_surface_their_ids_in_analysis_progress() {
        for assay_id in [AssayType::LnpBinding, AssayType::CustomAssay] {
            let state = TestState::default();
            let workspace = test_workspace(assay_id);
            let request_id = format!("unsupported-{assay_id}");
            let request = AnalysisStartRequest {
                request_id: request_id.clone(),
                workspace_path: workspace.to_string_lossy().into_owned(),
            };

            let _ = start_analysis_handler(State(state.clone()), axum::Json(request))
                .await
                .expect("analysis request should be accepted");

            let progress = wait_for_terminal_progress(&state, &request_id).await;
            assert_eq!(progress.message.as_deref(), Some("Analysis failed"));
            let error = progress.error.expect("analysis error should be visible");
            assert!(error.contains("unsupported assay id"));
            assert!(error.contains(&assay_id.to_string()));

            fs::remove_dir_all(workspace).expect("test workspace should be removed");
        }
    }
}

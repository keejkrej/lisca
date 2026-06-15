use std::path::{Path, PathBuf};

use axum::{
    extract::{DefaultBodyLimit, Query, State},
    routing::{get, post},
    Json, Router,
};
use lisca::{
    analysis,
    protocol::{
        AnalysisProgress, AnalysisStartRequest, SaveAssayJsonRequest, SaveAssayJsonResponse,
        SaveResultPdfRequest, SaveResultPdfResponse,
    },
};
use lisca::http::FsError;
use serde::Deserialize;

use crate::analysis::{normalize_workspace_path, HasAnalysisJobs};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AnalysisProgressQuery {
    request_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LatestAnalysisQuery {
    workspace_path: String,
}

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
        .route("/studio/analysis-progress", get(analysis_progress_handler::<S>))
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
    {
        let mut jobs = analysis
            .jobs
            .lock()
            .map_err(|_| FsError::new("analysis job state is poisoned"))?;
        if jobs.contains_key(&request_id) {
            return Err(FsError::new("analysis request id already exists"));
        }
        jobs.insert(request_id.clone(), initial.clone());
        let mut requests = analysis
            .workspace_requests
            .lock()
            .map_err(|_| FsError::new("analysis workspace request map is poisoned"))?;
        requests.insert(workspace_path.clone(), request_id.clone());
    }
    let jobs = analysis.jobs.clone();
    let path = PathBuf::from(workspace_path.clone());
    let run_request_id = request_id.clone();
    tokio::spawn(async move {
        let update_progress = {
            let jobs = jobs.clone();
            move |progress: AnalysisProgress| {
                if let Ok(mut jobs) = jobs.lock() {
                    jobs.insert(progress.request_id.clone(), progress.clone());
                }
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
                if let Ok(mut jobs) = jobs.lock() {
                    jobs.insert(final_progress.request_id.clone(), final_progress.clone());
                }
            }
            Err(error) => {
                let final_progress = AnalysisProgress {
                    request_id: run_request_id.clone(),
                    status: lisca::protocol::AnalysisStatus::Error,
                    stage: lisca::protocol::AnalysisStage::Queued,
                    progress: 0.0,
                    message: Some("Analysis failed".to_string()),
                    result_files: Vec::new(),
                    error: Some(error),
                };
                if let Ok(mut jobs) = jobs.lock() {
                    jobs.insert(final_progress.request_id.clone(), final_progress.clone());
                }
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
    let jobs = analysis
        .jobs
        .lock()
        .map_err(|_| FsError::new("analysis job state is poisoned"))?;
    jobs.get(&query.request_id)
        .cloned()
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

    let request_id = {
        let requests = analysis
            .workspace_requests
            .lock()
            .map_err(|_| FsError::new("analysis workspace request map is poisoned"))?;
        requests.get(&workspace_path).cloned()
    };

    let Some(request_id) = request_id else {
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

    let jobs = analysis
        .jobs
        .lock()
        .map_err(|_| FsError::new("analysis job state is poisoned"))?;
    Ok(Json(jobs.get(&request_id).cloned()))
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

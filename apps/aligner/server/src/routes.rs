use std::sync::{
    atomic::{AtomicBool, Ordering as AtomicOrdering},
    Arc,
};

use axum::{
    extract::{Query, State},
    routing::{get, post},
    Json, Router,
};
use lisca::{
    aligner,
    protocol::{
        AlignerSource, AutoExcludePreviewRequest, ContrastWindow, CropRoiProgress,
        CropRoiRequest, CropRoiStatus, FrameRequest, SavedAlignState,
    },
};
use lisca::http::FsError;
use serde::Deserialize;

use crate::crop::{normalize_workspace_path, CropJob, HasCropJobs};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScanSourcePayload {
    source: AlignerSource,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LoadFramePayload {
    source: AlignerSource,
    request: FrameRequest,
    contrast: Option<ContrastWindow>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveBboxPayload {
    workspace_path: String,
    pos: u32,
    csv: String,
    align_state: SavedAlignState,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LoadAlignStateQuery {
    workspace_path: String,
    pos: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkspacePosQuery {
    workspace_path: String,
    pos: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CropProgressQuery {
    request_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CancelCropPayload {
    request_id: String,
}

#[derive(Debug, Deserialize)]
struct OutputPathsQuery {
    pos: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkspacePathPayload {
    workspace_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LatestCropQuery {
    workspace_path: String,
}

pub fn router<S>() -> Router<S>
where
    S: HasCropJobs + Clone + Send + Sync + 'static,
{
    Router::new()
        .route("/align/scan-source", post(scan_source_handler))
        .route("/align/load-frame", post(load_frame_handler))
        .route(
            "/align/auto-exclude-preview",
            post(auto_exclude_preview_handler),
        )
        .route("/align/save-bbox", post(save_bbox_handler))
        .route("/align/align-state", get(load_align_state_handler))
        .route("/align/output-paths", get(output_paths_handler))
        .route(
            "/align/saved-bbox-positions",
            get(saved_bbox_positions_handler),
        )
        .route("/align/roi-pos-exists", get(roi_pos_exists_handler))
        .route("/align/crop-roi", post(crop_roi_handler::<S>))
        .route("/align/cancel-crop-roi", post(cancel_crop_roi_handler::<S>))
        .route("/align/crop-roi-progress", get(crop_roi_progress_handler::<S>))
        .route("/align/crop-latest", get(crop_latest_progress_handler::<S>))
}

async fn scan_source_handler(
    Json(payload): Json<ScanSourcePayload>,
) -> Result<Json<lisca::protocol::WorkspaceScan>, FsError> {
    aligner::scan_source(payload.source)
        .map(Json)
        .map_err(FsError::new)
}

async fn load_frame_handler(
    Json(payload): Json<LoadFramePayload>,
) -> Result<Json<lisca::protocol::FramePayload>, FsError> {
    aligner::load_frame_payload(payload.source, payload.request, payload.contrast)
        .map(Json)
        .map_err(FsError::new)
}

async fn auto_exclude_preview_handler(
    Json(request): Json<AutoExcludePreviewRequest>,
) -> Result<Json<lisca::protocol::AutoExcludePreviewResponse>, FsError> {
    aligner::auto_exclude_preview(request)
        .map(Json)
        .map_err(FsError::new)
}

async fn save_bbox_handler(
    Json(payload): Json<SaveBboxPayload>,
) -> Result<Json<lisca::protocol::SaveBboxResponse>, FsError> {
    aligner::save_bbox(
        &payload.workspace_path,
        payload.pos,
        &payload.csv,
        &payload.align_state,
    )
    .map(Json)
    .map_err(FsError::new)
}

async fn load_align_state_handler(
    Query(query): Query<LoadAlignStateQuery>,
) -> Result<Json<Option<SavedAlignState>>, FsError> {
    aligner::load_align_state(&query.workspace_path, query.pos)
        .map(Json)
        .map_err(FsError::new)
}

async fn output_paths_handler(
    Query(query): Query<OutputPathsQuery>,
) -> Json<lisca::protocol::AlignOutputPaths> {
    Json(aligner::output_paths(query.pos))
}

async fn saved_bbox_positions_handler(
    Query(query): Query<WorkspacePathPayload>,
) -> Result<Json<Vec<u32>>, FsError> {
    aligner::list_saved_bbox_positions(&query.workspace_path)
        .map(Json)
        .map_err(FsError::new)
}

async fn roi_pos_exists_handler(
    Query(query): Query<WorkspacePosQuery>,
) -> Json<lisca::protocol::RoiPosExistsResponse> {
    Json(lisca::protocol::RoiPosExistsResponse {
        exists: aligner::roi_pos_exists(&query.workspace_path, query.pos),
    })
}

async fn crop_roi_handler<S: HasCropJobs>(
    State(state): State<S>,
    Json(request): Json<CropRoiRequest>,
) -> Result<Json<lisca::protocol::CropRoiResponse>, FsError> {
    let crop = state.crop_jobs();
    if request.request_id.trim().is_empty() {
        return Err(FsError::new("crop request id is required"));
    }

    let progress = CropRoiProgress {
        request_id: request.request_id.clone(),
        status: CropRoiStatus::Queued,
        position: None,
        completed_positions: 0,
        total_positions: request.positions.len() as u32,
        completed_rois: 0,
        total_rois: 0,
        message: Some("Queued crop".to_string()),
        error: None,
        skipped_positions: Vec::new(),
    };
    let cancel = Arc::new(AtomicBool::new(false));
    let workspace_path = normalize_workspace_path(&request.workspace_path);
    {
        let mut jobs = crop
            .jobs
            .lock()
            .map_err(|_| FsError::new("crop job state is poisoned"))?;
        if jobs.contains_key(&request.request_id) {
            return Err(FsError::new("crop request id already exists"));
        }
        jobs.insert(
            request.request_id.clone(),
            CropJob {
                progress: progress.clone(),
                cancel: cancel.clone(),
            },
        );
    }
    if !workspace_path.is_empty() {
        let mut requests = crop
            .workspace_requests
            .lock()
            .map_err(|_| FsError::new("crop workspace request map is poisoned"))?;
        requests.insert(workspace_path, request.request_id.clone());
    }
    let request_id = request.request_id.clone();
    let jobs = crop.jobs.clone();
    tokio::task::spawn_blocking(move || {
        let update_jobs = jobs.clone();
        let result = aligner::crop_roi(request, &cancel, |progress| {
            if let Ok(mut jobs) = update_jobs.lock() {
                if let Some(job) = jobs.get_mut(&progress.request_id) {
                    job.progress = progress.clone();
                }
            }
        });

        if let Err(error) = result {
            if let Ok(mut jobs) = jobs.lock() {
                if let Some(job) = jobs.get_mut(&request_id) {
                    job.progress.status = CropRoiStatus::Error;
                    job.progress.error = Some(error);
                    job.progress.message = Some("Crop failed".to_string());
                }
            }
        }
    });

    Ok(Json(lisca::protocol::CropRoiResponse {
        request_id: progress.request_id,
        status: CropRoiStatus::Queued,
    }))
}

async fn cancel_crop_roi_handler<S: HasCropJobs>(
    State(state): State<S>,
    Json(payload): Json<CancelCropPayload>,
) -> Result<Json<CropRoiProgress>, FsError> {
    let crop = state.crop_jobs();
    let mut jobs = crop
        .jobs
        .lock()
        .map_err(|_| FsError::new("crop job state is poisoned"))?;
    let job = jobs
        .get_mut(&payload.request_id)
        .ok_or_else(|| FsError::new("crop job not found"))?;
    job.cancel.store(true, AtomicOrdering::SeqCst);
    if matches!(
        job.progress.status,
        CropRoiStatus::Queued | CropRoiStatus::Running
    ) {
        job.progress.status = CropRoiStatus::Cancelled;
        job.progress.message = Some("Crop cancellation requested".to_string());
    }
    Ok(Json(job.progress.clone()))
}

async fn crop_roi_progress_handler<S: HasCropJobs>(
    State(state): State<S>,
    Query(query): Query<CropProgressQuery>,
) -> Result<Json<CropRoiProgress>, FsError> {
    let crop = state.crop_jobs();
    let jobs = crop
        .jobs
        .lock()
        .map_err(|_| FsError::new("crop job state is poisoned"))?;
    jobs.get(&query.request_id)
        .map(|job| Json(job.progress.clone()))
        .ok_or_else(|| FsError::new("crop job not found"))
}

fn crop_progress_is_active(status: CropRoiStatus) -> bool {
    matches!(status, CropRoiStatus::Queued | CropRoiStatus::Running)
}

async fn crop_latest_progress_handler<S: HasCropJobs>(
    State(state): State<S>,
    Query(query): Query<LatestCropQuery>,
) -> Result<Json<Option<CropRoiProgress>>, FsError> {
    let crop = state.crop_jobs();
    let workspace_path = normalize_workspace_path(&query.workspace_path);
    if workspace_path.is_empty() {
        return Err(FsError::new("crop workspace path is required"));
    }

    let request_id = {
        let requests = crop
            .workspace_requests
            .lock()
            .map_err(|_| FsError::new("crop workspace request map is poisoned"))?;
        requests.get(&workspace_path).cloned()
    };

    let Some(request_id) = request_id else {
        return Ok(Json(None));
    };

    let jobs = crop
        .jobs
        .lock()
        .map_err(|_| FsError::new("crop job state is poisoned"))?;
    let Some(job) = jobs.get(&request_id) else {
        return Ok(Json(None));
    };
    if crop_progress_is_active(job.progress.status) {
        Ok(Json(Some(job.progress.clone())))
    } else {
        Ok(Json(None))
    }
}

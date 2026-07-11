use std::sync::{
    atomic::{AtomicBool, Ordering as AtomicOrdering},
    Arc,
};

use axum::{
    extract::{Query, State},
    routing::{get, post},
    Json, Router,
};
use lisca::http::FsError;
use lisca::{
    aligner,
    protocol::{
        CancelCropRoiRequest, CropRoiProgress, CropRoiProgressQuery, CropRoiRequest, CropRoiStatus,
        LatestCropQuery, LoadAlignStateQuery, LoadFrameRequest, OutputPathsQuery,
        RoiPosExistsQuery, SaveBboxRequest, SavedAlignState, SavedBboxPositionsQuery,
        ScanSourceRequest,
    },
};
use lisca_server_common::normalize_workspace_path;

use crate::crop::{CropJob, HasCropJobs};

pub fn router<S>() -> Router<S>
where
    S: HasCropJobs + Clone + Send + Sync + 'static,
{
    Router::new()
        .route("/align/scan-source", post(scan_source_handler))
        .route("/align/load-frame", post(load_frame_handler))
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
        .route(
            "/align/crop-roi-progress",
            get(crop_roi_progress_handler::<S>),
        )
        .route("/align/crop-latest", get(crop_latest_progress_handler::<S>))
}

async fn scan_source_handler(
    Json(payload): Json<ScanSourceRequest>,
) -> Result<Json<lisca::protocol::WorkspaceScan>, FsError> {
    aligner::scan_source(payload.source)
        .map(Json)
        .map_err(FsError::new)
}

async fn load_frame_handler(
    Json(payload): Json<LoadFrameRequest>,
) -> Result<Json<lisca::protocol::FramePayload>, FsError> {
    aligner::load_frame_payload(payload.source, payload.request, payload.contrast)
        .map(Json)
        .map_err(FsError::new)
}

async fn save_bbox_handler(
    Json(payload): Json<SaveBboxRequest>,
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
    Query(query): Query<SavedBboxPositionsQuery>,
) -> Result<Json<Vec<u32>>, FsError> {
    aligner::list_saved_bbox_positions(&query.workspace_path)
        .map(Json)
        .map_err(FsError::new)
}

async fn roi_pos_exists_handler(
    Query(query): Query<RoiPosExistsQuery>,
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
    let inserted = crop
        .insert_unique(
            request.request_id.clone(),
            (!workspace_path.is_empty()).then_some(workspace_path),
            CropJob {
                progress: progress.clone(),
                cancel: cancel.clone(),
            },
        )
        .map_err(|_| FsError::new("crop job state is poisoned"))?;
    if !inserted {
        return Err(FsError::new("crop request id already exists"));
    }
    let request_id = request.request_id.clone();
    let jobs = crop.clone();
    tokio::task::spawn_blocking(move || {
        let update_jobs = jobs.clone();
        let result = aligner::crop_roi(request, &cancel, |progress| {
            let _ = update_jobs.update(&progress.request_id, |job| {
                job.progress = progress.clone();
            });
        });

        if let Err(error) = result {
            let _ = jobs.update(&request_id, |job| {
                job.progress.status = CropRoiStatus::Error;
                job.progress.error = Some(error);
                job.progress.message = Some("Crop failed".to_string());
            });
        }
    });

    Ok(Json(lisca::protocol::CropRoiResponse {
        request_id: progress.request_id,
        status: CropRoiStatus::Queued,
    }))
}

async fn cancel_crop_roi_handler<S: HasCropJobs>(
    State(state): State<S>,
    Json(payload): Json<CancelCropRoiRequest>,
) -> Result<Json<CropRoiProgress>, FsError> {
    let crop = state.crop_jobs();
    let job = crop
        .update_and_get(&payload.request_id, |job| {
            job.cancel.store(true, AtomicOrdering::SeqCst);
            if matches!(
                job.progress.status,
                CropRoiStatus::Queued | CropRoiStatus::Running
            ) {
                job.progress.status = CropRoiStatus::Cancelled;
                job.progress.message = Some("Crop cancellation requested".to_string());
            }
        })
        .map_err(|_| FsError::new("crop job state is poisoned"))?
        .ok_or_else(|| FsError::new("crop job not found"))?;
    Ok(Json(job.progress))
}

async fn crop_roi_progress_handler<S: HasCropJobs>(
    State(state): State<S>,
    Query(query): Query<CropRoiProgressQuery>,
) -> Result<Json<CropRoiProgress>, FsError> {
    let crop = state.crop_jobs();
    crop.get(&query.request_id)
        .map_err(|_| FsError::new("crop job state is poisoned"))?
        .map(|job| Json(job.progress))
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

    let Some(job) = crop
        .latest(&workspace_path)
        .map_err(|_| FsError::new("crop job state is poisoned"))?
    else {
        return Ok(Json(None));
    };
    if crop_progress_is_active(job.progress.status) {
        Ok(Json(Some(job.progress)))
    } else {
        Ok(Json(None))
    }
}

use std::sync::{atomic::AtomicBool, Arc};

use crate::crop::{CropJob, CropJobStateError, CropSubmission, HasCropJobs};
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
        .route("/align/smart-exclude", post(smart_exclude_handler))
}

async fn smart_exclude_handler(
    Json(payload): Json<lisca::protocol::SmartExcludeRequest>,
) -> Result<Json<lisca::protocol::SmartExcludeResponse>, FsError> {
    lisca::smart::exclude::classify_exclusion(payload)
        .map(Json)
        .map_err(FsError::new)
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
    if request.workspace_path.trim().is_empty() {
        return Err(FsError::new("crop workspace path is required"));
    }
    let submission = crop
        .submit_or_attach(
            &request.workspace_path,
            request.request_id.clone(),
            CropJob {
                progress: progress.clone(),
                cancel: cancel.clone(),
            },
        )
        .map_err(|error| match error {
            CropJobStateError::RequestIdConflict => {
                FsError::new("crop request id belongs to another workspace")
            }
            CropJobStateError::Poisoned => FsError::new("crop job state is poisoned"),
        })?;
    let (job, disposition) = match submission {
        CropSubmission::Attached(job) => (job, lisca::protocol::CropRoiDisposition::Attached),
        CropSubmission::Started(job) => {
            let request_id = request.request_id.clone();
            let jobs = crop.clone();
            tokio::task::spawn_blocking(move || {
                let update_jobs = jobs.clone();
                let result = aligner::crop_roi(request, &cancel, |progress| {
                    let request_id = progress.request_id.clone();
                    let _ = update_jobs.update_progress(&request_id, progress);
                });

                if let Err(error) = result {
                    let _ = jobs.mark_error(&request_id, error);
                }
                let _ = jobs.mark_worker_finished(&request_id);
            });
            (job, lisca::protocol::CropRoiDisposition::Started)
        }
    };

    Ok(Json(lisca::protocol::CropRoiResponse {
        request_id: job.progress.request_id,
        status: job.progress.status,
        disposition,
    }))
}

async fn cancel_crop_roi_handler<S: HasCropJobs>(
    State(state): State<S>,
    Json(payload): Json<CancelCropRoiRequest>,
) -> Result<Json<CropRoiProgress>, FsError> {
    let crop = state.crop_jobs();
    let job = crop
        .cancel(&payload.request_id)
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

async fn crop_latest_progress_handler<S: HasCropJobs>(
    State(state): State<S>,
    Query(query): Query<LatestCropQuery>,
) -> Result<Json<Option<CropRoiProgress>>, FsError> {
    let crop = state.crop_jobs();
    if query.workspace_path.trim().is_empty() {
        return Err(FsError::new("crop workspace path is required"));
    }

    let job = crop
        .latest(&query.workspace_path)
        .map_err(|_| FsError::new("crop job state is poisoned"))?
        .map(|job| job.progress);
    Ok(Json(job))
}

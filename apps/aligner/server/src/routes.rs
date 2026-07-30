use std::{collections::HashSet, sync::Arc};

use crate::crop::{CropJobStateError, CropTaskMetadata, HasCropJobs};
use axum::{
    extract::{Query, State},
    routing::{get, post},
    Json, Router,
};
use lisca::http::FsError;
use lisca::{
    aligner,
    protocol::{
        CancelCropRoiRequest, CropRoiProgress, CropRoiProgressQuery, CropRoiRequest,
        LatestCropQuery, LoadAlignStateQuery, LoadFrameRequest, OutputPathsQuery,
        RoiPosExistsQuery, SaveBboxRequest, SavedAlignState, SavedBboxPositionsQuery,
        ScanSourceRequest,
    },
};
use lisca_server::{HasTaskScheduler, OperationSpec, TaskFailure, TaskSpec};

pub fn router<S>() -> Router<S>
where
    S: HasCropJobs + HasTaskScheduler + Clone + Send + Sync + 'static,
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

async fn crop_roi_handler<S: HasCropJobs + HasTaskScheduler>(
    State(state): State<S>,
    Json(request): Json<CropRoiRequest>,
) -> Result<Json<lisca::protocol::CropRoiResponse>, FsError> {
    if request.request_id.trim().is_empty() {
        return Err(FsError::new("crop request id is required"));
    }
    if request.workspace_path.trim().is_empty() {
        return Err(FsError::new("crop workspace path is required"));
    }
    let positions = if request.positions.is_empty() {
        aligner::list_saved_bbox_positions(&request.workspace_path).map_err(FsError::new)?
    } else {
        request.positions.clone()
    };
    if positions.is_empty() {
        return Err(FsError::new("no positions selected for crop"));
    }
    let mut unique_positions = HashSet::with_capacity(positions.len());
    if let Some(duplicate) = positions
        .iter()
        .find(|position| !unique_positions.insert(**position))
    {
        return Err(FsError::new(format!(
            "duplicate crop position Pos{duplicate}"
        )));
    }
    let source = request.source.clone();
    let scan = Arc::new(
        tokio::task::spawn_blocking(move || aligner::scan_source(source))
            .await
            .map_err(|error| FsError::new(format!("crop planning worker failed: {error}")))?
            .map_err(FsError::new)?,
    );

    let crop = state.crop_jobs();
    let scheduler = state.task_scheduler();
    let request_id = request.request_id.clone();
    let workspace_path = request.workspace_path.clone();
    let submission = crop
        .submit_or_attach(scheduler, &workspace_path, &request_id, || {
            build_crop_operation(scheduler, request, scan, positions)
        })
        .map_err(crop_state_error)?;
    let progress = crop
        .progress(scheduler, &submission.record.request_id)
        .map_err(crop_state_error)?
        .expect("submitted crop is indexed");

    Ok(Json(lisca::protocol::CropRoiResponse {
        request_id: submission.record.request_id,
        status: progress.status,
        disposition: submission.disposition,
    }))
}

async fn cancel_crop_roi_handler<S: HasCropJobs + HasTaskScheduler>(
    State(state): State<S>,
    Json(payload): Json<CancelCropRoiRequest>,
) -> Result<Json<CropRoiProgress>, FsError> {
    let crop = state.crop_jobs();
    let progress = crop
        .cancel(state.task_scheduler(), &payload.request_id)
        .map_err(crop_state_error)?
        .ok_or_else(|| FsError::new("crop job not found"))?;
    Ok(Json(progress))
}

async fn crop_roi_progress_handler<S: HasCropJobs + HasTaskScheduler>(
    State(state): State<S>,
    Query(query): Query<CropRoiProgressQuery>,
) -> Result<Json<CropRoiProgress>, FsError> {
    let crop = state.crop_jobs();
    crop.progress(state.task_scheduler(), &query.request_id)
        .map_err(crop_state_error)?
        .map(Json)
        .ok_or_else(|| FsError::new("crop job not found"))
}

async fn crop_latest_progress_handler<S: HasCropJobs + HasTaskScheduler>(
    State(state): State<S>,
    Query(query): Query<LatestCropQuery>,
) -> Result<Json<Option<CropRoiProgress>>, FsError> {
    let crop = state.crop_jobs();
    if query.workspace_path.trim().is_empty() {
        return Err(FsError::new("crop workspace path is required"));
    }

    let progress = crop
        .latest_progress(state.task_scheduler(), &query.workspace_path)
        .map_err(crop_state_error)?;
    Ok(Json(progress))
}

fn crop_state_error(error: CropJobStateError) -> FsError {
    match error {
        CropJobStateError::RequestIdConflict => {
            FsError::new("crop request id belongs to another workspace")
        }
        CropJobStateError::Poisoned => FsError::new("crop operation index is poisoned"),
        CropJobStateError::Scheduler(error) => FsError::new(error.to_string()),
    }
}

fn build_crop_operation(
    scheduler: &lisca_server::TaskScheduler,
    request: CropRoiRequest,
    scan: Arc<lisca::protocol::WorkspaceScan>,
    positions: Vec<u32>,
) -> Result<(lisca::protocol::OperationDetail, Vec<CropTaskMetadata>), lisca_server::SchedulerError>
{
    let workspace_path = request.workspace_path.clone();
    let request = Arc::new(request);
    let mut metadata = Vec::with_capacity(positions.len());
    let mut tasks = Vec::with_capacity(positions.len());
    for pos in positions {
        let summary = aligner::inspect_crop_position(&workspace_path, &scan, pos).unwrap_or(
            lisca::aligner::CropPositionOutput {
                roi_pages: 0,
                skipped: false,
            },
        );
        let task_request = request.clone();
        let task_scan = scan.clone();
        let total_pages = summary.roi_pages;
        let task = TaskSpec::new(format!("crop-roi/Pos{pos}"), 1, move |context| {
            let request = task_request.clone();
            let scan = task_scan.clone();
            async move {
                context.checkpoint()?;
                tokio::task::spawn_blocking(move || {
                    aligner::crop_roi_position_with_progress(
                        &request,
                        &scan,
                        pos,
                        || context.is_cancellation_requested(),
                        |completed| {
                            let _ = context.report_work_progress(
                                "roiframe",
                                completed,
                                total_pages,
                                Some("writing".to_string()),
                                Some(format!("Writing Pos{pos}")),
                            );
                        },
                    )
                    .map(|_| ())
                    .map_err(|error| match error {
                        aligner::CropPositionError::Cancelled => TaskFailure::cancelled(),
                        aligner::CropPositionError::Failed(message) => {
                            TaskFailure::new("crop_position_failed", message)
                        }
                    })
                })
                .await
                .map_err(|error| TaskFailure::new("crop_worker_failed", error.to_string()))?
            }
        });
        metadata.push(CropTaskMetadata {
            task_id: task.task_id().to_string(),
            position: pos,
            roi_pages: summary.roi_pages,
            skipped: summary.skipped,
        });
        tasks.push(task);
    }
    scheduler
        .submit(OperationSpec::new("crop-roi", workspace_path, true, tasks))
        .map(|detail| (detail, metadata))
}

#[cfg(test)]
mod crop_task_tests {
    use super::*;
    use image::{GrayImage, Luma};
    use lisca::protocol::{AlignerSource, OperationStatus, WorkspaceScan};
    use lisca_server::{SchedulerConfig, TaskScheduler};
    use std::{fs, path::Path};

    async fn wait_until_terminal(scheduler: &TaskScheduler, operation_id: &str) {
        for _ in 0..1_000 {
            let status = scheduler
                .operation(operation_id)
                .expect("operation")
                .operation
                .status;
            if matches!(
                status,
                OperationStatus::Completed
                    | OperationStatus::Failed
                    | OperationStatus::PartiallyComplete
                    | OperationStatus::Cancelled
            ) {
                return;
            }
            tokio::task::yield_now().await;
        }
        panic!("crop operation did not become terminal");
    }

    #[tokio::test]
    async fn one_hundred_positions_create_exactly_one_hundred_bounded_tasks() {
        let workspace = tempfile::tempdir().expect("workspace");
        let scheduler = TaskScheduler::new(SchedulerConfig {
            capacity: 1,
            history_cap: 10,
        })
        .expect("scheduler");
        let positions = (1..=100).collect::<Vec<_>>();
        let request = CropRoiRequest {
            output_format: None,
            overwrite: true,
            positions: positions.clone(),
            request_id: "crop-100".to_string(),
            source: AlignerSource::Folder {
                path: workspace
                    .path()
                    .join("source")
                    .to_string_lossy()
                    .into_owned(),
                subfolder_template: "Pos{p}".to_string(),
                filename_template: "img_{t}_{c}_{z}".to_string(),
            },
            workspace_path: workspace.path().to_string_lossy().into_owned(),
        };
        let scan = Arc::new(WorkspaceScan {
            positions: positions.clone(),
            channels: vec![0],
            times: vec![0],
            z_slices: vec![0],
            position_labels: Vec::new(),
            channel_labels: Vec::new(),
            time_labels: Vec::new(),
            z_slice_labels: Vec::new(),
        });

        let (detail, metadata) =
            build_crop_operation(&scheduler, request, scan, positions).expect("crop operation");

        assert_eq!(detail.operation.progress.total, 100);
        assert_eq!(detail.tasks.len(), 100);
        assert_eq!(metadata.len(), 100);
        for (index, task) in detail.tasks.iter().enumerate() {
            assert_eq!(task.task_kind, format!("crop-roi/Pos{}", index + 1));
        }
    }

    #[tokio::test]
    async fn failed_position_retry_preserves_completed_sibling_and_attempt_history() {
        let root = tempfile::tempdir().expect("root");
        let workspace = root.path().join("workspace");
        let source = root.path().join("source");
        fs::create_dir_all(workspace.join("bbox")).expect("bbox dir");
        for pos in [1_u32, 2] {
            let source_pos = source.join(format!("Pos{pos}"));
            fs::create_dir_all(&source_pos).expect("source position");
            GrayImage::from_pixel(4, 4, Luma([pos as u8]))
                .save(source_pos.join("img_0_0_0.png"))
                .expect("frame");
        }
        fs::write(workspace.join("bbox/Pos1.csv"), "roi,x,y,w,h\n1,0,0,2,2\n").expect("valid bbox");
        fs::write(workspace.join("bbox/Pos2.csv"), "roi,x,y,w,h\n1,3,3,4,4\n")
            .expect("invalid bbox");
        let request = CropRoiRequest {
            output_format: None,
            overwrite: true,
            positions: vec![1, 2],
            request_id: "crop-retry".to_string(),
            source: AlignerSource::Folder {
                path: source.to_string_lossy().into_owned(),
                subfolder_template: "Pos{p}".to_string(),
                filename_template: "img_{t}_{c}_{z}".to_string(),
            },
            workspace_path: workspace.to_string_lossy().into_owned(),
        };
        let scan = Arc::new(aligner::scan_source(request.source.clone()).expect("scan"));
        let scheduler = TaskScheduler::new(SchedulerConfig {
            capacity: 2,
            history_cap: 10,
        })
        .expect("scheduler");
        let crop_state = crate::CropJobState::new();
        let workspace_path = workspace.to_string_lossy().into_owned();
        let submitted = crop_state
            .submit_or_attach(&scheduler, &workspace_path, "crop-retry", || {
                build_crop_operation(&scheduler, request, scan, vec![1, 2])
            })
            .expect("submit");
        let metadata = submitted.record.tasks.clone();
        wait_until_terminal(&scheduler, &submitted.record.operation_id).await;
        let first = scheduler
            .operation(&submitted.record.operation_id)
            .expect("first outcome");
        assert_eq!(first.operation.status, OperationStatus::PartiallyComplete);
        assert_eq!(first.operation.progress.completed, 1);
        assert_eq!(first.operation.progress.failed, 1);
        let first_progress = crop_state
            .progress(&scheduler, "crop-retry")
            .expect("progress projection")
            .expect("crop progress");
        assert_eq!(first_progress.status, lisca::protocol::CropRoiStatus::Error);
        assert_eq!(first_progress.completed_positions, 1);
        assert_eq!(first_progress.total_positions, 2);
        let sibling_index = fs::read(workspace.join("roi/Pos1/index.json")).expect("sibling index");
        assert!(!workspace.join("roi/Pos2").exists());

        fs::write(workspace.join("bbox/Pos2.csv"), "roi,x,y,w,h\n1,0,0,2,2\n").expect("fixed bbox");
        let failed_task = metadata
            .iter()
            .find(|task| task.position == 2)
            .expect("position 2 task");
        scheduler
            .retry_task(&failed_task.task_id)
            .expect("retry failed position");
        wait_until_terminal(&scheduler, &submitted.record.operation_id).await;

        let retried = scheduler
            .operation(&submitted.record.operation_id)
            .expect("retry outcome");
        assert_eq!(retried.operation.status, OperationStatus::Completed);
        let completed_progress = crop_state
            .progress(&scheduler, "crop-retry")
            .expect("completed projection")
            .expect("crop progress");
        assert_eq!(
            completed_progress.status,
            lisca::protocol::CropRoiStatus::Completed
        );
        assert_eq!(completed_progress.completed_positions, 2);
        let pos1 = metadata.iter().find(|task| task.position == 1).unwrap();
        assert_eq!(scheduler.task(&pos1.task_id).unwrap().attempts.len(), 1);
        assert_eq!(
            scheduler.task(&failed_task.task_id).unwrap().attempts.len(),
            2
        );
        assert_eq!(
            fs::read(workspace.join("roi/Pos1/index.json")).expect("sibling remains"),
            sibling_index
        );
        assert!(Path::new(&workspace).join("roi/Pos2/index.json").is_file());
    }
}

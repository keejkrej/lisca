use std::{collections::HashSet, sync::Arc};

use crate::crop::{CropJobState, CropJobStateError, CropSubmission, CropTaskMetadata, HasCropJobs};
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

/// Lightweight Aligner routes: scan, frame load, bbox save, smart exclude.
/// Does **not** include ROI crop (long-running); Studio mounts [`crop_router`].
pub fn router<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
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
        .route("/align/smart-exclude", post(smart_exclude_handler))
}

/// ROI crop job routes + task-manager integration. Owned by Studio (and CLI),
/// not the lightweight Aligner shell.
pub fn crop_router<S>() -> Router<S>
where
    S: HasCropJobs + HasTaskScheduler + Clone + Send + Sync + 'static,
{
    Router::new()
        .route("/align/crop-roi", post(crop_roi_handler::<S>))
        .route("/align/cancel-crop-roi", post(cancel_crop_roi_handler::<S>))
        .route(
            "/align/crop-roi-progress",
            get(crop_roi_progress_handler::<S>),
        )
        .route("/align/crop-latest", get(crop_latest_progress_handler::<S>))
}

async fn run_blocking<T>(
    operation: &'static str,
    task: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, FsError>
where
    T: Send + 'static,
{
    tokio::task::spawn_blocking(task)
        .await
        .map_err(|error| FsError::internal(format!("{operation} worker failed: {error}")))?
        .map_err(FsError::new)
}

async fn smart_exclude_handler(
    Json(payload): Json<lisca::protocol::SmartExcludeRequest>,
) -> Result<Json<lisca::protocol::SmartExcludeResponse>, FsError> {
    run_blocking("smart exclude", move || {
        lisca::smart::exclude::classify_exclusion(payload)
    })
    .await
    .map(Json)
}

async fn scan_source_handler(
    Json(payload): Json<ScanSourceRequest>,
) -> Result<Json<lisca::protocol::WorkspaceScan>, FsError> {
    run_blocking("source scan", move || aligner::scan_source(payload.source))
        .await
        .map(Json)
}

async fn load_frame_handler(
    Json(payload): Json<LoadFrameRequest>,
) -> Result<Json<lisca::protocol::FramePayload>, FsError> {
    run_blocking("frame load", move || {
        aligner::load_frame_payload(payload.source, payload.request, payload.contrast)
    })
    .await
    .map(Json)
}

async fn save_bbox_handler(
    Json(payload): Json<SaveBboxRequest>,
) -> Result<Json<lisca::protocol::SaveBboxResponse>, FsError> {
    run_blocking("bounding-box save", move || {
        aligner::save_bbox(
            &payload.workspace_path,
            payload.pos,
            &payload.csv,
            &payload.align_state,
        )
    })
    .await
    .map(Json)
}

async fn load_align_state_handler(
    Query(query): Query<LoadAlignStateQuery>,
) -> Result<Json<Option<SavedAlignState>>, FsError> {
    run_blocking("alignment-state load", move || {
        aligner::load_align_state(&query.workspace_path, query.pos)
    })
    .await
    .map(Json)
}

async fn output_paths_handler(
    Query(query): Query<OutputPathsQuery>,
) -> Json<lisca::protocol::AlignOutputPaths> {
    Json(aligner::output_paths(query.pos))
}

async fn saved_bbox_positions_handler(
    Query(query): Query<SavedBboxPositionsQuery>,
) -> Result<Json<Vec<u32>>, FsError> {
    run_blocking("saved bounding-box scan", move || {
        aligner::list_saved_bbox_positions(&query.workspace_path)
    })
    .await
    .map(Json)
}

async fn roi_pos_exists_handler(
    Query(query): Query<RoiPosExistsQuery>,
) -> Result<Json<lisca::protocol::RoiPosExistsResponse>, FsError> {
    let exists = tokio::task::spawn_blocking(move || {
        aligner::roi_pos_exists(&query.workspace_path, query.pos)
    })
    .await
    .map_err(|error| FsError::internal(format!("ROI existence worker failed: {error}")))?;
    Ok(Json(lisca::protocol::RoiPosExistsResponse { exists }))
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
    // Resolve the shared planner/scheduler handles and the identifying request
    // fields once, before any planning I/O, so the planning error paths can
    // re-check the attach decision in-memory without re-deriving them.
    let crop = state.crop_jobs();
    let scheduler = state.task_scheduler();
    let request_id = request.request_id.clone();
    let workspace_path = request.workspace_path.clone();

    let migrate_workspace_path = request.workspace_path.clone();
    if let Err(migrate_error) = run_blocking("workspace migration", move || {
        lisca::migrations::migrate_workspace(std::path::Path::new(&migrate_workspace_path))
            .map(|_| ())
    })
    .await
    {
        return attach_or_propagate_planning_error(
            crop,
            scheduler,
            &workspace_path,
            &request_id,
            migrate_error,
        );
    }
    let positions = if request.positions.is_empty() {
        let position_scan_path = request.workspace_path.clone();
        match run_blocking("crop position scan", move || {
            aligner::list_saved_bbox_positions(&position_scan_path)
        })
        .await
        {
            Ok(positions) => positions,
            Err(position_scan_error) => {
                return attach_or_propagate_planning_error(
                    crop,
                    scheduler,
                    &workspace_path,
                    &request_id,
                    position_scan_error,
                );
            }
        }
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
    let scan = match tokio::task::spawn_blocking(move || aligner::scan_source(source)).await {
        Ok(Ok(scan)) => Arc::new(scan),
        Ok(Err(scan_error)) => {
            return attach_or_propagate_planning_error(
                crop,
                scheduler,
                &workspace_path,
                &request_id,
                FsError::new(scan_error),
            );
        }
        Err(join_error) => {
            return attach_or_propagate_planning_error(
                crop,
                scheduler,
                &workspace_path,
                &request_id,
                FsError::internal(format!("crop planning worker failed: {join_error}")),
            );
        }
    };

    let submission = crop
        .submit_or_attach(scheduler, &workspace_path, &request_id, || {
            build_crop_operation(scheduler, request, scan, positions)
        })
        .map_err(crop_state_error)?;
    finalize_crop_response(crop, scheduler, submission)
}

/// Decide whether a planning-I/O failure should instead surface as an
/// attach to an already-running (non-terminal) crop for the same workspace
/// (or request id), discarding the planning error when it should.
///
/// `peek_attach` reproduces the two attach short-circuits of
/// [`crate::crop::CropJobState::submit_or_attach`] purely in-memory: no
/// planning I/O runs, no operation is created. When the request would attach,
/// the planning output that the eager scan produces is provably unused
/// (`submit_or_attach` skips the `create` closure that consumes it), so the
/// planning failure is irrelevant to the attach decision and is discarded,
/// returning [`CropRoiDisposition::Attached`]. When the request would not
/// attach, the Started path genuinely needs the planning output and the
/// original `planning_error` is propagated unchanged.
fn attach_or_propagate_planning_error(
    crop: &CropJobState,
    scheduler: &lisca_server::TaskScheduler,
    workspace_path: &str,
    request_id: &str,
    planning_error: FsError,
) -> Result<Json<lisca::protocol::CropRoiResponse>, FsError> {
    match crop.peek_attach(scheduler, workspace_path, request_id) {
        Ok(Some(submission)) => finalize_crop_response(crop, scheduler, submission),
        Ok(None) => Err(planning_error),
        Err(state_error) => Err(crop_state_error(state_error)),
    }
}

/// Project the current progress of `submission` into the HTTP response shape
/// shared by the fresh-start path and the planning-error attach-recovery
/// path.
fn finalize_crop_response(
    crop: &CropJobState,
    scheduler: &lisca_server::TaskScheduler,
    submission: CropSubmission,
) -> Result<Json<lisca::protocol::CropRoiResponse>, FsError> {
    let progress = crop
        .progress(scheduler, &submission.record.request_id)
        .map_err(crop_state_error)?
        .ok_or_else(|| FsError::internal("submitted crop is missing from the operation index"))?;
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
        CropJobStateError::Poisoned => FsError::internal("crop operation index is poisoned"),
        CropJobStateError::Scheduler(error) => FsError::internal(error.to_string()),
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

    // A small state shim implementing the two route-level extractor traits so a
    // test can drive `crop_roi_handler` directly without spinning up an HTTP
    // server. The handler only needs the crop job planner and the task
    // scheduler, both shared via `Arc`.
    #[derive(Clone)]
    struct HandlerState {
        crop: Arc<crate::CropJobState>,
        scheduler: Arc<TaskScheduler>,
    }
    impl HasCropJobs for HandlerState {
        fn crop_jobs(&self) -> &crate::CropJobState {
            &self.crop
        }
    }
    impl HasTaskScheduler for HandlerState {
        fn task_scheduler(&self) -> &TaskScheduler {
            &self.scheduler
        }
    }

    fn seeded_non_terminal_crop(
        crop: &Arc<crate::CropJobState>,
        scheduler: &Arc<TaskScheduler>,
        workspace_path: &str,
        request_id: &str,
    ) -> crate::crop::CropSubmission {
        crop.submit_or_attach(scheduler, workspace_path, request_id, || {
            let task = TaskSpec::new("crop-roi/Pos1", 1, |_| async {
                std::future::pending::<Result<(), TaskFailure>>().await
            });
            let task_id = task.task_id().to_string();
            scheduler
                .submit(OperationSpec::new(
                    "crop-roi",
                    workspace_path,
                    true,
                    vec![task],
                ))
                .map(|detail| {
                    (
                        detail,
                        vec![CropTaskMetadata {
                            task_id,
                            position: 1,
                            roi_pages: 1,
                            skipped: false,
                        }],
                    )
                })
        })
        .expect("seed non-terminal crop")
    }

    /// Regression for the eager-scan bug: a fresh crop request made against a
    /// workspace that already has a non-terminal crop must attach (return
    /// `CropRoiDisposition::Attached`) even when `aligner::scan_source` fails.
    /// Before the fix the handler ran `scan_source` before `submit_or_attach`,
    /// so the scan error aborted the request even though the scan's result is
    /// provably only consumed by the `create` closure that `submit_or_attach`
    /// skips on the attach path.
    #[tokio::test]
    async fn crop_roi_handler_attaches_when_source_scan_fails_under_non_terminal_crop() {
        use std::sync::atomic::{AtomicBool, Ordering};

        let workspace = tempfile::tempdir().expect("workspace tempdir");
        let workspace_path = workspace.path().to_string_lossy().into_owned();
        let scheduler = Arc::new(
            TaskScheduler::new(SchedulerConfig {
                capacity: 1,
                history_cap: 10,
            })
            .expect("scheduler"),
        );
        let crop = Arc::new(crate::CropJobState::new());
        let state = HandlerState {
            crop: crop.clone(),
            scheduler: scheduler.clone(),
        };

        let seeded = seeded_non_terminal_crop(&crop, &scheduler, &workspace_path, "crop-1");
        assert_eq!(
            seeded.disposition,
            lisca::protocol::CropRoiDisposition::Started
        );

        // A fresh request id with a source folder that does not exist; this
        // forces the handler's eager `scan_source` to error.
        let request = CropRoiRequest {
            output_format: None,
            overwrite: true,
            positions: vec![1],
            request_id: "crop-2".to_string(),
            source: AlignerSource::Folder {
                path: "/definitely/does/not/exist/source".to_string(),
                subfolder_template: "Pos{p}".to_string(),
                filename_template: "img_{t}_{c}_{z}".to_string(),
            },
            workspace_path: workspace_path.clone(),
        };
        let Json(response) = crop_roi_handler(State(state.clone()), Json(request))
            .await
            .expect("attach-path request must succeed when an active crop exists, even if scan_source errors");
        assert_eq!(
            response.disposition,
            lisca::protocol::CropRoiDisposition::Attached
        );
        assert_eq!(response.request_id, "crop-1");

        // Counter-evidence: the same request id attaches to the running crop
        // via `submit_or_attach` *without invoking `create`*, confirming that
        // the eager scan's result was provably unused on this path all along.
        let created_second = AtomicBool::new(false);
        let attached = crop
            .submit_or_attach(&scheduler, &workspace_path, "crop-2", || {
                created_second.store(true, Ordering::SeqCst);
                unreachable!("active workspace must attach")
            })
            .expect("attach active workspace");
        assert_eq!(
            attached.disposition,
            lisca::protocol::CropRoiDisposition::Attached
        );
        assert_eq!(attached.record.request_id, "crop-1");
        assert!(!created_second.load(Ordering::SeqCst));
    }

    /// The Started path genuinely needs the eager `scan_source` result: when no
    /// attachable crop exists for the workspace, a `scan_source` failure must
    /// still surface as an error (the recovery may not swallow it).
    #[tokio::test]
    async fn crop_roi_handler_propagates_scan_error_when_no_active_crop() {
        let workspace = tempfile::tempdir().expect("workspace tempdir");
        let workspace_path = workspace.path().to_string_lossy().into_owned();
        let scheduler = Arc::new(
            TaskScheduler::new(SchedulerConfig {
                capacity: 1,
                history_cap: 10,
            })
            .expect("scheduler"),
        );
        let crop = Arc::new(crate::CropJobState::new());
        let state = HandlerState {
            crop: crop.clone(),
            scheduler: scheduler.clone(),
        };

        let request = CropRoiRequest {
            output_format: None,
            overwrite: true,
            positions: vec![1],
            request_id: "crop-solo".to_string(),
            source: AlignerSource::Folder {
                path: "/definitely/does/not/exist/source".to_string(),
                subfolder_template: "Pos{p}".to_string(),
                filename_template: "img_{t}_{c}_{z}".to_string(),
            },
            workspace_path: workspace_path.clone(),
        };
        let error = crop_roi_handler(State(state), Json(request))
            .await
            .expect_err("scan_source error must propagate when no crop to attach to");
        assert!(
            !error.message().is_empty(),
            "scan_source error message must be preserved"
        );

        // Nothing was registered for the fresh request id: the handler short-
        // circuited on the planning error before `submit_or_attach` ran.
        let attach = crop
            .peek_attach(&scheduler, &workspace_path, "crop-solo")
            .expect("peek resolves");
        assert!(attach.is_none(), "no record must have been created");
    }

    /// Symmetric regression for the `migrate_workspace` planning step: a fresh
    /// crop request made against a workspace that already has a non-terminal
    /// crop must attach even when `migrate_workspace` errors. The malformed
    /// bbox header normally makes the first Start fail at migration; here it
    /// is introduced after a non-terminal crop has already been seeded (the
    /// stand-in for "an active crop is running") to exercise the recovery.
    #[tokio::test]
    async fn crop_roi_handler_attaches_when_workspace_migration_fails_under_non_terminal_crop() {
        use std::sync::atomic::{AtomicBool, Ordering};

        let workspace = tempfile::tempdir().expect("workspace tempdir");
        let workspace_path = workspace.path().to_string_lossy().into_owned();
        // A bbox header containing both `crop` and `roi` columns makes
        // `migrate_workspace` error. The seeded non-terminal crop never reaches
        // migrate (its task is `pending`), so seeding is unaffected.
        fs::create_dir_all(workspace.path().join("bbox")).expect("bbox dir");
        fs::write(
            workspace.path().join("bbox").join("Pos1.csv"),
            "crop,roi,x,y,w,h\n0,0,1,2,3,4\n",
        )
        .expect("malformed bbox");

        let scheduler = Arc::new(
            TaskScheduler::new(SchedulerConfig {
                capacity: 1,
                history_cap: 10,
            })
            .expect("scheduler"),
        );
        let crop = Arc::new(crate::CropJobState::new());
        let state = HandlerState {
            crop: crop.clone(),
            scheduler: scheduler.clone(),
        };

        let _ = seeded_non_terminal_crop(&crop, &scheduler, &workspace_path, "crop-1");

        let request = CropRoiRequest {
            output_format: None,
            overwrite: true,
            positions: vec![1],
            request_id: "crop-2".to_string(),
            source: AlignerSource::Folder {
                path: workspace
                    .path()
                    .join("source")
                    .to_string_lossy()
                    .into_owned(),
                subfolder_template: "Pos{p}".to_string(),
                filename_template: "img_{t}_{c}_{z}".to_string(),
            },
            workspace_path: workspace_path.clone(),
        };
        // Sanity-check the precondition: migrate_workspace does error.
        assert!(lisca::migrations::migrate_workspace(workspace.path()).is_err());
        let Json(response) = crop_roi_handler(State(state.clone()), Json(request))
            .await
            .expect("attach-path request must succeed even when migrate_workspace errors under an active crop");
        assert_eq!(
            response.disposition,
            lisca::protocol::CropRoiDisposition::Attached
        );
        assert_eq!(response.request_id, "crop-1");

        let created_second = AtomicBool::new(false);
        let attached = crop
            .submit_or_attach(&scheduler, &workspace_path, "crop-2", || {
                created_second.store(true, Ordering::SeqCst);
                unreachable!("active workspace must attach")
            })
            .expect("attach active workspace");
        assert_eq!(
            attached.disposition,
            lisca::protocol::CropRoiDisposition::Attached
        );
        assert_eq!(attached.record.request_id, "crop-1");
        assert!(!created_second.load(Ordering::SeqCst));
    }
}

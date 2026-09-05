use std::{
    collections::HashMap,
    sync::{Arc, Mutex, MutexGuard},
};

use lisca::protocol::{
    CropRoiDisposition, CropRoiProgress, CropRoiStatus, OperationDetail, OperationStatus,
    TaskStatus,
};
use lisca_server::{normalize_workspace_path, SchedulerError, TaskScheduler};

#[derive(Clone, Debug)]
pub struct CropTaskMetadata {
    pub task_id: String,
    pub position: u32,
    pub roi_pages: u32,
    pub skipped: bool,
}

#[derive(Clone, Debug)]
pub struct CropOperationRecord {
    pub request_id: String,
    pub workspace_path: String,
    pub operation_id: String,
    pub tasks: Vec<CropTaskMetadata>,
}

#[derive(Debug)]
pub enum CropJobStateError {
    Poisoned,
    RequestIdConflict,
    Scheduler(SchedulerError),
}

#[derive(Clone)]
pub struct CropJobState {
    inner: Arc<Mutex<CropOperationBook>>,
}

struct CropOperationBook {
    records: HashMap<String, CropOperationRecord>,
    latest_by_workspace: HashMap<String, String>,
}

#[derive(Debug)]
pub struct CropSubmission {
    pub record: CropOperationRecord,
    pub disposition: CropRoiDisposition,
}

impl CropJobState {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(CropOperationBook {
                records: HashMap::new(),
                latest_by_workspace: HashMap::new(),
            })),
        }
    }

    fn lock(&self) -> Result<MutexGuard<'_, CropOperationBook>, CropJobStateError> {
        self.inner.lock().map_err(|_| CropJobStateError::Poisoned)
    }

    pub fn submit_or_attach<F>(
        &self,
        scheduler: &TaskScheduler,
        workspace_path: &str,
        request_id: &str,
        create: F,
    ) -> Result<CropSubmission, CropJobStateError>
    where
        F: FnOnce() -> Result<(OperationDetail, Vec<CropTaskMetadata>), SchedulerError>,
    {
        let workspace_path = normalize_workspace_path(workspace_path);
        let mut book = self.lock()?;
        prune_evicted_operations(&mut book, scheduler);

        if let Some(existing) = book.records.get(request_id) {
            if existing.workspace_path != workspace_path {
                return Err(CropJobStateError::RequestIdConflict);
            }
            scheduler
                .operation(&existing.operation_id)
                .map_err(CropJobStateError::Scheduler)?;
            return Ok(CropSubmission {
                record: existing.clone(),
                disposition: CropRoiDisposition::Attached,
            });
        }

        if let Some(active) = book
            .latest_by_workspace
            .get(&workspace_path)
            .and_then(|latest| book.records.get(latest))
            .and_then(|record| {
                scheduler
                    .operation(&record.operation_id)
                    .ok()
                    .filter(|detail| !operation_is_terminal(detail.operation.status))
                    .map(|_| record.clone())
            })
        {
            return Ok(CropSubmission {
                record: active,
                disposition: CropRoiDisposition::Attached,
            });
        }

        let (detail, tasks) = create().map_err(CropJobStateError::Scheduler)?;
        let record = CropOperationRecord {
            request_id: request_id.to_string(),
            workspace_path: workspace_path.clone(),
            operation_id: detail.operation.operation_id,
            tasks,
        };
        book.latest_by_workspace
            .insert(workspace_path, request_id.to_string());
        book.records.insert(request_id.to_string(), record.clone());
        Ok(CropSubmission {
            record,
            disposition: CropRoiDisposition::Started,
        })
    }

    /// Resolve the attach decision for `request_id` against `workspace_path`
    /// without creating a new operation.
    ///
    /// Mirrors the two attach short-circuits of [`Self::submit_or_attach`]
    /// (request id already known; non-terminal operation already active for
    /// the workspace) but performs no I/O and never invokes `create`. Returns
    /// `Ok(Some(_))` with [`CropRoiDisposition::Attached`] when
    /// `submit_or_attach` would attach the same request without creating,
    /// `Ok(None)` when it would fall through to the `create` branch, and
    /// `Err` on a request-id conflict (the request id belongs to another
    /// workspace) or a state/scheduler error.
    ///
    /// Used by `crop_roi_handler` to recover an attachable request from a
    /// planning-I/O failure (e.g. a [`lisca::aligner::scan_source`] error). The
    /// `create` closure that consumes the planning result is provably skipped
    /// on both attach short-circuits, so the planning output is irrelevant to
    /// that decision and the planning error can be discarded in favor of
    /// `Attached`.
    pub fn peek_attach(
        &self,
        scheduler: &TaskScheduler,
        workspace_path: &str,
        request_id: &str,
    ) -> Result<Option<CropSubmission>, CropJobStateError> {
        let workspace_path = normalize_workspace_path(workspace_path);
        let mut book = self.lock()?;
        prune_evicted_operations(&mut book, scheduler);

        if let Some(existing) = book.records.get(request_id) {
            if existing.workspace_path != workspace_path {
                return Err(CropJobStateError::RequestIdConflict);
            }
            scheduler
                .operation(&existing.operation_id)
                .map_err(CropJobStateError::Scheduler)?;
            return Ok(Some(CropSubmission {
                record: existing.clone(),
                disposition: CropRoiDisposition::Attached,
            }));
        }

        if let Some(active) = book
            .latest_by_workspace
            .get(&workspace_path)
            .and_then(|latest| book.records.get(latest))
            .and_then(|record| {
                scheduler
                    .operation(&record.operation_id)
                    .ok()
                    .filter(|detail| !operation_is_terminal(detail.operation.status))
                    .map(|_| record.clone())
            })
        {
            return Ok(Some(CropSubmission {
                record: active,
                disposition: CropRoiDisposition::Attached,
            }));
        }

        Ok(None)
    }

    pub fn progress(
        &self,
        scheduler: &TaskScheduler,
        request_id: &str,
    ) -> Result<Option<CropRoiProgress>, CropJobStateError> {
        let record = {
            let mut book = self.lock()?;
            prune_evicted_operations(&mut book, scheduler);
            book.records.get(request_id).cloned()
        };
        record
            .map(|record| {
                scheduler
                    .operation(&record.operation_id)
                    .map(|detail| project_crop_progress(&record, &detail))
                    .map_err(CropJobStateError::Scheduler)
            })
            .transpose()
    }

    pub fn latest_progress(
        &self,
        scheduler: &TaskScheduler,
        workspace_path: &str,
    ) -> Result<Option<CropRoiProgress>, CropJobStateError> {
        let workspace_path = normalize_workspace_path(workspace_path);
        let record = {
            let mut book = self.lock()?;
            prune_evicted_operations(&mut book, scheduler);
            book.latest_by_workspace
                .get(&workspace_path)
                .and_then(|request_id| book.records.get(request_id))
                .cloned()
        };
        record
            .map(|record| {
                scheduler
                    .operation(&record.operation_id)
                    .map(|detail| project_crop_progress(&record, &detail))
                    .map_err(CropJobStateError::Scheduler)
            })
            .transpose()
    }

    pub fn cancel(
        &self,
        scheduler: &TaskScheduler,
        request_id: &str,
    ) -> Result<Option<CropRoiProgress>, CropJobStateError> {
        let record = {
            let mut book = self.lock()?;
            prune_evicted_operations(&mut book, scheduler);
            book.records.get(request_id).cloned()
        };
        record
            .map(|record| {
                scheduler
                    .cancel_operation(&record.operation_id)
                    .map(|detail| project_crop_progress(&record, &detail))
                    .map_err(CropJobStateError::Scheduler)
            })
            .transpose()
    }
}

impl Default for CropJobState {
    fn default() -> Self {
        Self::new()
    }
}

pub trait HasCropJobs: Clone + Send + Sync + 'static {
    fn crop_jobs(&self) -> &CropJobState;
}

fn operation_is_terminal(status: OperationStatus) -> bool {
    matches!(
        status,
        OperationStatus::Completed
            | OperationStatus::Failed
            | OperationStatus::PartiallyComplete
            | OperationStatus::Cancelled
    )
}

fn prune_evicted_operations(book: &mut CropOperationBook, scheduler: &TaskScheduler) {
    book.records.retain(|_, record| {
        !matches!(
            scheduler.operation(&record.operation_id),
            Err(SchedulerError::NotFound { .. })
        )
    });
    book.latest_by_workspace
        .retain(|_, request_id| book.records.contains_key(request_id));
}

fn project_crop_progress(
    record: &CropOperationRecord,
    detail: &OperationDetail,
) -> CropRoiProgress {
    let metadata = record
        .tasks
        .iter()
        .map(|task| (task.task_id.as_str(), task))
        .collect::<HashMap<_, _>>();
    let completed_rois = detail
        .tasks
        .iter()
        .filter(|task| task.status == TaskStatus::Completed)
        .filter_map(|task| metadata.get(task.task_id.as_str()))
        .fold(0_u32, |total, task| total.saturating_add(task.roi_pages))
        .saturating_add(
            detail
                .tasks
                .iter()
                .filter(|task| {
                    matches!(
                        task.status,
                        TaskStatus::Running | TaskStatus::CancellationRequested
                    )
                })
                .filter_map(|task| task.work_progress.as_ref())
                .fold(0_u32, |total, progress| {
                    total.saturating_add(progress.completed)
                }),
        );
    let total_rois = record
        .tasks
        .iter()
        .fold(0_u32, |total, task| total.saturating_add(task.roi_pages));
    let position = detail
        .tasks
        .iter()
        .find(|task| {
            matches!(
                task.status,
                TaskStatus::Running | TaskStatus::CancellationRequested
            )
        })
        .and_then(|task| metadata.get(task.task_id.as_str()))
        .map(|task| task.position);
    let error = detail.tasks.iter().find_map(|task| {
        (task.status == TaskStatus::Failed)
            .then(|| {
                task.attempts
                    .last()
                    .and_then(|attempt| attempt.error.as_ref())
            })
            .flatten()
            .map(|error| format!("{}: {}", task.task_kind, error.message))
    });
    let status = match detail.operation.status {
        OperationStatus::Queued => CropRoiStatus::Queued,
        OperationStatus::Running | OperationStatus::CancellationRequested => CropRoiStatus::Running,
        OperationStatus::Completed => CropRoiStatus::Completed,
        OperationStatus::Cancelled => CropRoiStatus::Cancelled,
        OperationStatus::Failed => CropRoiStatus::Error,
        OperationStatus::PartiallyComplete if detail.operation.progress.failed > 0 => {
            CropRoiStatus::Error
        }
        OperationStatus::PartiallyComplete => CropRoiStatus::Cancelled,
    };
    let message = match status {
        CropRoiStatus::Queued => "Queued crop".to_string(),
        CropRoiStatus::Running
            if detail.operation.status == OperationStatus::CancellationRequested =>
        {
            "Crop cancellation requested".to_string()
        }
        CropRoiStatus::Running => position
            .map(|pos| format!("Cropping Pos{pos}"))
            .unwrap_or_else(|| "Cropping positions".to_string()),
        CropRoiStatus::Completed => "Crop completed".to_string(),
        CropRoiStatus::Cancelled => "Crop cancelled".to_string(),
        CropRoiStatus::Error => "Crop finished with position errors".to_string(),
    };

    CropRoiProgress {
        request_id: record.request_id.clone(),
        status,
        position,
        completed_positions: detail.operation.progress.completed,
        total_positions: detail.operation.progress.total,
        completed_rois,
        total_rois,
        message: Some(message),
        error,
        skipped_positions: record
            .tasks
            .iter()
            .filter(|task| task.skipped)
            .map(|task| task.position)
            .collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use lisca_server::{OperationSpec, SchedulerConfig, TaskFailure, TaskSpec};
    use std::sync::atomic::{AtomicBool, Ordering};

    fn scheduler() -> TaskScheduler {
        TaskScheduler::new(SchedulerConfig {
            capacity: 1,
            history_cap: 10,
        })
        .expect("scheduler")
    }

    #[tokio::test]
    async fn projection_uses_canonical_task_counts_and_position_errors() {
        let scheduler = scheduler();
        let success = TaskSpec::new("crop-roi/Pos1", 1, |_| async { Ok(()) });
        let success_id = success.task_id().to_string();
        let failure = TaskSpec::new("crop-roi/Pos2", 1, |_| async {
            Err(TaskFailure::new("crop_failed", "bad box"))
        });
        let failure_id = failure.task_id().to_string();
        let detail = scheduler
            .submit(OperationSpec::new(
                "crop-roi",
                "/workspace",
                true,
                vec![success, failure],
            ))
            .expect("submit");
        let record = CropOperationRecord {
            request_id: "crop-1".to_string(),
            workspace_path: "/workspace".to_string(),
            operation_id: detail.operation.operation_id.clone(),
            tasks: vec![
                CropTaskMetadata {
                    task_id: success_id,
                    position: 1,
                    roi_pages: 3,
                    skipped: false,
                },
                CropTaskMetadata {
                    task_id: failure_id,
                    position: 2,
                    roi_pages: 4,
                    skipped: false,
                },
            ],
        };
        for _ in 0..100 {
            if operation_is_terminal(
                scheduler
                    .operation(&record.operation_id)
                    .unwrap()
                    .operation
                    .status,
            ) {
                break;
            }
            tokio::task::yield_now().await;
        }
        let progress =
            project_crop_progress(&record, &scheduler.operation(&record.operation_id).unwrap());
        assert_eq!(progress.status, CropRoiStatus::Error);
        assert_eq!(progress.completed_positions, 1);
        assert_eq!(progress.total_positions, 2);
        assert_eq!(progress.completed_rois, 3);
        assert_eq!(progress.total_rois, 7);
        assert!(progress.error.unwrap().contains("Pos2"));
    }

    #[tokio::test]
    async fn active_workspace_and_request_ids_attach_without_creating_another_operation() {
        let scheduler = scheduler();
        let state = CropJobState::new();
        let first = state
            .submit_or_attach(&scheduler, "/workspace", "first", || {
                let task = TaskSpec::new("crop-roi/Pos1", 1, |_| async {
                    std::future::pending::<Result<(), TaskFailure>>().await
                });
                let task_id = task.task_id().to_string();
                scheduler
                    .submit(OperationSpec::new(
                        "crop-roi",
                        "/workspace",
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
            .expect("first submission");
        let created_second = AtomicBool::new(false);
        let attached = state
            .submit_or_attach(&scheduler, "/workspace", "second", || {
                created_second.store(true, Ordering::SeqCst);
                unreachable!("active workspace must attach")
            })
            .expect("attach active workspace");

        assert_eq!(attached.disposition, CropRoiDisposition::Attached);
        assert_eq!(attached.record.request_id, "first");
        assert_eq!(attached.record.operation_id, first.record.operation_id);
        assert!(!created_second.load(Ordering::SeqCst));
        assert!(matches!(
            state.submit_or_attach(&scheduler, "/other", "first", || unreachable!()),
            Err(CropJobStateError::RequestIdConflict)
        ));
    }

    /// Seed a non-terminal crop (a task that never resolves) for `workspace_path`
    /// under `request_id` so the attach predicates have something to find. Used
    /// by the `peek_attach` tests below.
    fn seed_non_terminal_crop(
        state: &CropJobState,
        scheduler: &TaskScheduler,
        workspace_path: &str,
        request_id: &str,
    ) -> CropOperationRecord {
        state
            .submit_or_attach(scheduler, workspace_path, request_id, || {
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
            .record
    }

    #[tokio::test]
    async fn peek_attach_attaches_when_request_id_matches_an_existing_record() {
        let scheduler = scheduler();
        let state = CropJobState::new();
        let seeded = seed_non_terminal_crop(&state, &scheduler, "/workspace", "first");

        // Same request id, same workspace: `peek_attach` mirrors attach path A.
        let attach = state
            .peek_attach(&scheduler, "/workspace", "first")
            .expect("peek resolves")
            .expect("known request id attaches");
        assert_eq!(attach.disposition, CropRoiDisposition::Attached);
        assert_eq!(attach.record.request_id, "first");
        assert_eq!(attach.record.operation_id, seeded.operation_id);
    }

    #[tokio::test]
    async fn peek_attach_attaches_when_active_non_terminal_operation_exists_for_workspace() {
        let scheduler = scheduler();
        let state = CropJobState::new();
        let seeded = seed_non_terminal_crop(&state, &scheduler, "/workspace", "first");

        // Fresh request id, same workspace: `peek_attach` mirrors attach path B
        // (a non-terminal operation is already running for the workspace).
        let attach = state
            .peek_attach(&scheduler, "/workspace", "second")
            .expect("peek resolves")
            .expect("active non-terminal operation attaches");
        assert_eq!(attach.disposition, CropRoiDisposition::Attached);
        assert_eq!(attach.record.request_id, "first");
        assert_eq!(attach.record.operation_id, seeded.operation_id);
    }

    #[tokio::test]
    async fn peek_attach_returns_none_when_no_operation_exists_for_workspace() {
        let scheduler = scheduler();
        let state = CropJobState::new();
        let attach = state
            .peek_attach(&scheduler, "/workspace", "first")
            .expect("peek resolves");
        assert!(
            attach.is_none(),
            "no prior record must fall through to create"
        );
    }

    #[tokio::test]
    async fn peek_attach_returns_none_when_latest_operation_is_terminal() {
        let scheduler = scheduler();
        let state = CropJobState::new();
        let seeded = state
            .submit_or_attach(&scheduler, "/workspace", "first", || {
                let task = TaskSpec::new("crop-roi/Pos1", 1, |_| async {
                    Err(TaskFailure::new("crop_failed", "boom"))
                });
                let task_id = task.task_id().to_string();
                scheduler
                    .submit(OperationSpec::new(
                        "crop-roi",
                        "/workspace",
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
            .expect("seed terminal-bound crop");
        for _ in 0..1_000 {
            if operation_is_terminal(
                scheduler
                    .operation(&seeded.record.operation_id)
                    .expect("operation")
                    .operation
                    .status,
            ) {
                break;
            }
            tokio::task::yield_now().await;
        }
        assert!(
            operation_is_terminal(
                scheduler
                    .operation(&seeded.record.operation_id)
                    .expect("operation")
                    .operation
                    .status
            ),
            "seeded crop must be terminal"
        );

        // Fresh request id for the same workspace: the latest operation is
        // terminal so attach path B does not fire — `submit_or_attach` would
        // create. `peek_attach` must report the same fall-through.
        let attach = state
            .peek_attach(&scheduler, "/workspace", "second")
            .expect("peek resolves");
        assert!(
            attach.is_none(),
            "terminal latest op must not attach a fresh request"
        );

        // Path A does not consult operation status, so a known request id still
        // attaches even when its operation is terminal.
        let known = state
            .peek_attach(&scheduler, "/workspace", "first")
            .expect("peek resolves")
            .expect("known request id attaches regardless of status");
        assert_eq!(known.disposition, CropRoiDisposition::Attached);
        assert_eq!(known.record.request_id, "first");
    }

    #[tokio::test]
    async fn peek_attach_reports_request_id_conflict_for_mismatched_workspace() {
        let scheduler = scheduler();
        let state = CropJobState::new();
        let _ = seed_non_terminal_crop(&state, &scheduler, "/workspace-a", "dup");

        // The request id exists but belongs to a different workspace; this is
        // a real conflict, not an attach.
        let error = state
            .peek_attach(&scheduler, "/workspace-b", "dup")
            .expect_err("request id conflict");
        assert!(matches!(error, CropJobStateError::RequestIdConflict));
    }
}

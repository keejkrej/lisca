use std::{
    collections::HashMap,
    sync::{Arc, Mutex, MutexGuard},
};

use lisca::protocol::{
    CropRoiDisposition, CropRoiProgress, CropRoiStatus, StepStatus, TaskDetail, TaskStatus,
};
use lisca_server::{normalize_workspace_path, SchedulerError, TaskScheduler};

#[derive(Clone, Debug)]
pub struct CropStepMetadata {
    pub step_id: String,
    pub position: u32,
    pub roi_pages: u32,
    pub skipped: bool,
}

#[derive(Clone, Debug)]
pub struct CropTaskRecord {
    pub request_id: String,
    pub workspace_path: String,
    pub task_id: String,
    pub steps: Vec<CropStepMetadata>,
}

#[derive(Debug)]
pub enum CropTaskStateError {
    Poisoned,
    RequestIdConflict,
    Scheduler(SchedulerError),
}

#[derive(Clone)]
pub struct CropTaskState {
    inner: Arc<Mutex<CropTaskBook>>,
}

struct CropTaskBook {
    records: HashMap<String, CropTaskRecord>,
    latest_by_workspace: HashMap<String, String>,
}

#[derive(Debug)]
pub struct CropSubmission {
    pub record: CropTaskRecord,
    pub disposition: CropRoiDisposition,
}

impl CropTaskState {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(CropTaskBook {
                records: HashMap::new(),
                latest_by_workspace: HashMap::new(),
            })),
        }
    }

    fn lock(&self) -> Result<MutexGuard<'_, CropTaskBook>, CropTaskStateError> {
        self.inner.lock().map_err(|_| CropTaskStateError::Poisoned)
    }

    pub fn submit_or_attach<F>(
        &self,
        scheduler: &TaskScheduler,
        workspace_path: &str,
        request_id: &str,
        create: F,
    ) -> Result<CropSubmission, CropTaskStateError>
    where
        F: FnOnce() -> Result<(TaskDetail, Vec<CropStepMetadata>), SchedulerError>,
    {
        let workspace_path = normalize_workspace_path(workspace_path);
        let mut book = self.lock()?;
        prune_evicted_tasks(&mut book, scheduler);

        if let Some(existing) = book.records.get(request_id) {
            if existing.workspace_path != workspace_path {
                return Err(CropTaskStateError::RequestIdConflict);
            }
            scheduler
                .task(&existing.task_id)
                .map_err(CropTaskStateError::Scheduler)?;
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
                    .task(&record.task_id)
                    .ok()
                    .filter(|detail| !task_is_terminal(detail.task.status))
                    .map(|_| record.clone())
            })
        {
            return Ok(CropSubmission {
                record: active,
                disposition: CropRoiDisposition::Attached,
            });
        }

        let (detail, steps) = create().map_err(CropTaskStateError::Scheduler)?;
        let record = CropTaskRecord {
            request_id: request_id.to_string(),
            workspace_path: workspace_path.clone(),
            task_id: detail.task.task_id,
            steps,
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
    /// without creating a new task.
    ///
    /// Mirrors the two attach short-circuits of [`Self::submit_or_attach`]
    /// (request id already known; non-terminal task already active for
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
    ) -> Result<Option<CropSubmission>, CropTaskStateError> {
        let workspace_path = normalize_workspace_path(workspace_path);
        let mut book = self.lock()?;
        prune_evicted_tasks(&mut book, scheduler);

        if let Some(existing) = book.records.get(request_id) {
            if existing.workspace_path != workspace_path {
                return Err(CropTaskStateError::RequestIdConflict);
            }
            scheduler
                .task(&existing.task_id)
                .map_err(CropTaskStateError::Scheduler)?;
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
                    .task(&record.task_id)
                    .ok()
                    .filter(|detail| !task_is_terminal(detail.task.status))
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
    ) -> Result<Option<CropRoiProgress>, CropTaskStateError> {
        let record = {
            let mut book = self.lock()?;
            prune_evicted_tasks(&mut book, scheduler);
            book.records.get(request_id).cloned()
        };
        record
            .map(|record| {
                scheduler
                    .task(&record.task_id)
                    .map(|detail| project_crop_progress(&record, &detail))
                    .map_err(CropTaskStateError::Scheduler)
            })
            .transpose()
    }

    pub fn latest_progress(
        &self,
        scheduler: &TaskScheduler,
        workspace_path: &str,
    ) -> Result<Option<CropRoiProgress>, CropTaskStateError> {
        let workspace_path = normalize_workspace_path(workspace_path);
        let record = {
            let mut book = self.lock()?;
            prune_evicted_tasks(&mut book, scheduler);
            book.latest_by_workspace
                .get(&workspace_path)
                .and_then(|request_id| book.records.get(request_id))
                .cloned()
        };
        record
            .map(|record| {
                scheduler
                    .task(&record.task_id)
                    .map(|detail| project_crop_progress(&record, &detail))
                    .map_err(CropTaskStateError::Scheduler)
            })
            .transpose()
    }

    pub fn cancel(
        &self,
        scheduler: &TaskScheduler,
        request_id: &str,
    ) -> Result<Option<CropRoiProgress>, CropTaskStateError> {
        let record = {
            let mut book = self.lock()?;
            prune_evicted_tasks(&mut book, scheduler);
            book.records.get(request_id).cloned()
        };
        record
            .map(|record| {
                scheduler
                    .cancel_task(&record.task_id)
                    .map(|detail| project_crop_progress(&record, &detail))
                    .map_err(CropTaskStateError::Scheduler)
            })
            .transpose()
    }
}

impl Default for CropTaskState {
    fn default() -> Self {
        Self::new()
    }
}

pub trait HasCropTasks: Clone + Send + Sync + 'static {
    fn crop_tasks(&self) -> &CropTaskState;
}

fn task_is_terminal(status: TaskStatus) -> bool {
    matches!(
        status,
        TaskStatus::Completed
            | TaskStatus::Failed
            | TaskStatus::PartiallyComplete
            | TaskStatus::Cancelled
            | TaskStatus::CancellationRequested
    )
}

fn prune_evicted_tasks(book: &mut CropTaskBook, scheduler: &TaskScheduler) {
    book.records.retain(|_, record| {
        !matches!(
            scheduler.task(&record.task_id),
            Err(SchedulerError::NotFound { .. })
        )
    });
    book.latest_by_workspace
        .retain(|_, request_id| book.records.contains_key(request_id));
}

fn project_crop_progress(record: &CropTaskRecord, detail: &TaskDetail) -> CropRoiProgress {
    let metadata = record
        .steps
        .iter()
        .map(|step| (step.step_id.as_str(), step))
        .collect::<HashMap<_, _>>();
    let completed_rois = detail
        .steps
        .iter()
        .filter(|step| step.status == StepStatus::Completed)
        .filter_map(|step| metadata.get(step.step_id.as_str()))
        .fold(0_u32, |total, step| total.saturating_add(step.roi_pages))
        .saturating_add(
            detail
                .steps
                .iter()
                .filter(|step| {
                    matches!(
                        step.status,
                        StepStatus::Running | StepStatus::CancellationRequested
                    )
                })
                .filter_map(|step| step.work_progress.as_ref())
                .fold(0_u32, |total, progress| {
                    total.saturating_add(progress.completed)
                }),
        );
    let total_rois = record
        .steps
        .iter()
        .fold(0_u32, |total, step| total.saturating_add(step.roi_pages));
    let position = detail
        .steps
        .iter()
        .find(|step| {
            matches!(
                step.status,
                StepStatus::Running | StepStatus::CancellationRequested
            )
        })
        .and_then(|step| metadata.get(step.step_id.as_str()))
        .map(|step| step.position);
    let error = detail.steps.iter().find_map(|step| {
        (step.status == StepStatus::Failed)
            .then(|| {
                step.attempts
                    .last()
                    .and_then(|attempt| attempt.error.as_ref())
            })
            .flatten()
            .map(|error| format!("{}: {}", step.step_kind, error.message))
    });
    let status = match detail.task.status {
        TaskStatus::Queued => CropRoiStatus::Queued,
        TaskStatus::Running | TaskStatus::CancellationRequested => CropRoiStatus::Running,
        TaskStatus::Completed => CropRoiStatus::Completed,
        TaskStatus::Cancelled => CropRoiStatus::Cancelled,
        TaskStatus::Failed => CropRoiStatus::Error,
        TaskStatus::PartiallyComplete if detail.task.progress.failed > 0 => CropRoiStatus::Error,
        TaskStatus::PartiallyComplete => CropRoiStatus::Cancelled,
    };
    let message = match status {
        CropRoiStatus::Queued => "Queued crop".to_string(),
        CropRoiStatus::Running if detail.task.status == TaskStatus::CancellationRequested => {
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
        completed_positions: detail.task.progress.completed,
        total_positions: detail.task.progress.total,
        completed_rois,
        total_rois,
        message: Some(message),
        error,
        skipped_positions: record
            .steps
            .iter()
            .filter(|step| step.skipped)
            .map(|step| step.position)
            .collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use lisca_server::{SchedulerConfig, StepFailure, StepSpec, TaskSpec};
    use std::sync::atomic::{AtomicBool, Ordering};

    fn scheduler() -> TaskScheduler {
        TaskScheduler::new(SchedulerConfig {
            capacity: 1,
            history_cap: 10,
        })
        .expect("scheduler")
    }

    #[tokio::test]
    async fn projection_uses_canonical_step_counts_and_position_errors() {
        let scheduler = scheduler();
        let success = StepSpec::new("crop-roi/Pos1", 1, |_| async { Ok(()) });
        let success_id = success.step_id().to_string();
        let failure = StepSpec::new("crop-roi/Pos2", 1, |_| async {
            Err(StepFailure::new("crop_failed", "bad box"))
        });
        let failure_id = failure.step_id().to_string();
        let detail = scheduler
            .submit(TaskSpec::new(
                "crop-roi",
                "/workspace",
                true,
                vec![success, failure],
            ))
            .expect("submit");
        let record = CropTaskRecord {
            request_id: "crop-1".to_string(),
            workspace_path: "/workspace".to_string(),
            task_id: detail.task.task_id.clone(),
            steps: vec![
                CropStepMetadata {
                    step_id: success_id,
                    position: 1,
                    roi_pages: 3,
                    skipped: false,
                },
                CropStepMetadata {
                    step_id: failure_id,
                    position: 2,
                    roi_pages: 4,
                    skipped: false,
                },
            ],
        };
        for _ in 0..100 {
            if task_is_terminal(scheduler.task(&record.task_id).unwrap().task.status) {
                break;
            }
            tokio::task::yield_now().await;
        }
        let progress = project_crop_progress(&record, &scheduler.task(&record.task_id).unwrap());
        assert_eq!(progress.status, CropRoiStatus::Error);
        assert_eq!(progress.completed_positions, 1);
        assert_eq!(progress.total_positions, 2);
        assert_eq!(progress.completed_rois, 3);
        assert_eq!(progress.total_rois, 7);
        assert!(progress.error.unwrap().contains("Pos2"));
    }

    #[tokio::test]
    async fn active_workspace_and_request_ids_attach_without_creating_another_task() {
        let scheduler = scheduler();
        let state = CropTaskState::new();
        let first = state
            .submit_or_attach(&scheduler, "/workspace", "first", || {
                let step = StepSpec::new("crop-roi/Pos1", 1, |_| async {
                    std::future::pending::<Result<(), StepFailure>>().await
                });
                let step_id = step.step_id().to_string();
                scheduler
                    .submit(TaskSpec::new("crop-roi", "/workspace", true, vec![step]))
                    .map(|detail| {
                        (
                            detail,
                            vec![CropStepMetadata {
                                step_id,
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
        assert_eq!(attached.record.task_id, first.record.task_id);
        assert!(!created_second.load(Ordering::SeqCst));
        assert!(matches!(
            state.submit_or_attach(&scheduler, "/other", "first", || unreachable!()),
            Err(CropTaskStateError::RequestIdConflict)
        ));
    }

    fn scheduler_terminal(status: TaskStatus) -> bool {
        matches!(
            status,
            TaskStatus::Completed
                | TaskStatus::Failed
                | TaskStatus::PartiallyComplete
                | TaskStatus::Cancelled
        )
    }

    #[tokio::test]
    async fn cancellation_requested_task_is_not_attachable_starts_fresh_task() {
        let scheduler = scheduler();
        let state = CropTaskState::new();
        let first = state
            .submit_or_attach(&scheduler, "/workspace", "first", || {
                let step = StepSpec::new("crop-roi/Pos1", 1, |ctx| async move {
                    loop {
                        if ctx.is_cancellation_requested() {
                            return Err(StepFailure::cancelled());
                        }
                        ctx.report_work_progress("frame", 0, 1, None, None).ok();
                        tokio::task::yield_now().await;
                    }
                });
                let step_id = step.step_id().to_string();
                scheduler
                    .submit(TaskSpec::new("crop-roi", "/workspace", true, vec![step]))
                    .map(|detail| {
                        (
                            detail,
                            vec![CropStepMetadata {
                                step_id,
                                position: 1,
                                roi_pages: 1,
                                skipped: false,
                            }],
                        )
                    })
            })
            .expect("first submission");

        for _ in 0..200 {
            if scheduler.task(&first.record.task_id).unwrap().task.status == TaskStatus::Running {
                break;
            }
            tokio::task::yield_now().await;
        }
        assert_eq!(
            scheduler.task(&first.record.task_id).unwrap().task.status,
            TaskStatus::Running,
        );

        scheduler
            .cancel_task(&first.record.task_id)
            .expect("cancel first");
        assert_eq!(
            scheduler.task(&first.record.task_id).unwrap().task.status,
            TaskStatus::CancellationRequested,
        );

        let created_second = AtomicBool::new(false);
        let second = state
            .submit_or_attach(&scheduler, "/workspace", "second", || {
                created_second.store(true, Ordering::SeqCst);
                let step = StepSpec::new("crop-roi/Pos2", 1, |_| async { Ok(()) });
                let step_id = step.step_id().to_string();
                scheduler
                    .submit(TaskSpec::new("crop-roi", "/workspace", true, vec![step]))
                    .map(|detail| {
                        (
                            detail,
                            vec![CropStepMetadata {
                                step_id,
                                position: 2,
                                roi_pages: 1,
                                skipped: false,
                            }],
                        )
                    })
            })
            .expect("second submission");

        assert_eq!(second.disposition, CropRoiDisposition::Started);
        assert_eq!(second.record.request_id, "second");
        assert!(created_second.load(Ordering::SeqCst));

        let second_op_id = second.record.task_id.clone();
        for _ in 0..800 {
            if scheduler_terminal(scheduler.task(&second_op_id).unwrap().task.status) {
                break;
            }
            tokio::task::yield_now().await;
        }

        let first_final = scheduler.task(&first.record.task_id).unwrap().task.status;
        let second_final = scheduler.task(&second_op_id).unwrap().task.status;
        let visible = state
            .progress(&scheduler, &second.record.request_id)
            .unwrap()
            .unwrap();

        assert_eq!(first_final, TaskStatus::Cancelled);
        assert_eq!(second_final, TaskStatus::Completed);
        assert_eq!(visible.status, CropRoiStatus::Completed);
        assert_eq!(visible.request_id, "second");
        assert_eq!(visible.completed_positions, 1);
    }

    #[tokio::test]
    async fn attaching_to_running_task_still_attaches() {
        let scheduler = scheduler();
        let state = CropTaskState::new();
        let first = state
            .submit_or_attach(&scheduler, "/workspace", "first", || {
                let step = StepSpec::new("crop-roi/Pos1", 1, |_| async {
                    std::future::pending::<Result<(), StepFailure>>().await
                });
                let step_id = step.step_id().to_string();
                scheduler
                    .submit(TaskSpec::new("crop-roi", "/workspace", true, vec![step]))
                    .map(|detail| {
                        (
                            detail,
                            vec![CropStepMetadata {
                                step_id,
                                position: 1,
                                roi_pages: 1,
                                skipped: false,
                            }],
                        )
                    })
            })
            .expect("first submission");

        for _ in 0..200 {
            if scheduler.task(&first.record.task_id).unwrap().task.status == TaskStatus::Running {
                break;
            }
            tokio::task::yield_now().await;
        }
        assert_eq!(
            scheduler.task(&first.record.task_id).unwrap().task.status,
            TaskStatus::Running,
        );

        let created_second = AtomicBool::new(false);
        let attached = state
            .submit_or_attach(&scheduler, "/workspace", "second", || {
                created_second.store(true, Ordering::SeqCst);
                unreachable!("running workspace must attach")
            })
            .expect("attach running workspace");

        assert_eq!(attached.disposition, CropRoiDisposition::Attached);
        assert_eq!(attached.record.request_id, "first");
        assert_eq!(attached.record.task_id, first.record.task_id);
        assert!(!created_second.load(Ordering::SeqCst));
    }

    /// Seed a non-terminal crop (a step that never resolves) for `workspace_path`
    /// under `request_id` so the attach predicates have something to find. Used
    /// by the `peek_attach` tests below.
    fn seed_non_terminal_crop(
        state: &CropTaskState,
        scheduler: &TaskScheduler,
        workspace_path: &str,
        request_id: &str,
    ) -> CropTaskRecord {
        state
            .submit_or_attach(scheduler, workspace_path, request_id, || {
                let step = StepSpec::new("crop-roi/Pos1", 1, |_| async {
                    std::future::pending::<Result<(), StepFailure>>().await
                });
                let step_id = step.step_id().to_string();
                scheduler
                    .submit(TaskSpec::new("crop-roi", workspace_path, true, vec![step]))
                    .map(|detail| {
                        (
                            detail,
                            vec![CropStepMetadata {
                                step_id,
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
        let state = CropTaskState::new();
        let seeded = seed_non_terminal_crop(&state, &scheduler, "/workspace", "first");

        // Same request id, same workspace: `peek_attach` mirrors attach path A.
        let attach = state
            .peek_attach(&scheduler, "/workspace", "first")
            .expect("peek resolves")
            .expect("known request id attaches");
        assert_eq!(attach.disposition, CropRoiDisposition::Attached);
        assert_eq!(attach.record.request_id, "first");
        assert_eq!(attach.record.task_id, seeded.task_id);
    }

    #[tokio::test]
    async fn peek_attach_attaches_when_active_non_terminal_task_exists_for_workspace() {
        let scheduler = scheduler();
        let state = CropTaskState::new();
        let seeded = seed_non_terminal_crop(&state, &scheduler, "/workspace", "first");

        // Fresh request id, same workspace: `peek_attach` mirrors attach path B
        // (a non-terminal task is already running for the workspace).
        let attach = state
            .peek_attach(&scheduler, "/workspace", "second")
            .expect("peek resolves")
            .expect("active non-terminal task attaches");
        assert_eq!(attach.disposition, CropRoiDisposition::Attached);
        assert_eq!(attach.record.request_id, "first");
        assert_eq!(attach.record.task_id, seeded.task_id);
    }

    #[tokio::test]
    async fn peek_attach_returns_none_when_no_task_exists_for_workspace() {
        let scheduler = scheduler();
        let state = CropTaskState::new();
        let attach = state
            .peek_attach(&scheduler, "/workspace", "first")
            .expect("peek resolves");
        assert!(
            attach.is_none(),
            "no prior record must fall through to create"
        );
    }

    #[tokio::test]
    async fn peek_attach_returns_none_when_latest_task_is_terminal() {
        let scheduler = scheduler();
        let state = CropTaskState::new();
        let seeded = state
            .submit_or_attach(&scheduler, "/workspace", "first", || {
                let step = StepSpec::new("crop-roi/Pos1", 1, |_| async {
                    Err(StepFailure::new("crop_failed", "boom"))
                });
                let step_id = step.step_id().to_string();
                scheduler
                    .submit(TaskSpec::new("crop-roi", "/workspace", true, vec![step]))
                    .map(|detail| {
                        (
                            detail,
                            vec![CropStepMetadata {
                                step_id,
                                position: 1,
                                roi_pages: 1,
                                skipped: false,
                            }],
                        )
                    })
            })
            .expect("seed terminal-bound crop");
        for _ in 0..1_000 {
            if task_is_terminal(
                scheduler
                    .task(&seeded.record.task_id)
                    .expect("task")
                    .task
                    .status,
            ) {
                break;
            }
            tokio::task::yield_now().await;
        }
        assert!(
            task_is_terminal(
                scheduler
                    .task(&seeded.record.task_id)
                    .expect("task")
                    .task
                    .status
            ),
            "seeded crop must be terminal"
        );

        // Fresh request id for the same workspace: the latest task is
        // terminal so attach path B does not fire — `submit_or_attach` would
        // create. `peek_attach` must report the same fall-through.
        let attach = state
            .peek_attach(&scheduler, "/workspace", "second")
            .expect("peek resolves");
        assert!(
            attach.is_none(),
            "terminal latest op must not attach a fresh request"
        );

        // Path A does not consult task status, so a known request id still
        // attaches even when its task is terminal.
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
        let state = CropTaskState::new();
        let _ = seed_non_terminal_crop(&state, &scheduler, "/workspace-a", "dup");

        // The request id exists but belongs to a different workspace; this is
        // a real conflict, not an attach.
        let error = state
            .peek_attach(&scheduler, "/workspace-b", "dup")
            .expect_err("request id conflict");
        assert!(matches!(error, CropTaskStateError::RequestIdConflict));
    }
}

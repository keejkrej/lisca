use std::{
    collections::{HashMap, HashSet, VecDeque},
    error::Error,
    fmt,
    future::Future,
    pin::Pin,
    sync::{Arc, Mutex, MutexGuard},
    time::{SystemTime, UNIX_EPOCH},
};

use lisca::protocol::{
    StepAttempt, StepDependencyBlock, StepDetail, StepError, StepStatus, StepWorkProgress,
    TaskAttention, TaskDetail, TaskProgress, TaskStatus, TaskSummary,
};
use tokio::sync::{watch, Notify};
use tracing::Instrument;
use uuid::Uuid;

use crate::normalize_workspace_path;

const DEFAULT_HISTORY_CAP: usize = 100;

type StepFuture = Pin<Box<dyn Future<Output = Result<(), StepFailure>> + Send + 'static>>;
type StepHandlerFactory = Arc<dyn Fn(StepContext) -> StepFuture + Send + Sync + 'static>;

struct StepProgressUpdate {
    unit: String,
    completed: u32,
    total: u32,
    phase: Option<String>,
    message: Option<String>,
}

#[derive(Clone)]
pub struct StepContext {
    cancellation: watch::Receiver<bool>,
    scheduler: TaskScheduler,
    task_id: String,
    step_id: String,
}

impl StepContext {
    pub fn is_cancellation_requested(&self) -> bool {
        *self.cancellation.borrow()
    }

    pub fn checkpoint(&self) -> Result<(), StepFailure> {
        if self.is_cancellation_requested() {
            Err(StepFailure::cancelled())
        } else {
            Ok(())
        }
    }

    pub async fn cancelled(&mut self) {
        while !self.is_cancellation_requested() {
            if self.cancellation.changed().await.is_err() {
                return;
            }
        }
    }

    pub fn report_work_progress(
        &self,
        unit: impl Into<String>,
        completed: u32,
        total: u32,
        phase: Option<String>,
        message: Option<String>,
    ) -> Result<(), StepFailure> {
        self.scheduler
            .report_work_progress(
                &self.task_id,
                &self.step_id,
                StepProgressUpdate {
                    unit: unit.into(),
                    completed,
                    total,
                    phase,
                    message,
                },
            )
            .map_err(|error| StepFailure::new("progress_report_failed", error.to_string()))
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SchedulerConfig {
    pub capacity: u32,
    pub history_cap: usize,
}

impl SchedulerConfig {
    pub fn from_environment() -> Self {
        let capacity = std::env::var("LISCA_STEP_CAPACITY")
            .ok()
            .and_then(|value| value.parse().ok())
            .unwrap_or_else(|| {
                std::thread::available_parallelism()
                    .map(|parallelism| parallelism.get() as u32)
                    .unwrap_or(1)
            });
        let history_cap = std::env::var("LISCA_TASK_HISTORY_CAP")
            .ok()
            .and_then(|value| value.parse().ok())
            .unwrap_or(DEFAULT_HISTORY_CAP);
        Self {
            capacity,
            history_cap,
        }
    }
}

impl Default for SchedulerConfig {
    fn default() -> Self {
        Self::from_environment()
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StepFailure {
    pub code: String,
    pub message: String,
}

impl StepFailure {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }

    pub fn cancelled() -> Self {
        Self::new("step_cancelled", "step execution was cancelled")
    }

    fn is_cancellation(&self) -> bool {
        self.code == "step_cancelled"
    }
}

pub struct StepSpec {
    id: String,
    kind: String,
    weight: u32,
    dependencies: Vec<String>,
    handler_factory: StepHandlerFactory,
}

impl StepSpec {
    pub fn new<F, Fut>(kind: impl Into<String>, weight: u32, handler_factory: F) -> Self
    where
        F: Fn(StepContext) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<(), StepFailure>> + Send + 'static,
    {
        Self {
            id: Uuid::new_v4().to_string(),
            kind: kind.into(),
            weight,
            dependencies: Vec::new(),
            handler_factory: Arc::new(move |context| Box::pin(handler_factory(context))),
        }
    }

    pub fn step_id(&self) -> &str {
        &self.id
    }

    pub fn with_dependencies<I, S>(mut self, dependencies: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        self.dependencies = dependencies.into_iter().map(Into::into).collect();
        self
    }
}

pub struct TaskSpec {
    kind: String,
    workspace_path: String,
    mutating: bool,
    steps: Vec<StepSpec>,
}

impl TaskSpec {
    pub fn new(
        kind: impl Into<String>,
        workspace_path: impl Into<String>,
        mutating: bool,
        steps: Vec<StepSpec>,
    ) -> Self {
        Self {
            kind: kind.into(),
            workspace_path: workspace_path.into(),
            mutating,
            steps,
        }
    }
}

#[derive(Debug, Eq, PartialEq)]
pub enum SchedulerError {
    InvalidCapacity,
    InvalidHistoryCap,
    EmptyTask,
    InvalidTaskKind,
    InvalidStepKind,
    InvalidWorkspace,
    InvalidWeight {
        weight: u32,
        capacity: u32,
    },
    MissingDependency {
        step_id: String,
        dependency_id: String,
    },
    CrossTaskDependency {
        step_id: String,
        dependency_id: String,
        task_id: String,
    },
    CyclicDependency {
        step_ids: Vec<String>,
    },
    NotFound {
        entity: &'static str,
        id: String,
    },
    InvalidTransition {
        entity: &'static str,
        id: String,
        status: String,
        command: &'static str,
        reason: Option<String>,
    },
    RuntimeUnavailable,
    Poisoned,
}

impl fmt::Display for SchedulerError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidCapacity => formatter.write_str("step capacity must be greater than zero"),
            Self::InvalidHistoryCap => {
                formatter.write_str("task history cap must be greater than zero")
            }
            Self::EmptyTask => formatter.write_str("a task must contain at least one step"),
            Self::InvalidTaskKind => formatter.write_str("task kind is required"),
            Self::InvalidStepKind => formatter.write_str("step kind is required"),
            Self::InvalidWorkspace => formatter.write_str("workspace path is required"),
            Self::InvalidWeight { weight, capacity } => write!(
                formatter,
                "step weight {weight} must be between 1 and scheduler capacity {capacity}"
            ),
            Self::MissingDependency {
                step_id,
                dependency_id,
            } => write!(
                formatter,
                "step {step_id} references missing dependency {dependency_id}"
            ),
            Self::CrossTaskDependency {
                step_id,
                dependency_id,
                task_id,
            } => write!(
                formatter,
                "step {step_id} references dependency {dependency_id} from task {task_id}"
            ),
            Self::CyclicDependency { step_ids } => write!(
                formatter,
                "step dependency graph contains a cycle involving {}",
                step_ids.join(", ")
            ),
            Self::NotFound { entity, id } => write!(formatter, "{entity} {id} was not found"),
            Self::InvalidTransition {
                entity,
                id,
                status,
                command,
                reason,
            } => {
                write!(
                    formatter,
                    "cannot {command} {entity} {id} while it is {status}"
                )?;
                if let Some(reason) = reason {
                    write!(formatter, ": {reason}")?;
                }
                Ok(())
            }
            Self::RuntimeUnavailable => formatter.write_str("a Tokio runtime is required"),
            Self::Poisoned => formatter.write_str("task scheduler state is poisoned"),
        }
    }
}

impl Error for SchedulerError {}

#[derive(Clone)]
pub struct TaskScheduler {
    inner: Arc<SchedulerInner>,
}

struct SchedulerInner {
    config: SchedulerConfig,
    state: Mutex<SchedulerState>,
    dispatch: Notify,
    changes: watch::Sender<u64>,
}

struct SchedulerState {
    tasks: HashMap<String, TaskRecord>,
    task_order: Vec<String>,
    round_robin: VecDeque<String>,
    last_dispatched: Option<String>,
    terminal_history: VecDeque<String>,
    admitted_workspaces: HashMap<String, String>,
    running_weight: u32,
    next_enqueue_order: u64,
    revision: u64,
}

struct TaskRecord {
    id: String,
    kind: String,
    workspace_id: String,
    workspace_path: String,
    mutating: bool,
    admitted: bool,
    steps: Vec<StepRecord>,
    created_at_ms: u64,
    updated_at_ms: u64,
    terminal_recorded: bool,
}

struct StepRecord {
    id: String,
    kind: String,
    weight: u32,
    enqueue_order: u64,
    dependencies: Vec<String>,
    status: StepStatus,
    handler_factory: StepHandlerFactory,
    cancellation: watch::Sender<bool>,
    attempts: Vec<AttemptRecord>,
    work_progress: Option<StepWorkProgress>,
}

struct AttemptRecord {
    id: String,
    status: StepStatus,
    started_at_ms: Option<u64>,
    finished_at_ms: Option<u64>,
    error: Option<StepFailure>,
}

struct Dispatch {
    task_id: String,
    step_id: String,
    attempt_id: String,
    workspace_id: String,
    step_kind: String,
    handler_factory: StepHandlerFactory,
    context: StepContext,
}

impl TaskScheduler {
    pub fn new(config: SchedulerConfig) -> Result<Self, SchedulerError> {
        if config.capacity == 0 {
            return Err(SchedulerError::InvalidCapacity);
        }
        if config.history_cap == 0 {
            return Err(SchedulerError::InvalidHistoryCap);
        }
        let runtime = tokio::runtime::Handle::try_current()
            .map_err(|_| SchedulerError::RuntimeUnavailable)?;
        let (changes, _) = watch::channel(0);
        let scheduler = Self {
            inner: Arc::new(SchedulerInner {
                config,
                state: Mutex::new(SchedulerState {
                    tasks: HashMap::new(),
                    task_order: Vec::new(),
                    round_robin: VecDeque::new(),
                    last_dispatched: None,
                    terminal_history: VecDeque::new(),
                    admitted_workspaces: HashMap::new(),
                    running_weight: 0,
                    next_enqueue_order: 0,
                    revision: 0,
                }),
                dispatch: Notify::new(),
                changes,
            }),
        };
        let dispatcher = scheduler.clone();
        runtime.spawn(async move { dispatcher.dispatch_loop().await });
        Ok(scheduler)
    }

    /// Weight budget shared by every running step. A step of this weight runs alone.
    pub fn capacity(&self) -> u32 {
        self.inner.config.capacity
    }

    pub fn submit(&self, spec: TaskSpec) -> Result<TaskDetail, SchedulerError> {
        let task_kind = spec.kind.trim().to_string();
        if task_kind.is_empty() {
            return Err(SchedulerError::InvalidTaskKind);
        }
        if spec.steps.is_empty() {
            return Err(SchedulerError::EmptyTask);
        }
        let workspace_path = normalize_workspace_path(&spec.workspace_path);
        if workspace_path.is_empty() {
            return Err(SchedulerError::InvalidWorkspace);
        }
        for step in &spec.steps {
            if step.kind.trim().is_empty() {
                return Err(SchedulerError::InvalidStepKind);
            }
            if step.weight == 0 || step.weight > self.inner.config.capacity {
                return Err(SchedulerError::InvalidWeight {
                    weight: step.weight,
                    capacity: self.inner.config.capacity,
                });
            }
        }

        let mut state = self.lock()?;
        validate_graph(&spec.steps, &state)?;

        let task_id = Uuid::new_v4().to_string();
        let workspace_id =
            Uuid::new_v5(&Uuid::NAMESPACE_URL, workspace_path.as_bytes()).to_string();
        let now = timestamp_ms();
        let admitted = !spec.mutating || !state.admitted_workspaces.contains_key(&workspace_path);
        if spec.mutating && admitted {
            state
                .admitted_workspaces
                .insert(workspace_path.clone(), task_id.clone());
        }
        let mut steps = Vec::with_capacity(spec.steps.len());
        for step in spec.steps {
            let attempt_id = Uuid::new_v4().to_string();
            let (cancellation, _) = watch::channel(false);
            let enqueue_order = state.next_enqueue_order;
            state.next_enqueue_order += 1;
            let status = if step.dependencies.is_empty() {
                StepStatus::Queued
            } else {
                StepStatus::Blocked
            };
            steps.push(StepRecord {
                id: step.id,
                kind: step.kind.trim().to_string(),
                weight: step.weight,
                enqueue_order,
                dependencies: step.dependencies,
                status,
                handler_factory: step.handler_factory,
                cancellation,
                attempts: vec![AttemptRecord {
                    id: attempt_id,
                    status,
                    started_at_ms: None,
                    finished_at_ms: None,
                    error: None,
                }],
                work_progress: None,
            });
        }
        state.tasks.insert(
            task_id.clone(),
            TaskRecord {
                id: task_id.clone(),
                kind: task_kind,
                workspace_id,
                workspace_path,
                mutating: spec.mutating,
                admitted,
                steps,
                created_at_ms: now,
                updated_at_ms: now,
                terminal_recorded: false,
            },
        );
        state.task_order.push(task_id.clone());
        state.round_robin.push_back(task_id.clone());
        self.changed(&mut state);
        let detail = project_task(state.tasks.get(&task_id).expect("task inserted"));
        drop(state);
        self.inner.dispatch.notify_one();
        Ok(detail)
    }

    pub fn list_tasks(&self) -> Result<Vec<TaskSummary>, SchedulerError> {
        let state = self.lock()?;
        let mut list = state
            .task_order
            .iter()
            .filter_map(|id| state.tasks.get(id))
            .filter(|task| !task_status(task).is_terminal())
            .map(project_summary)
            .collect::<Vec<_>>();
        list.extend(
            state
                .terminal_history
                .iter()
                .rev()
                .filter_map(|id| state.tasks.get(id))
                .map(project_summary),
        );
        Ok(list)
    }

    pub fn task(&self, task_id: &str) -> Result<TaskDetail, SchedulerError> {
        let state = self.lock()?;
        state
            .tasks
            .get(task_id)
            .map(project_task)
            .ok_or_else(|| SchedulerError::NotFound {
                entity: "task",
                id: task_id.to_string(),
            })
    }

    pub fn step(&self, step_id: &str) -> Result<StepDetail, SchedulerError> {
        let state = self.lock()?;
        state
            .tasks
            .values()
            .find_map(|task| {
                task.steps
                    .iter()
                    .find(|step| step.id == step_id)
                    .map(|step| project_step(task, step))
            })
            .ok_or_else(|| SchedulerError::NotFound {
                entity: "step",
                id: step_id.to_string(),
            })
    }

    pub fn cancel_task(&self, task_id: &str) -> Result<TaskDetail, SchedulerError> {
        let mut state = self.lock()?;
        let Some(task) = state.tasks.get_mut(task_id) else {
            return Err(SchedulerError::NotFound {
                entity: "task",
                id: task_id.to_string(),
            });
        };

        let has_cancellable = task.steps.iter().any(|step| {
            matches!(
                step.status,
                StepStatus::Queued | StepStatus::Blocked | StepStatus::Running
            )
        });
        if !has_cancellable {
            if task.steps.iter().any(|step| {
                matches!(
                    step.status,
                    StepStatus::Cancelled | StepStatus::CancellationRequested
                )
            }) {
                return Ok(project_task(task));
            }
            return Err(SchedulerError::InvalidTransition {
                entity: "task",
                id: task_id.to_string(),
                status: task_status_name(task_status(task)).to_string(),
                command: "cancel",
                reason: None,
            });
        }

        let now = next_task_timestamp(task);
        for step in &mut task.steps {
            cancel_step_record(step, now);
        }
        task.updated_at_ms = now;
        self.record_terminal_and_admit_next(&mut state, task_id);
        self.changed(&mut state);
        let detail = project_task(
            state
                .tasks
                .get(task_id)
                .expect("cancelled task remains retained"),
        );
        drop(state);
        self.inner.dispatch.notify_one();
        Ok(detail)
    }

    pub fn cancel_step(&self, step_id: &str) -> Result<TaskDetail, SchedulerError> {
        let mut state = self.lock()?;
        let Some(task_id) = state.tasks.values().find_map(|task| {
            task.steps
                .iter()
                .any(|step| step.id == step_id)
                .then(|| task.id.clone())
        }) else {
            return Err(SchedulerError::NotFound {
                entity: "step",
                id: step_id.to_string(),
            });
        };

        {
            let task = state.tasks.get_mut(&task_id).expect("step owner exists");
            let step_index = task
                .steps
                .iter()
                .position(|step| step.id == step_id)
                .expect("step belongs to owner");
            let status = task.steps[step_index].status;
            match status {
                StepStatus::Queued | StepStatus::Blocked | StepStatus::Running => {
                    let now = next_task_timestamp(task);
                    cancel_step_record(&mut task.steps[step_index], now);
                    task.updated_at_ms = now;
                }
                StepStatus::Cancelled | StepStatus::CancellationRequested => {
                    return Ok(project_task(task));
                }
                StepStatus::Completed | StepStatus::Failed => {
                    return Err(SchedulerError::InvalidTransition {
                        entity: "step",
                        id: step_id.to_string(),
                        status: step_status_name(status).to_string(),
                        command: "cancel",
                        reason: None,
                    });
                }
            }
        }
        self.record_terminal_and_admit_next(&mut state, &task_id);
        self.changed(&mut state);
        let detail = project_task(
            state
                .tasks
                .get(&task_id)
                .expect("step owner remains retained"),
        );
        drop(state);
        self.inner.dispatch.notify_one();
        Ok(detail)
    }

    pub fn retry_step(&self, step_id: &str) -> Result<TaskDetail, SchedulerError> {
        let mut state = self.lock()?;
        let Some(task_id) = state.tasks.values().find_map(|task| {
            task.steps
                .iter()
                .any(|step| step.id == step_id)
                .then(|| task.id.clone())
        }) else {
            return Err(SchedulerError::NotFound {
                entity: "step",
                id: step_id.to_string(),
            });
        };

        let current_status = state
            .tasks
            .get(&task_id)
            .and_then(|task| task.steps.iter().find(|step| step.id == step_id))
            .map(|step| step.status)
            .expect("step belongs to owner");
        if !matches!(current_status, StepStatus::Failed | StepStatus::Cancelled) {
            return Err(SchedulerError::InvalidTransition {
                entity: "step",
                id: step_id.to_string(),
                status: step_status_name(current_status).to_string(),
                command: "retry",
                reason: None,
            });
        }
        let incomplete_dependencies = state
            .tasks
            .get(&task_id)
            .map(|task| {
                let step = task
                    .steps
                    .iter()
                    .find(|step| step.id == step_id)
                    .expect("step belongs to owner");
                step.dependencies
                    .iter()
                    .filter(|dependency_id| {
                        !task.steps.iter().any(|dependency| {
                            dependency.id == dependency_id.as_str()
                                && dependency.status == StepStatus::Completed
                        })
                    })
                    .cloned()
                    .collect::<Vec<_>>()
            })
            .expect("step owner exists");
        if !incomplete_dependencies.is_empty() {
            return Err(SchedulerError::InvalidTransition {
                entity: "step",
                id: step_id.to_string(),
                status: step_status_name(current_status).to_string(),
                command: "retry",
                reason: Some(format!(
                    "dependencies must complete successfully before retry: {}",
                    incomplete_dependencies.join(", ")
                )),
            });
        }
        reactivate_task(&mut state, &task_id);
        {
            let task = state.tasks.get_mut(&task_id).expect("step owner exists");
            let step_index = task
                .steps
                .iter()
                .position(|step| step.id == step_id)
                .expect("step belongs to owner");
            let now = next_task_timestamp(task);
            let status = StepStatus::Queued;
            let (cancellation, _) = watch::channel(false);
            let step = &mut task.steps[step_index];
            step.status = status;
            step.cancellation = cancellation;
            step.work_progress = None;
            step.attempts.push(AttemptRecord {
                id: Uuid::new_v4().to_string(),
                status,
                started_at_ms: None,
                finished_at_ms: None,
                error: None,
            });
            task.updated_at_ms = now;
            refresh_dependency_states(task);
        }
        self.changed(&mut state);
        let detail = project_task(state.tasks.get(&task_id).expect("reactivated task exists"));
        drop(state);
        self.inner.dispatch.notify_one();
        Ok(detail)
    }

    pub async fn wait_for_task_terminal(
        &self,
        task_id: &str,
    ) -> Result<TaskDetail, SchedulerError> {
        let mut changes = self.inner.changes.subscribe();
        loop {
            let task = self.task(task_id)?;
            if task.task.status.is_terminal() {
                return Ok(task);
            }
            changes
                .changed()
                .await
                .map_err(|_| SchedulerError::Poisoned)?;
        }
    }

    fn report_work_progress(
        &self,
        task_id: &str,
        step_id: &str,
        update: StepProgressUpdate,
    ) -> Result<(), SchedulerError> {
        let mut state = self.lock()?;
        let task = state
            .tasks
            .get_mut(task_id)
            .ok_or_else(|| SchedulerError::NotFound {
                entity: "task",
                id: task_id.to_string(),
            })?;
        let now = next_task_timestamp(task);
        let step = task
            .steps
            .iter_mut()
            .find(|step| step.id == step_id)
            .ok_or_else(|| SchedulerError::NotFound {
                entity: "step",
                id: step_id.to_string(),
            })?;
        if !matches!(
            step.status,
            StepStatus::Running | StepStatus::CancellationRequested
        ) {
            return Err(SchedulerError::InvalidTransition {
                entity: "step",
                id: step_id.to_string(),
                status: step_status_name(step.status).to_string(),
                command: "report progress",
                reason: None,
            });
        }
        step.work_progress = Some(StepWorkProgress {
            completed: update.completed.min(update.total),
            message: update.message,
            phase: update.phase,
            total: update.total,
            unit: update.unit,
            updated_at_ms: now,
        });
        task.updated_at_ms = now;
        self.changed(&mut state);
        Ok(())
    }

    async fn dispatch_loop(self) {
        loop {
            self.inner.dispatch.notified().await;
            while let Ok(Some(dispatch)) = self.take_dispatch() {
                let scheduler = self.clone();
                let span = tracing::info_span!(
                    "step_attempt",
                    task_id = %dispatch.task_id,
                    step_id = %dispatch.step_id,
                    attempt_id = %dispatch.attempt_id,
                    workspace_id = %dispatch.workspace_id,
                    step_kind = %dispatch.step_kind,
                );
                let handler_span = span.clone();
                tokio::spawn(
                    async move {
                        let handler_factory = dispatch.handler_factory;
                        let context = dispatch.context;
                        let result = match tokio::spawn(
                            async move { handler_factory(context).await }.instrument(handler_span),
                        )
                        .await
                        {
                            Ok(result) => result,
                            Err(error) if error.is_panic() => Err(StepFailure::new(
                                "step_panicked",
                                "step handler panicked during execution",
                            )),
                            Err(_) => Err(StepFailure::new(
                                "step_aborted",
                                "step handler was aborted during execution",
                            )),
                        };
                        scheduler.finish_step(&dispatch.task_id, &dispatch.step_id, result);
                    }
                    .instrument(span),
                );
            }
        }
    }

    fn take_dispatch(&self) -> Result<Option<Dispatch>, SchedulerError> {
        let mut state = self.lock()?;
        let available = self
            .inner
            .config
            .capacity
            .saturating_sub(state.running_weight);
        if available == 0 {
            return Ok(None);
        }

        let candidates = state.round_robin.len();
        if let Some(last_dispatched) = &state.last_dispatched {
            if let Some(position) = state
                .round_robin
                .iter()
                .position(|task_id| task_id == last_dispatched)
            {
                state.round_robin.rotate_left(position + 1);
            }
        }
        for _ in 0..candidates {
            let Some(task_id) = state.round_robin.pop_front() else {
                break;
            };
            let terminal = state
                .tasks
                .get(&task_id)
                .is_none_or(|task| task_status(task).is_terminal());
            if terminal {
                continue;
            }
            state.round_robin.push_back(task_id.clone());
            let selected = state.tasks.get(&task_id).and_then(|task| {
                if !task.admitted {
                    return None;
                }
                task.steps
                    .iter()
                    .position(|step| {
                        step.status == StepStatus::Queued && dependencies_completed(task, step)
                    })
                    .filter(|index| task.steps[*index].weight <= available)
            });
            let Some(step_index) = selected else {
                continue;
            };

            let (step_id, attempt_id, workspace_id, step_kind, weight, handler_factory, context) = {
                let task = state
                    .tasks
                    .get_mut(&task_id)
                    .expect("round-robin task exists");
                let now = next_task_timestamp(task);
                task.updated_at_ms = now;
                let step = &mut task.steps[step_index];
                step.status = StepStatus::Running;
                let attempt = step.attempts.last_mut().expect("initial attempt exists");
                attempt.status = StepStatus::Running;
                attempt.started_at_ms = Some(now);
                (
                    step.id.clone(),
                    attempt.id.clone(),
                    task.workspace_id.clone(),
                    step.kind.clone(),
                    step.weight,
                    step.handler_factory.clone(),
                    StepContext {
                        cancellation: step.cancellation.subscribe(),
                        scheduler: self.clone(),
                        task_id: task_id.clone(),
                        step_id: step.id.clone(),
                    },
                )
            };
            state.running_weight += weight;
            state.last_dispatched = Some(task_id.clone());
            self.changed(&mut state);
            return Ok(Some(Dispatch {
                task_id,
                step_id,
                attempt_id,
                workspace_id,
                step_kind,
                handler_factory,
                context,
            }));
        }
        Ok(None)
    }

    fn finish_step(&self, task_id: &str, step_id: &str, result: Result<(), StepFailure>) {
        let Ok(mut state) = self.lock() else {
            tracing::error!(task_id, step_id, "task scheduler state poisoned");
            return;
        };
        let mut finished_weight = None;
        if let Some(task) = state.tasks.get_mut(task_id) {
            let now = next_task_timestamp(task);
            if let Some(step) = task.steps.iter_mut().find(|step| step.id == step_id) {
                if !matches!(
                    step.status,
                    StepStatus::Running | StepStatus::CancellationRequested
                ) {
                    return;
                }
                finished_weight = Some(step.weight);
                let attempt = step.attempts.last_mut().expect("running attempt exists");
                match result {
                    Ok(()) => {
                        step.status = StepStatus::Completed;
                        attempt.status = StepStatus::Completed;
                    }
                    Err(failure) if failure.is_cancellation() => {
                        step.status = StepStatus::Cancelled;
                        attempt.status = StepStatus::Cancelled;
                    }
                    Err(failure) => {
                        step.status = StepStatus::Failed;
                        attempt.status = StepStatus::Failed;
                        attempt.error = Some(failure);
                    }
                }
                attempt.finished_at_ms = Some(now);
                task.updated_at_ms = now;
                refresh_dependency_states(task);
            }
        }
        let Some(weight) = finished_weight else {
            return;
        };
        state.running_weight = state.running_weight.saturating_sub(weight);
        self.record_terminal_and_admit_next(&mut state, task_id);
        self.changed(&mut state);
        drop(state);
        self.inner.dispatch.notify_one();
    }

    fn record_terminal_and_admit_next(&self, state: &mut SchedulerState, task_id: &str) {
        let release_workspace = state.tasks.get(task_id).and_then(|task| {
            (task_status(task).is_terminal() && task.mutating && task.admitted)
                .then(|| task.workspace_path.clone())
        });
        let terminal_new = state
            .tasks
            .get(task_id)
            .is_some_and(|task| task_status(task).is_terminal() && !task.terminal_recorded);
        if !terminal_new {
            return;
        }
        if let Some(task) = state.tasks.get_mut(task_id) {
            task.terminal_recorded = true;
            if task.mutating {
                task.admitted = false;
            }
        }
        state.terminal_history.push_back(task_id.to_string());

        if let Some(workspace_path) = release_workspace {
            state.admitted_workspaces.remove(&workspace_path);
            let next = state.task_order.iter().find_map(|candidate_id| {
                let candidate = state.tasks.get(candidate_id)?;
                (!candidate.terminal_recorded
                    && candidate.mutating
                    && !candidate.admitted
                    && candidate.workspace_path == workspace_path)
                    .then(|| candidate_id.clone())
            });
            if let Some(next_id) = next {
                if let Some(task) = state.tasks.get_mut(&next_id) {
                    task.admitted = true;
                    task.updated_at_ms = next_task_timestamp(task);
                }
                state.admitted_workspaces.insert(workspace_path, next_id);
            }
        }

        while state.terminal_history.len() > self.inner.config.history_cap {
            if let Some(evicted) = state.terminal_history.pop_front() {
                state.tasks.remove(&evicted);
                state.task_order.retain(|id| id != &evicted);
                state.round_robin.retain(|id| id != &evicted);
            }
        }
    }

    fn lock(&self) -> Result<MutexGuard<'_, SchedulerState>, SchedulerError> {
        self.inner
            .state
            .lock()
            .map_err(|_| SchedulerError::Poisoned)
    }

    fn changed(&self, state: &mut SchedulerState) {
        state.revision = state.revision.wrapping_add(1);
        self.inner.changes.send_replace(state.revision);
    }
}

fn cancel_step_record(step: &mut StepRecord, now: u64) {
    match step.status {
        StepStatus::Queued | StepStatus::Blocked => {
            step.status = StepStatus::Cancelled;
            step.cancellation.send_replace(true);
            let attempt = step.attempts.last_mut().expect("active attempt exists");
            attempt.status = StepStatus::Cancelled;
            attempt.finished_at_ms = Some(now);
        }
        StepStatus::Running => {
            step.status = StepStatus::CancellationRequested;
            step.cancellation.send_replace(true);
            step.attempts
                .last_mut()
                .expect("running attempt exists")
                .status = StepStatus::CancellationRequested;
        }
        StepStatus::CancellationRequested
        | StepStatus::Completed
        | StepStatus::Failed
        | StepStatus::Cancelled => {}
    }
}

fn reactivate_task(state: &mut SchedulerState, task_id: &str) {
    state.terminal_history.retain(|id| id != task_id);
    if !state.round_robin.iter().any(|id| id == task_id) {
        state.round_robin.push_back(task_id.to_string());
    }

    let (mutating, workspace_path) = state
        .tasks
        .get(task_id)
        .map(|task| (task.mutating, task.workspace_path.clone()))
        .expect("reactivated task exists");
    let admitted = if mutating {
        match state.admitted_workspaces.get(&workspace_path) {
            Some(admitted_id) => admitted_id == task_id,
            None => {
                state
                    .admitted_workspaces
                    .insert(workspace_path, task_id.to_string());
                true
            }
        }
    } else {
        true
    };
    let task = state
        .tasks
        .get_mut(task_id)
        .expect("reactivated task exists");
    task.admitted = admitted;
    task.terminal_recorded = false;
}

fn project_task(task: &TaskRecord) -> TaskDetail {
    TaskDetail {
        task: project_summary(task),
        steps: task
            .steps
            .iter()
            .map(|step| project_step(task, step))
            .collect(),
    }
}

fn project_summary(task: &TaskRecord) -> TaskSummary {
    let progress = task_progress(task);
    let active_step = task.steps.iter().find(|step| {
        matches!(
            step.status,
            StepStatus::Running | StepStatus::CancellationRequested
        )
    });
    TaskSummary {
        active_step_kind: active_step.map(|step| step.kind.clone()),
        attention: if progress.failed > 0 {
            TaskAttention::Error
        } else {
            TaskAttention::None
        },
        created_at_ms: task.created_at_ms,
        kind: task.kind.clone(),
        mutating: task.mutating,
        task_id: task.id.clone(),
        progress,
        status: task_status(task),
        updated_at_ms: task.updated_at_ms,
        workspace_id: task.workspace_id.clone(),
        workspace_path: task.workspace_path.clone(),
        work_progress: active_step.and_then(|step| step.work_progress.clone()),
    }
}

fn project_step(task: &TaskRecord, step: &StepRecord) -> StepDetail {
    StepDetail {
        attempts: step
            .attempts
            .iter()
            .map(|attempt| StepAttempt {
                attempt_id: attempt.id.clone(),
                error: attempt.error.as_ref().map(|failure| StepError {
                    code: failure.code.clone(),
                    message: failure.message.clone(),
                }),
                finished_at_ms: attempt.finished_at_ms,
                task_id: task.id.clone(),
                started_at_ms: attempt.started_at_ms,
                status: attempt.status,
                step_id: step.id.clone(),
            })
            .collect(),
        blocked_by: dependency_blocks(task, step),
        dependencies: step.dependencies.clone(),
        enqueue_order: step.enqueue_order,
        task_id: task.id.clone(),
        status: step.status,
        step_id: step.id.clone(),
        step_kind: step.kind.clone(),
        weight: step.weight,
        work_progress: step.work_progress.clone(),
        workspace_id: task.workspace_id.clone(),
    }
}

fn task_progress(task: &TaskRecord) -> TaskProgress {
    let mut progress = TaskProgress {
        blocked: 0,
        cancellation_requested: 0,
        cancelled: 0,
        completed: 0,
        failed: 0,
        queued: 0,
        running: 0,
        total: task.steps.len() as u32,
    };
    for step in &task.steps {
        match step.status {
            StepStatus::Queued => progress.queued += 1,
            StepStatus::Blocked => progress.blocked += 1,
            StepStatus::Running => progress.running += 1,
            StepStatus::Completed => progress.completed += 1,
            StepStatus::Failed => progress.failed += 1,
            StepStatus::Cancelled => progress.cancelled += 1,
            StepStatus::CancellationRequested => progress.cancellation_requested += 1,
        }
    }
    progress
}

fn task_status(task: &TaskRecord) -> TaskStatus {
    let progress = task_progress(task);
    if progress.cancellation_requested > 0 {
        TaskStatus::CancellationRequested
    } else if progress.running > 0 {
        TaskStatus::Running
    } else if progress.queued > 0 {
        TaskStatus::Queued
    } else if progress.completed == progress.total {
        TaskStatus::Completed
    } else if progress.cancelled == progress.total {
        TaskStatus::Cancelled
    } else if progress.completed > 0
        && (progress.failed > 0 || progress.cancelled > 0 || progress.blocked > 0)
    {
        TaskStatus::PartiallyComplete
    } else if progress.failed > 0 || progress.blocked > 0 {
        TaskStatus::Failed
    } else {
        TaskStatus::Cancelled
    }
}

fn step_status_name(status: StepStatus) -> &'static str {
    match status {
        StepStatus::Queued => "queued",
        StepStatus::Blocked => "blocked",
        StepStatus::Running => "running",
        StepStatus::Completed => "completed",
        StepStatus::Failed => "failed",
        StepStatus::Cancelled => "cancelled",
        StepStatus::CancellationRequested => "cancellation-requested",
    }
}

fn task_status_name(status: TaskStatus) -> &'static str {
    match status {
        TaskStatus::Queued => "queued",
        TaskStatus::Running => "running",
        TaskStatus::PartiallyComplete => "partially-complete",
        TaskStatus::Completed => "completed",
        TaskStatus::Failed => "failed",
        TaskStatus::Cancelled => "cancelled",
        TaskStatus::CancellationRequested => "cancellation-requested",
    }
}

trait TerminalStatus {
    fn is_terminal(&self) -> bool;
}

impl TerminalStatus for TaskStatus {
    fn is_terminal(&self) -> bool {
        matches!(
            *self,
            TaskStatus::PartiallyComplete
                | TaskStatus::Completed
                | TaskStatus::Failed
                | TaskStatus::Cancelled
        )
    }
}

fn validate_graph(steps: &[StepSpec], state: &SchedulerState) -> Result<(), SchedulerError> {
    let local_ids = steps
        .iter()
        .map(|step| step.id.as_str())
        .collect::<HashSet<_>>();
    let existing_owners = state
        .tasks
        .values()
        .flat_map(|task| {
            task.steps
                .iter()
                .map(move |step| (step.id.as_str(), task.id.as_str()))
        })
        .collect::<HashMap<_, _>>();

    for step in steps {
        for dependency_id in &step.dependencies {
            if local_ids.contains(dependency_id.as_str()) {
                continue;
            }
            if let Some(task_id) = existing_owners.get(dependency_id.as_str()) {
                return Err(SchedulerError::CrossTaskDependency {
                    step_id: step.id.clone(),
                    dependency_id: dependency_id.clone(),
                    task_id: (*task_id).to_string(),
                });
            }
            return Err(SchedulerError::MissingDependency {
                step_id: step.id.clone(),
                dependency_id: dependency_id.clone(),
            });
        }
    }

    let mut remaining_dependencies = steps
        .iter()
        .map(|step| (step.id.as_str(), step.dependencies.len()))
        .collect::<HashMap<_, _>>();
    let mut dependents = HashMap::<&str, Vec<&str>>::new();
    for step in steps {
        for dependency_id in &step.dependencies {
            dependents
                .entry(dependency_id.as_str())
                .or_default()
                .push(step.id.as_str());
        }
    }
    let mut ready = remaining_dependencies
        .iter()
        .filter_map(|(step_id, count)| (*count == 0).then_some(*step_id))
        .collect::<VecDeque<_>>();
    let mut visited = 0;
    while let Some(step_id) = ready.pop_front() {
        visited += 1;
        for dependent_id in dependents.get(step_id).into_iter().flatten() {
            let count = remaining_dependencies
                .get_mut(dependent_id)
                .expect("dependent belongs to graph");
            *count -= 1;
            if *count == 0 {
                ready.push_back(dependent_id);
            }
        }
    }
    if visited != steps.len() {
        let mut step_ids = steps
            .iter()
            .filter(|step| remaining_dependencies[step.id.as_str()] > 0)
            .map(|step| step.id.clone())
            .collect::<Vec<_>>();
        step_ids.sort();
        return Err(SchedulerError::CyclicDependency { step_ids });
    }
    Ok(())
}

fn dependencies_completed(task: &TaskRecord, step: &StepRecord) -> bool {
    step.dependencies.iter().all(|dependency_id| {
        task.steps
            .iter()
            .find(|candidate| candidate.id == *dependency_id)
            .is_some_and(|dependency| dependency.status == StepStatus::Completed)
    })
}

fn refresh_dependency_states(task: &mut TaskRecord) {
    let completed = task
        .steps
        .iter()
        .filter(|step| step.status == StepStatus::Completed)
        .map(|step| step.id.clone())
        .collect::<HashSet<_>>();
    for step in &mut task.steps {
        if step.status == StepStatus::Blocked
            && step
                .dependencies
                .iter()
                .all(|dependency_id| completed.contains(dependency_id))
        {
            step.status = StepStatus::Queued;
            step.attempts
                .last_mut()
                .expect("blocked step has an attempt")
                .status = StepStatus::Queued;
        }
    }
}

fn dependency_blocks(task: &TaskRecord, step: &StepRecord) -> Vec<StepDependencyBlock> {
    let mut blocks = Vec::new();
    let mut visited = HashSet::new();
    for dependency_id in &step.dependencies {
        collect_dependency_blocks(task, dependency_id, &mut visited, &mut blocks);
    }
    blocks.sort_by_key(|block| {
        task.steps
            .iter()
            .find(|step| step.id == block.step_id)
            .map_or(u64::MAX, |step| step.enqueue_order)
    });
    blocks
}

fn collect_dependency_blocks(
    task: &TaskRecord,
    step_id: &str,
    visited: &mut HashSet<String>,
    blocks: &mut Vec<StepDependencyBlock>,
) {
    if !visited.insert(step_id.to_string()) {
        return;
    }
    let Some(step) = task.steps.iter().find(|step| step.id == step_id) else {
        return;
    };
    match step.status {
        StepStatus::Failed | StepStatus::Cancelled => {
            blocks.push(StepDependencyBlock {
                error: step
                    .attempts
                    .last()
                    .and_then(|attempt| attempt.error.as_ref())
                    .map(|failure| StepError {
                        code: failure.code.clone(),
                        message: failure.message.clone(),
                    }),
                status: step.status,
                step_id: step.id.clone(),
                step_kind: step.kind.clone(),
            });
        }
        StepStatus::Blocked => {
            for dependency_id in &step.dependencies {
                collect_dependency_blocks(task, dependency_id, visited, blocks);
            }
        }
        StepStatus::Queued
        | StepStatus::Running
        | StepStatus::Completed
        | StepStatus::CancellationRequested => {}
    }
}

fn timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn next_task_timestamp(task: &TaskRecord) -> u64 {
    timestamp_ms().max(task.updated_at_ms.saturating_add(1))
}

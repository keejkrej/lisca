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
    OperationAttention, OperationDetail, OperationProgress, OperationStatus, OperationSummary,
    TaskAttempt, TaskDependencyBlock, TaskDetail, TaskError, TaskStatus, TaskWorkProgress,
};
use tokio::sync::{watch, Notify};
use tracing::Instrument;
use uuid::Uuid;

use crate::normalize_workspace_path;

const DEFAULT_HISTORY_CAP: usize = 100;

type TaskFuture = Pin<Box<dyn Future<Output = Result<(), TaskFailure>> + Send + 'static>>;
type TaskHandlerFactory = Arc<dyn Fn(TaskContext) -> TaskFuture + Send + Sync + 'static>;

struct TaskProgressUpdate {
    unit: String,
    completed: u32,
    total: u32,
    phase: Option<String>,
    message: Option<String>,
}

#[derive(Clone)]
pub struct TaskContext {
    cancellation: watch::Receiver<bool>,
    scheduler: TaskScheduler,
    operation_id: String,
    task_id: String,
}

impl TaskContext {
    pub fn is_cancellation_requested(&self) -> bool {
        *self.cancellation.borrow()
    }

    pub fn checkpoint(&self) -> Result<(), TaskFailure> {
        if self.is_cancellation_requested() {
            Err(TaskFailure::cancelled())
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
    ) -> Result<(), TaskFailure> {
        self.scheduler
            .report_work_progress(
                &self.operation_id,
                &self.task_id,
                TaskProgressUpdate {
                    unit: unit.into(),
                    completed,
                    total,
                    phase,
                    message,
                },
            )
            .map_err(|error| TaskFailure::new("progress_report_failed", error.to_string()))
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SchedulerConfig {
    pub capacity: u32,
    pub history_cap: usize,
}

impl SchedulerConfig {
    pub fn from_environment() -> Self {
        let capacity = std::env::var("LISCA_TASK_CAPACITY")
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
pub struct TaskFailure {
    pub code: String,
    pub message: String,
}

impl TaskFailure {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }

    pub fn cancelled() -> Self {
        Self::new("task_cancelled", "task execution was cancelled")
    }

    fn is_cancellation(&self) -> bool {
        self.code == "task_cancelled"
    }
}

pub struct TaskSpec {
    id: String,
    kind: String,
    weight: u32,
    dependencies: Vec<String>,
    handler_factory: TaskHandlerFactory,
}

impl TaskSpec {
    pub fn new<F, Fut>(kind: impl Into<String>, weight: u32, handler_factory: F) -> Self
    where
        F: Fn(TaskContext) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<(), TaskFailure>> + Send + 'static,
    {
        Self {
            id: Uuid::new_v4().to_string(),
            kind: kind.into(),
            weight,
            dependencies: Vec::new(),
            handler_factory: Arc::new(move |context| Box::pin(handler_factory(context))),
        }
    }

    pub fn task_id(&self) -> &str {
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

pub struct OperationSpec {
    kind: String,
    workspace_path: String,
    mutating: bool,
    tasks: Vec<TaskSpec>,
}

impl OperationSpec {
    pub fn new(
        kind: impl Into<String>,
        workspace_path: impl Into<String>,
        mutating: bool,
        tasks: Vec<TaskSpec>,
    ) -> Self {
        Self {
            kind: kind.into(),
            workspace_path: workspace_path.into(),
            mutating,
            tasks,
        }
    }
}

#[derive(Debug, Eq, PartialEq)]
pub enum SchedulerError {
    InvalidCapacity,
    InvalidHistoryCap,
    EmptyOperation,
    InvalidOperationKind,
    InvalidTaskKind,
    InvalidWorkspace,
    InvalidWeight {
        weight: u32,
        capacity: u32,
    },
    MissingDependency {
        task_id: String,
        dependency_id: String,
    },
    CrossOperationDependency {
        task_id: String,
        dependency_id: String,
        operation_id: String,
    },
    CyclicDependency {
        task_ids: Vec<String>,
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
            Self::InvalidCapacity => formatter.write_str("task capacity must be greater than zero"),
            Self::InvalidHistoryCap => {
                formatter.write_str("task history cap must be greater than zero")
            }
            Self::EmptyOperation => {
                formatter.write_str("an operation must contain at least one task")
            }
            Self::InvalidOperationKind => formatter.write_str("operation kind is required"),
            Self::InvalidTaskKind => formatter.write_str("task kind is required"),
            Self::InvalidWorkspace => formatter.write_str("workspace path is required"),
            Self::InvalidWeight { weight, capacity } => write!(
                formatter,
                "task weight {weight} must be between 1 and scheduler capacity {capacity}"
            ),
            Self::MissingDependency {
                task_id,
                dependency_id,
            } => write!(
                formatter,
                "task {task_id} references missing dependency {dependency_id}"
            ),
            Self::CrossOperationDependency {
                task_id,
                dependency_id,
                operation_id,
            } => write!(
                formatter,
                "task {task_id} references dependency {dependency_id} from operation {operation_id}"
            ),
            Self::CyclicDependency { task_ids } => write!(
                formatter,
                "task dependency graph contains a cycle involving {}",
                task_ids.join(", ")
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
    operations: HashMap<String, OperationRecord>,
    operation_order: Vec<String>,
    round_robin: VecDeque<String>,
    last_dispatched: Option<String>,
    terminal_history: VecDeque<String>,
    admitted_workspaces: HashMap<String, String>,
    running_weight: u32,
    next_enqueue_order: u64,
    revision: u64,
}

struct OperationRecord {
    id: String,
    kind: String,
    workspace_id: String,
    workspace_path: String,
    mutating: bool,
    admitted: bool,
    tasks: Vec<TaskRecord>,
    created_at_ms: u64,
    updated_at_ms: u64,
    terminal_recorded: bool,
}

struct TaskRecord {
    id: String,
    kind: String,
    weight: u32,
    enqueue_order: u64,
    dependencies: Vec<String>,
    status: TaskStatus,
    handler_factory: TaskHandlerFactory,
    cancellation: watch::Sender<bool>,
    attempts: Vec<AttemptRecord>,
    work_progress: Option<TaskWorkProgress>,
}

struct AttemptRecord {
    id: String,
    status: TaskStatus,
    started_at_ms: Option<u64>,
    finished_at_ms: Option<u64>,
    error: Option<TaskFailure>,
}

struct Dispatch {
    operation_id: String,
    task_id: String,
    attempt_id: String,
    workspace_id: String,
    task_kind: String,
    handler_factory: TaskHandlerFactory,
    context: TaskContext,
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
                    operations: HashMap::new(),
                    operation_order: Vec::new(),
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

    pub fn submit(&self, spec: OperationSpec) -> Result<OperationDetail, SchedulerError> {
        let operation_kind = spec.kind.trim().to_string();
        if operation_kind.is_empty() {
            return Err(SchedulerError::InvalidOperationKind);
        }
        if spec.tasks.is_empty() {
            return Err(SchedulerError::EmptyOperation);
        }
        let workspace_path = normalize_workspace_path(&spec.workspace_path);
        if workspace_path.is_empty() {
            return Err(SchedulerError::InvalidWorkspace);
        }
        for task in &spec.tasks {
            if task.kind.trim().is_empty() {
                return Err(SchedulerError::InvalidTaskKind);
            }
            if task.weight == 0 || task.weight > self.inner.config.capacity {
                return Err(SchedulerError::InvalidWeight {
                    weight: task.weight,
                    capacity: self.inner.config.capacity,
                });
            }
        }

        let mut state = self.lock()?;
        validate_graph(&spec.tasks, &state)?;

        let operation_id = Uuid::new_v4().to_string();
        let workspace_id =
            Uuid::new_v5(&Uuid::NAMESPACE_URL, workspace_path.as_bytes()).to_string();
        let now = timestamp_ms();
        let admitted = !spec.mutating || !state.admitted_workspaces.contains_key(&workspace_path);
        if spec.mutating && admitted {
            state
                .admitted_workspaces
                .insert(workspace_path.clone(), operation_id.clone());
        }
        let mut tasks = Vec::with_capacity(spec.tasks.len());
        for task in spec.tasks {
            let attempt_id = Uuid::new_v4().to_string();
            let (cancellation, _) = watch::channel(false);
            let enqueue_order = state.next_enqueue_order;
            state.next_enqueue_order += 1;
            let status = if task.dependencies.is_empty() {
                TaskStatus::Queued
            } else {
                TaskStatus::Blocked
            };
            tasks.push(TaskRecord {
                id: task.id,
                kind: task.kind.trim().to_string(),
                weight: task.weight,
                enqueue_order,
                dependencies: task.dependencies,
                status,
                handler_factory: task.handler_factory,
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
        state.operations.insert(
            operation_id.clone(),
            OperationRecord {
                id: operation_id.clone(),
                kind: operation_kind,
                workspace_id,
                workspace_path,
                mutating: spec.mutating,
                admitted,
                tasks,
                created_at_ms: now,
                updated_at_ms: now,
                terminal_recorded: false,
            },
        );
        state.operation_order.push(operation_id.clone());
        state.round_robin.push_back(operation_id.clone());
        self.changed(&mut state);
        let detail = project_operation(
            state
                .operations
                .get(&operation_id)
                .expect("operation inserted"),
        );
        drop(state);
        self.inner.dispatch.notify_one();
        Ok(detail)
    }

    pub fn list_operations(&self) -> Result<Vec<OperationSummary>, SchedulerError> {
        let state = self.lock()?;
        let mut list = state
            .operation_order
            .iter()
            .filter_map(|id| state.operations.get(id))
            .filter(|operation| !operation_status(operation).is_terminal())
            .map(project_summary)
            .collect::<Vec<_>>();
        list.extend(
            state
                .terminal_history
                .iter()
                .rev()
                .filter_map(|id| state.operations.get(id))
                .map(project_summary),
        );
        Ok(list)
    }

    pub fn operation(&self, operation_id: &str) -> Result<OperationDetail, SchedulerError> {
        let state = self.lock()?;
        state
            .operations
            .get(operation_id)
            .map(project_operation)
            .ok_or_else(|| SchedulerError::NotFound {
                entity: "operation",
                id: operation_id.to_string(),
            })
    }

    pub fn task(&self, task_id: &str) -> Result<TaskDetail, SchedulerError> {
        let state = self.lock()?;
        state
            .operations
            .values()
            .find_map(|operation| {
                operation
                    .tasks
                    .iter()
                    .find(|task| task.id == task_id)
                    .map(|task| project_task(operation, task))
            })
            .ok_or_else(|| SchedulerError::NotFound {
                entity: "task",
                id: task_id.to_string(),
            })
    }

    pub fn cancel_operation(&self, operation_id: &str) -> Result<OperationDetail, SchedulerError> {
        let mut state = self.lock()?;
        let Some(operation) = state.operations.get_mut(operation_id) else {
            return Err(SchedulerError::NotFound {
                entity: "operation",
                id: operation_id.to_string(),
            });
        };

        let has_cancellable = operation.tasks.iter().any(|task| {
            matches!(
                task.status,
                TaskStatus::Queued | TaskStatus::Blocked | TaskStatus::Running
            )
        });
        if !has_cancellable {
            if operation.tasks.iter().any(|task| {
                matches!(
                    task.status,
                    TaskStatus::Cancelled | TaskStatus::CancellationRequested
                )
            }) {
                return Ok(project_operation(operation));
            }
            return Err(SchedulerError::InvalidTransition {
                entity: "operation",
                id: operation_id.to_string(),
                status: operation_status_name(operation_status(operation)).to_string(),
                command: "cancel",
                reason: None,
            });
        }

        let now = next_operation_timestamp(operation);
        for task in &mut operation.tasks {
            cancel_task_record(task, now);
        }
        operation.updated_at_ms = now;
        self.record_terminal_and_admit_next(&mut state, operation_id);
        self.changed(&mut state);
        let detail = project_operation(
            state
                .operations
                .get(operation_id)
                .expect("cancelled operation remains retained"),
        );
        drop(state);
        self.inner.dispatch.notify_one();
        Ok(detail)
    }

    pub fn cancel_task(&self, task_id: &str) -> Result<OperationDetail, SchedulerError> {
        let mut state = self.lock()?;
        let Some(operation_id) = state.operations.values().find_map(|operation| {
            operation
                .tasks
                .iter()
                .any(|task| task.id == task_id)
                .then(|| operation.id.clone())
        }) else {
            return Err(SchedulerError::NotFound {
                entity: "task",
                id: task_id.to_string(),
            });
        };

        {
            let operation = state
                .operations
                .get_mut(&operation_id)
                .expect("task owner exists");
            let task_index = operation
                .tasks
                .iter()
                .position(|task| task.id == task_id)
                .expect("task belongs to owner");
            let status = operation.tasks[task_index].status;
            match status {
                TaskStatus::Queued | TaskStatus::Blocked | TaskStatus::Running => {
                    let now = next_operation_timestamp(operation);
                    cancel_task_record(&mut operation.tasks[task_index], now);
                    operation.updated_at_ms = now;
                }
                TaskStatus::Cancelled | TaskStatus::CancellationRequested => {
                    return Ok(project_operation(operation));
                }
                TaskStatus::Completed | TaskStatus::Failed => {
                    return Err(SchedulerError::InvalidTransition {
                        entity: "task",
                        id: task_id.to_string(),
                        status: task_status_name(status).to_string(),
                        command: "cancel",
                        reason: None,
                    });
                }
            }
        }
        self.record_terminal_and_admit_next(&mut state, &operation_id);
        self.changed(&mut state);
        let detail = project_operation(
            state
                .operations
                .get(&operation_id)
                .expect("task owner remains retained"),
        );
        drop(state);
        self.inner.dispatch.notify_one();
        Ok(detail)
    }

    pub fn retry_task(&self, task_id: &str) -> Result<OperationDetail, SchedulerError> {
        let mut state = self.lock()?;
        let Some(operation_id) = state.operations.values().find_map(|operation| {
            operation
                .tasks
                .iter()
                .any(|task| task.id == task_id)
                .then(|| operation.id.clone())
        }) else {
            return Err(SchedulerError::NotFound {
                entity: "task",
                id: task_id.to_string(),
            });
        };

        let current_status = state
            .operations
            .get(&operation_id)
            .and_then(|operation| operation.tasks.iter().find(|task| task.id == task_id))
            .map(|task| task.status)
            .expect("task belongs to owner");
        if !matches!(current_status, TaskStatus::Failed | TaskStatus::Cancelled) {
            return Err(SchedulerError::InvalidTransition {
                entity: "task",
                id: task_id.to_string(),
                status: task_status_name(current_status).to_string(),
                command: "retry",
                reason: None,
            });
        }
        let incomplete_dependencies = state
            .operations
            .get(&operation_id)
            .map(|operation| {
                let task = operation
                    .tasks
                    .iter()
                    .find(|task| task.id == task_id)
                    .expect("task belongs to owner");
                task.dependencies
                    .iter()
                    .filter(|dependency_id| {
                        !operation.tasks.iter().any(|dependency| {
                            dependency.id == dependency_id.as_str()
                                && dependency.status == TaskStatus::Completed
                        })
                    })
                    .cloned()
                    .collect::<Vec<_>>()
            })
            .expect("task owner exists");
        if !incomplete_dependencies.is_empty() {
            return Err(SchedulerError::InvalidTransition {
                entity: "task",
                id: task_id.to_string(),
                status: task_status_name(current_status).to_string(),
                command: "retry",
                reason: Some(format!(
                    "dependencies must complete successfully before retry: {}",
                    incomplete_dependencies.join(", ")
                )),
            });
        }
        reactivate_operation(&mut state, &operation_id);
        {
            let operation = state
                .operations
                .get_mut(&operation_id)
                .expect("task owner exists");
            let task_index = operation
                .tasks
                .iter()
                .position(|task| task.id == task_id)
                .expect("task belongs to owner");
            let now = next_operation_timestamp(operation);
            let status = TaskStatus::Queued;
            let (cancellation, _) = watch::channel(false);
            let task = &mut operation.tasks[task_index];
            task.status = status;
            task.cancellation = cancellation;
            task.work_progress = None;
            task.attempts.push(AttemptRecord {
                id: Uuid::new_v4().to_string(),
                status,
                started_at_ms: None,
                finished_at_ms: None,
                error: None,
            });
            operation.updated_at_ms = now;
            refresh_dependency_states(operation);
        }
        self.changed(&mut state);
        let detail = project_operation(
            state
                .operations
                .get(&operation_id)
                .expect("reactivated operation exists"),
        );
        drop(state);
        self.inner.dispatch.notify_one();
        Ok(detail)
    }

    pub async fn wait_for_operation_terminal(
        &self,
        operation_id: &str,
    ) -> Result<OperationDetail, SchedulerError> {
        let mut changes = self.inner.changes.subscribe();
        loop {
            let operation = self.operation(operation_id)?;
            if operation.operation.status.is_terminal() {
                return Ok(operation);
            }
            changes
                .changed()
                .await
                .map_err(|_| SchedulerError::Poisoned)?;
        }
    }

    fn report_work_progress(
        &self,
        operation_id: &str,
        task_id: &str,
        update: TaskProgressUpdate,
    ) -> Result<(), SchedulerError> {
        let mut state = self.lock()?;
        let operation =
            state
                .operations
                .get_mut(operation_id)
                .ok_or_else(|| SchedulerError::NotFound {
                    entity: "operation",
                    id: operation_id.to_string(),
                })?;
        let now = next_operation_timestamp(operation);
        let task = operation
            .tasks
            .iter_mut()
            .find(|task| task.id == task_id)
            .ok_or_else(|| SchedulerError::NotFound {
                entity: "task",
                id: task_id.to_string(),
            })?;
        if !matches!(
            task.status,
            TaskStatus::Running | TaskStatus::CancellationRequested
        ) {
            return Err(SchedulerError::InvalidTransition {
                entity: "task",
                id: task_id.to_string(),
                status: task_status_name(task.status).to_string(),
                command: "report progress",
                reason: None,
            });
        }
        task.work_progress = Some(TaskWorkProgress {
            completed: update.completed.min(update.total),
            message: update.message,
            phase: update.phase,
            total: update.total,
            unit: update.unit,
            updated_at_ms: now,
        });
        operation.updated_at_ms = now;
        self.changed(&mut state);
        Ok(())
    }

    async fn dispatch_loop(self) {
        loop {
            self.inner.dispatch.notified().await;
            while let Ok(Some(dispatch)) = self.take_dispatch() {
                let scheduler = self.clone();
                let span = tracing::info_span!(
                    "task_attempt",
                    operation_id = %dispatch.operation_id,
                    task_id = %dispatch.task_id,
                    attempt_id = %dispatch.attempt_id,
                    workspace_id = %dispatch.workspace_id,
                    task_kind = %dispatch.task_kind,
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
                            Err(error) if error.is_panic() => Err(TaskFailure::new(
                                "task_panicked",
                                "task handler panicked during execution",
                            )),
                            Err(_) => Err(TaskFailure::new(
                                "task_aborted",
                                "task handler was aborted during execution",
                            )),
                        };
                        scheduler.finish_task(&dispatch.operation_id, &dispatch.task_id, result);
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
                .position(|operation_id| operation_id == last_dispatched)
            {
                state.round_robin.rotate_left(position + 1);
            }
        }
        for _ in 0..candidates {
            let Some(operation_id) = state.round_robin.pop_front() else {
                break;
            };
            let terminal = state
                .operations
                .get(&operation_id)
                .is_none_or(|operation| operation_status(operation).is_terminal());
            if terminal {
                continue;
            }
            state.round_robin.push_back(operation_id.clone());
            let selected = state.operations.get(&operation_id).and_then(|operation| {
                if !operation.admitted {
                    return None;
                }
                operation
                    .tasks
                    .iter()
                    .position(|task| {
                        task.status == TaskStatus::Queued && dependencies_completed(operation, task)
                    })
                    .filter(|index| operation.tasks[*index].weight <= available)
            });
            let Some(task_index) = selected else {
                continue;
            };

            let (task_id, attempt_id, workspace_id, task_kind, weight, handler_factory, context) = {
                let operation = state
                    .operations
                    .get_mut(&operation_id)
                    .expect("round-robin operation exists");
                let now = next_operation_timestamp(operation);
                operation.updated_at_ms = now;
                let task = &mut operation.tasks[task_index];
                task.status = TaskStatus::Running;
                let attempt = task.attempts.last_mut().expect("initial attempt exists");
                attempt.status = TaskStatus::Running;
                attempt.started_at_ms = Some(now);
                (
                    task.id.clone(),
                    attempt.id.clone(),
                    operation.workspace_id.clone(),
                    task.kind.clone(),
                    task.weight,
                    task.handler_factory.clone(),
                    TaskContext {
                        cancellation: task.cancellation.subscribe(),
                        scheduler: self.clone(),
                        operation_id: operation_id.clone(),
                        task_id: task.id.clone(),
                    },
                )
            };
            state.running_weight += weight;
            state.last_dispatched = Some(operation_id.clone());
            self.changed(&mut state);
            return Ok(Some(Dispatch {
                operation_id,
                task_id,
                attempt_id,
                workspace_id,
                task_kind,
                handler_factory,
                context,
            }));
        }
        Ok(None)
    }

    fn finish_task(&self, operation_id: &str, task_id: &str, result: Result<(), TaskFailure>) {
        let Ok(mut state) = self.lock() else {
            tracing::error!(operation_id, task_id, "task scheduler state poisoned");
            return;
        };
        let mut finished_weight = None;
        if let Some(operation) = state.operations.get_mut(operation_id) {
            let now = next_operation_timestamp(operation);
            if let Some(task) = operation.tasks.iter_mut().find(|task| task.id == task_id) {
                if !matches!(
                    task.status,
                    TaskStatus::Running | TaskStatus::CancellationRequested
                ) {
                    return;
                }
                finished_weight = Some(task.weight);
                let attempt = task.attempts.last_mut().expect("running attempt exists");
                match result {
                    Ok(()) => {
                        task.status = TaskStatus::Completed;
                        attempt.status = TaskStatus::Completed;
                    }
                    Err(failure) if failure.is_cancellation() => {
                        task.status = TaskStatus::Cancelled;
                        attempt.status = TaskStatus::Cancelled;
                    }
                    Err(failure) => {
                        task.status = TaskStatus::Failed;
                        attempt.status = TaskStatus::Failed;
                        attempt.error = Some(failure);
                    }
                }
                attempt.finished_at_ms = Some(now);
                operation.updated_at_ms = now;
                refresh_dependency_states(operation);
            }
        }
        let Some(weight) = finished_weight else {
            return;
        };
        state.running_weight = state.running_weight.saturating_sub(weight);
        self.record_terminal_and_admit_next(&mut state, operation_id);
        self.changed(&mut state);
        drop(state);
        self.inner.dispatch.notify_one();
    }

    fn record_terminal_and_admit_next(&self, state: &mut SchedulerState, operation_id: &str) {
        let release_workspace = state.operations.get(operation_id).and_then(|operation| {
            (operation_status(operation).is_terminal() && operation.mutating && operation.admitted)
                .then(|| operation.workspace_path.clone())
        });
        let terminal_new = state.operations.get(operation_id).is_some_and(|operation| {
            operation_status(operation).is_terminal() && !operation.terminal_recorded
        });
        if !terminal_new {
            return;
        }
        if let Some(operation) = state.operations.get_mut(operation_id) {
            operation.terminal_recorded = true;
            if operation.mutating {
                operation.admitted = false;
            }
        }
        state.terminal_history.push_back(operation_id.to_string());

        if let Some(workspace_path) = release_workspace {
            state.admitted_workspaces.remove(&workspace_path);
            let next = state.operation_order.iter().find_map(|candidate_id| {
                let candidate = state.operations.get(candidate_id)?;
                (!candidate.terminal_recorded
                    && candidate.mutating
                    && !candidate.admitted
                    && candidate.workspace_path == workspace_path)
                    .then(|| candidate_id.clone())
            });
            if let Some(next_id) = next {
                if let Some(operation) = state.operations.get_mut(&next_id) {
                    operation.admitted = true;
                    operation.updated_at_ms = next_operation_timestamp(operation);
                }
                state.admitted_workspaces.insert(workspace_path, next_id);
            }
        }

        while state.terminal_history.len() > self.inner.config.history_cap {
            if let Some(evicted) = state.terminal_history.pop_front() {
                state.operations.remove(&evicted);
                state.operation_order.retain(|id| id != &evicted);
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

fn cancel_task_record(task: &mut TaskRecord, now: u64) {
    match task.status {
        TaskStatus::Queued | TaskStatus::Blocked => {
            task.status = TaskStatus::Cancelled;
            task.cancellation.send_replace(true);
            let attempt = task.attempts.last_mut().expect("active attempt exists");
            attempt.status = TaskStatus::Cancelled;
            attempt.finished_at_ms = Some(now);
        }
        TaskStatus::Running => {
            task.status = TaskStatus::CancellationRequested;
            task.cancellation.send_replace(true);
            task.attempts
                .last_mut()
                .expect("running attempt exists")
                .status = TaskStatus::CancellationRequested;
        }
        TaskStatus::CancellationRequested
        | TaskStatus::Completed
        | TaskStatus::Failed
        | TaskStatus::Cancelled => {}
    }
}

fn reactivate_operation(state: &mut SchedulerState, operation_id: &str) {
    state.terminal_history.retain(|id| id != operation_id);
    if !state.round_robin.iter().any(|id| id == operation_id) {
        state.round_robin.push_back(operation_id.to_string());
    }

    let (mutating, workspace_path) = state
        .operations
        .get(operation_id)
        .map(|operation| (operation.mutating, operation.workspace_path.clone()))
        .expect("reactivated operation exists");
    let admitted = if mutating {
        match state.admitted_workspaces.get(&workspace_path) {
            Some(admitted_id) => admitted_id == operation_id,
            None => {
                state
                    .admitted_workspaces
                    .insert(workspace_path, operation_id.to_string());
                true
            }
        }
    } else {
        true
    };
    let operation = state
        .operations
        .get_mut(operation_id)
        .expect("reactivated operation exists");
    operation.admitted = admitted;
    operation.terminal_recorded = false;
}

fn project_operation(operation: &OperationRecord) -> OperationDetail {
    OperationDetail {
        operation: project_summary(operation),
        tasks: operation
            .tasks
            .iter()
            .map(|task| project_task(operation, task))
            .collect(),
    }
}

fn project_summary(operation: &OperationRecord) -> OperationSummary {
    let progress = operation_progress(operation);
    let active_task = operation.tasks.iter().find(|task| {
        matches!(
            task.status,
            TaskStatus::Running | TaskStatus::CancellationRequested
        )
    });
    OperationSummary {
        active_task_kind: active_task.map(|task| task.kind.clone()),
        attention: if progress.failed > 0 {
            OperationAttention::Error
        } else {
            OperationAttention::None
        },
        created_at_ms: operation.created_at_ms,
        kind: operation.kind.clone(),
        mutating: operation.mutating,
        operation_id: operation.id.clone(),
        progress,
        status: operation_status(operation),
        updated_at_ms: operation.updated_at_ms,
        workspace_id: operation.workspace_id.clone(),
        workspace_path: operation.workspace_path.clone(),
        work_progress: active_task.and_then(|task| task.work_progress.clone()),
    }
}

fn project_task(operation: &OperationRecord, task: &TaskRecord) -> TaskDetail {
    TaskDetail {
        attempts: task
            .attempts
            .iter()
            .map(|attempt| TaskAttempt {
                attempt_id: attempt.id.clone(),
                error: attempt.error.as_ref().map(|failure| TaskError {
                    code: failure.code.clone(),
                    message: failure.message.clone(),
                }),
                finished_at_ms: attempt.finished_at_ms,
                operation_id: operation.id.clone(),
                started_at_ms: attempt.started_at_ms,
                status: attempt.status,
                task_id: task.id.clone(),
            })
            .collect(),
        blocked_by: dependency_blocks(operation, task),
        dependencies: task.dependencies.clone(),
        enqueue_order: task.enqueue_order,
        operation_id: operation.id.clone(),
        status: task.status,
        task_id: task.id.clone(),
        task_kind: task.kind.clone(),
        weight: task.weight,
        work_progress: task.work_progress.clone(),
        workspace_id: operation.workspace_id.clone(),
    }
}

fn operation_progress(operation: &OperationRecord) -> OperationProgress {
    let mut progress = OperationProgress {
        blocked: 0,
        cancellation_requested: 0,
        cancelled: 0,
        completed: 0,
        failed: 0,
        queued: 0,
        running: 0,
        total: operation.tasks.len() as u32,
    };
    for task in &operation.tasks {
        match task.status {
            TaskStatus::Queued => progress.queued += 1,
            TaskStatus::Blocked => progress.blocked += 1,
            TaskStatus::Running => progress.running += 1,
            TaskStatus::Completed => progress.completed += 1,
            TaskStatus::Failed => progress.failed += 1,
            TaskStatus::Cancelled => progress.cancelled += 1,
            TaskStatus::CancellationRequested => progress.cancellation_requested += 1,
        }
    }
    progress
}

fn operation_status(operation: &OperationRecord) -> OperationStatus {
    let progress = operation_progress(operation);
    if progress.cancellation_requested > 0 {
        OperationStatus::CancellationRequested
    } else if progress.running > 0 {
        OperationStatus::Running
    } else if progress.queued > 0 {
        OperationStatus::Queued
    } else if progress.completed == progress.total {
        OperationStatus::Completed
    } else if progress.cancelled == progress.total {
        OperationStatus::Cancelled
    } else if progress.completed > 0
        && (progress.failed > 0 || progress.cancelled > 0 || progress.blocked > 0)
    {
        OperationStatus::PartiallyComplete
    } else if progress.failed > 0 || progress.blocked > 0 {
        OperationStatus::Failed
    } else {
        OperationStatus::Cancelled
    }
}

fn task_status_name(status: TaskStatus) -> &'static str {
    match status {
        TaskStatus::Queued => "queued",
        TaskStatus::Blocked => "blocked",
        TaskStatus::Running => "running",
        TaskStatus::Completed => "completed",
        TaskStatus::Failed => "failed",
        TaskStatus::Cancelled => "cancelled",
        TaskStatus::CancellationRequested => "cancellation-requested",
    }
}

fn operation_status_name(status: OperationStatus) -> &'static str {
    match status {
        OperationStatus::Queued => "queued",
        OperationStatus::Running => "running",
        OperationStatus::PartiallyComplete => "partially-complete",
        OperationStatus::Completed => "completed",
        OperationStatus::Failed => "failed",
        OperationStatus::Cancelled => "cancelled",
        OperationStatus::CancellationRequested => "cancellation-requested",
    }
}

trait TerminalStatus {
    fn is_terminal(&self) -> bool;
}

impl TerminalStatus for OperationStatus {
    fn is_terminal(&self) -> bool {
        matches!(
            *self,
            OperationStatus::PartiallyComplete
                | OperationStatus::Completed
                | OperationStatus::Failed
                | OperationStatus::Cancelled
        )
    }
}

fn validate_graph(tasks: &[TaskSpec], state: &SchedulerState) -> Result<(), SchedulerError> {
    let local_ids = tasks
        .iter()
        .map(|task| task.id.as_str())
        .collect::<HashSet<_>>();
    let existing_owners = state
        .operations
        .values()
        .flat_map(|operation| {
            operation
                .tasks
                .iter()
                .map(move |task| (task.id.as_str(), operation.id.as_str()))
        })
        .collect::<HashMap<_, _>>();

    for task in tasks {
        for dependency_id in &task.dependencies {
            if local_ids.contains(dependency_id.as_str()) {
                continue;
            }
            if let Some(operation_id) = existing_owners.get(dependency_id.as_str()) {
                return Err(SchedulerError::CrossOperationDependency {
                    task_id: task.id.clone(),
                    dependency_id: dependency_id.clone(),
                    operation_id: (*operation_id).to_string(),
                });
            }
            return Err(SchedulerError::MissingDependency {
                task_id: task.id.clone(),
                dependency_id: dependency_id.clone(),
            });
        }
    }

    let mut remaining_dependencies = tasks
        .iter()
        .map(|task| (task.id.as_str(), task.dependencies.len()))
        .collect::<HashMap<_, _>>();
    let mut dependents = HashMap::<&str, Vec<&str>>::new();
    for task in tasks {
        for dependency_id in &task.dependencies {
            dependents
                .entry(dependency_id.as_str())
                .or_default()
                .push(task.id.as_str());
        }
    }
    let mut ready = remaining_dependencies
        .iter()
        .filter_map(|(task_id, count)| (*count == 0).then_some(*task_id))
        .collect::<VecDeque<_>>();
    let mut visited = 0;
    while let Some(task_id) = ready.pop_front() {
        visited += 1;
        for dependent_id in dependents.get(task_id).into_iter().flatten() {
            let count = remaining_dependencies
                .get_mut(dependent_id)
                .expect("dependent belongs to graph");
            *count -= 1;
            if *count == 0 {
                ready.push_back(dependent_id);
            }
        }
    }
    if visited != tasks.len() {
        let mut task_ids = tasks
            .iter()
            .filter(|task| remaining_dependencies[task.id.as_str()] > 0)
            .map(|task| task.id.clone())
            .collect::<Vec<_>>();
        task_ids.sort();
        return Err(SchedulerError::CyclicDependency { task_ids });
    }
    Ok(())
}

fn dependencies_completed(operation: &OperationRecord, task: &TaskRecord) -> bool {
    task.dependencies.iter().all(|dependency_id| {
        operation
            .tasks
            .iter()
            .find(|candidate| candidate.id == *dependency_id)
            .is_some_and(|dependency| dependency.status == TaskStatus::Completed)
    })
}

fn refresh_dependency_states(operation: &mut OperationRecord) {
    let completed = operation
        .tasks
        .iter()
        .filter(|task| task.status == TaskStatus::Completed)
        .map(|task| task.id.clone())
        .collect::<HashSet<_>>();
    for task in &mut operation.tasks {
        if task.status == TaskStatus::Blocked
            && task
                .dependencies
                .iter()
                .all(|dependency_id| completed.contains(dependency_id))
        {
            task.status = TaskStatus::Queued;
            task.attempts
                .last_mut()
                .expect("blocked task has an attempt")
                .status = TaskStatus::Queued;
        }
    }
}

fn dependency_blocks(operation: &OperationRecord, task: &TaskRecord) -> Vec<TaskDependencyBlock> {
    let mut blocks = Vec::new();
    let mut visited = HashSet::new();
    for dependency_id in &task.dependencies {
        collect_dependency_blocks(operation, dependency_id, &mut visited, &mut blocks);
    }
    blocks.sort_by_key(|block| {
        operation
            .tasks
            .iter()
            .find(|task| task.id == block.task_id)
            .map_or(u64::MAX, |task| task.enqueue_order)
    });
    blocks
}

fn collect_dependency_blocks(
    operation: &OperationRecord,
    task_id: &str,
    visited: &mut HashSet<String>,
    blocks: &mut Vec<TaskDependencyBlock>,
) {
    if !visited.insert(task_id.to_string()) {
        return;
    }
    let Some(task) = operation.tasks.iter().find(|task| task.id == task_id) else {
        return;
    };
    match task.status {
        TaskStatus::Failed | TaskStatus::Cancelled => {
            blocks.push(TaskDependencyBlock {
                error: task
                    .attempts
                    .last()
                    .and_then(|attempt| attempt.error.as_ref())
                    .map(|failure| TaskError {
                        code: failure.code.clone(),
                        message: failure.message.clone(),
                    }),
                status: task.status,
                task_id: task.id.clone(),
                task_kind: task.kind.clone(),
            });
        }
        TaskStatus::Blocked => {
            for dependency_id in &task.dependencies {
                collect_dependency_blocks(operation, dependency_id, visited, blocks);
            }
        }
        TaskStatus::Queued
        | TaskStatus::Running
        | TaskStatus::Completed
        | TaskStatus::CancellationRequested => {}
    }
}

fn timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn next_operation_timestamp(operation: &OperationRecord) -> u64 {
    timestamp_ms().max(operation.updated_at_ms.saturating_add(1))
}

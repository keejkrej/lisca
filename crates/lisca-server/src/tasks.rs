use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use lisca::{
    http::FsError,
    protocol::{
        StepCancelRequest, StepDetail, StepDetailQuery, StepRetryRequest, TaskCancelRequest,
        TaskCommandError, TaskCommandErrorCode, TaskCommandErrorEntity, TaskCommandErrorTag,
        TaskDetail, TaskDetailQuery, TaskList,
    },
};

use crate::{SchedulerError, TaskScheduler};

pub trait HasTaskScheduler {
    fn task_scheduler(&self) -> &TaskScheduler;
}

pub fn task_router<S>() -> Router<S>
where
    S: HasTaskScheduler + Clone + Send + Sync + 'static,
{
    Router::new()
        .route("/tasks", get(list_tasks::<S>))
        .route("/tasks/task", get(get_task::<S>))
        .route("/tasks/step", get(get_step::<S>))
        .route("/tasks/task/cancel", post(cancel_task::<S>))
        .route("/tasks/step/cancel", post(cancel_step::<S>))
        .route("/tasks/step/retry", post(retry_step::<S>))
}

async fn list_tasks<S: HasTaskScheduler>(
    State(state): State<S>,
) -> Result<Json<TaskList>, FsError> {
    state
        .task_scheduler()
        .list_tasks()
        .map(TaskList::from)
        .map(Json)
        .map_err(|error| FsError::new(error.to_string()))
}

async fn get_task<S: HasTaskScheduler>(
    State(state): State<S>,
    Query(query): Query<TaskDetailQuery>,
) -> Result<Json<TaskDetail>, FsError> {
    state
        .task_scheduler()
        .task(&query.task_id)
        .map(Json)
        .map_err(|error| FsError::new(error.to_string()))
}

async fn get_step<S: HasTaskScheduler>(
    State(state): State<S>,
    Query(query): Query<StepDetailQuery>,
) -> Result<Json<StepDetail>, FsError> {
    state
        .task_scheduler()
        .step(&query.step_id)
        .map(Json)
        .map_err(|error| FsError::new(error.to_string()))
}

async fn cancel_task<S: HasTaskScheduler>(
    State(state): State<S>,
    Json(request): Json<TaskCancelRequest>,
) -> Result<Json<TaskDetail>, TaskCommandHttpError> {
    state
        .task_scheduler()
        .cancel_task(&request.task_id)
        .map(Json)
        .map_err(TaskCommandHttpError::from)
}

async fn cancel_step<S: HasTaskScheduler>(
    State(state): State<S>,
    Json(request): Json<StepCancelRequest>,
) -> Result<Json<TaskDetail>, TaskCommandHttpError> {
    state
        .task_scheduler()
        .cancel_step(&request.step_id)
        .map(Json)
        .map_err(TaskCommandHttpError::from)
}

async fn retry_step<S: HasTaskScheduler>(
    State(state): State<S>,
    Json(request): Json<StepRetryRequest>,
) -> Result<Json<TaskDetail>, TaskCommandHttpError> {
    state
        .task_scheduler()
        .retry_step(&request.step_id)
        .map(Json)
        .map_err(TaskCommandHttpError::from)
}

struct TaskCommandHttpError(TaskCommandError);

impl From<SchedulerError> for TaskCommandHttpError {
    fn from(error: SchedulerError) -> Self {
        let (code, entity, id, current_status) = match &error {
            SchedulerError::NotFound { entity, id } => (
                TaskCommandErrorCode::NotFound,
                command_entity(entity),
                id.clone(),
                None,
            ),
            SchedulerError::InvalidTransition {
                entity, id, status, ..
            } => (
                TaskCommandErrorCode::InvalidTransition,
                command_entity(entity),
                id.clone(),
                Some(status.clone()),
            ),
            _ => (
                TaskCommandErrorCode::InvalidTransition,
                TaskCommandErrorEntity::Step,
                String::new(),
                None,
            ),
        };
        Self(TaskCommandError {
            code,
            current_status,
            entity,
            id,
            message: error.to_string(),
            tag: TaskCommandErrorTag::TaskCommandError,
        })
    }
}

impl IntoResponse for TaskCommandHttpError {
    fn into_response(self) -> Response {
        (StatusCode::CONFLICT, Json(self.0)).into_response()
    }
}

fn command_entity(entity: &str) -> TaskCommandErrorEntity {
    if entity == "task" {
        TaskCommandErrorEntity::Task
    } else {
        TaskCommandErrorEntity::Step
    }
}

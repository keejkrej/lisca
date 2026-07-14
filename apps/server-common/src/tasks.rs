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
        OperationCancelRequest, OperationDetail, OperationDetailQuery, OperationList,
        TaskCancelRequest, TaskCommandError, TaskCommandErrorCode, TaskCommandErrorEntity,
        TaskCommandErrorTag, TaskDetail, TaskDetailQuery, TaskRetryRequest,
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
        .route("/tasks/operations", get(list_operations::<S>))
        .route("/tasks/operation", get(get_operation::<S>))
        .route("/tasks/task", get(get_task::<S>))
        .route("/tasks/operation/cancel", post(cancel_operation::<S>))
        .route("/tasks/task/cancel", post(cancel_task::<S>))
        .route("/tasks/task/retry", post(retry_task::<S>))
}

async fn list_operations<S: HasTaskScheduler>(
    State(state): State<S>,
) -> Result<Json<OperationList>, FsError> {
    state
        .task_scheduler()
        .list_operations()
        .map(OperationList::from)
        .map(Json)
        .map_err(|error| FsError::new(error.to_string()))
}

async fn get_operation<S: HasTaskScheduler>(
    State(state): State<S>,
    Query(query): Query<OperationDetailQuery>,
) -> Result<Json<OperationDetail>, FsError> {
    state
        .task_scheduler()
        .operation(&query.operation_id)
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

async fn cancel_operation<S: HasTaskScheduler>(
    State(state): State<S>,
    Json(request): Json<OperationCancelRequest>,
) -> Result<Json<OperationDetail>, TaskCommandHttpError> {
    state
        .task_scheduler()
        .cancel_operation(&request.operation_id)
        .map(Json)
        .map_err(TaskCommandHttpError::from)
}

async fn cancel_task<S: HasTaskScheduler>(
    State(state): State<S>,
    Json(request): Json<TaskCancelRequest>,
) -> Result<Json<OperationDetail>, TaskCommandHttpError> {
    state
        .task_scheduler()
        .cancel_task(&request.task_id)
        .map(Json)
        .map_err(TaskCommandHttpError::from)
}

async fn retry_task<S: HasTaskScheduler>(
    State(state): State<S>,
    Json(request): Json<TaskRetryRequest>,
) -> Result<Json<OperationDetail>, TaskCommandHttpError> {
    state
        .task_scheduler()
        .retry_task(&request.task_id)
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
                TaskCommandErrorEntity::Task,
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
    if entity == "operation" {
        TaskCommandErrorEntity::Operation
    } else {
        TaskCommandErrorEntity::Task
    }
}

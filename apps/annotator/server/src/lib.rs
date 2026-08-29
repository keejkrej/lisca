mod routes;

use axum::Router;
use lisca_server::{task_router, HasTaskScheduler, SchedulerConfig, TaskScheduler};

pub use routes::router;

#[derive(Clone)]
struct AnnotatorState {
    tasks: TaskScheduler,
}

impl HasTaskScheduler for AnnotatorState {
    fn task_scheduler(&self) -> &TaskScheduler {
        &self.tasks
    }
}

/// Build the transport-neutral Annotator application.
pub fn app() -> Router {
    let state = AnnotatorState {
        tasks: TaskScheduler::new(SchedulerConfig::default())
            .expect("task scheduler requires a Tokio runtime"),
    };
    Router::new()
        .merge(lisca::http::fs::router())
        .merge(router())
        .merge(task_router())
        .with_state(state)
}

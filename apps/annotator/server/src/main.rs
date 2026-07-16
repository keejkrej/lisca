use axum::Router;
use lisca::{http, protocol::AppId};
use lisca_server::{task_router, HasTaskScheduler, SchedulerConfig, TaskScheduler};

const DEFAULT_PORT: u16 = 8766;

#[derive(Clone)]
struct AnnotatorState {
    tasks: TaskScheduler,
}

impl HasTaskScheduler for AnnotatorState {
    fn task_scheduler(&self) -> &TaskScheduler {
        &self.tasks
    }
}

fn build_router(state: AnnotatorState) -> Router<()> {
    Router::new()
        .merge(http::fs::router())
        .merge(annotator_server::router())
        .merge(task_router())
        .with_state(state)
}

#[tokio::main]
async fn main() {
    let state = AnnotatorState {
        tasks: TaskScheduler::new(SchedulerConfig::default())
            .expect("task scheduler requires a Tokio runtime"),
    };
    http::run_server(AppId::Annotator, DEFAULT_PORT, build_router(state)).await;
}

use aligner_server::{CropJobState, HasCropJobs};
use axum::Router;
use lisca::{http, protocol::AppId};
use lisca_server::{task_router, HasTaskScheduler, SchedulerConfig, TaskScheduler};

const DEFAULT_PORT: u16 = 8765;

#[derive(Clone)]
struct AlignerState {
    crop: CropJobState,
    tasks: TaskScheduler,
}

impl HasTaskScheduler for AlignerState {
    fn task_scheduler(&self) -> &TaskScheduler {
        &self.tasks
    }
}

impl HasCropJobs for AlignerState {
    fn crop_jobs(&self) -> &CropJobState {
        &self.crop
    }
}

fn build_router(state: AlignerState) -> Router<()> {
    Router::new()
        .merge(http::fs::router())
        .merge(aligner_server::router())
        .merge(task_router())
        .with_state(state)
}

#[tokio::main]
async fn main() {
    let state = AlignerState {
        crop: CropJobState::new(),
        tasks: TaskScheduler::new(SchedulerConfig::default())
            .expect("task scheduler requires a Tokio runtime"),
    };
    http::run_server(AppId::Aligner, DEFAULT_PORT, build_router(state)).await;
}

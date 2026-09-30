mod analysis;
mod routes;

use aligner_server::{CropTaskState, HasCropTasks};
use axum::Router;
use lisca_server::{task_router, HasTaskScheduler, SchedulerConfig, TaskScheduler};

pub use analysis::{AnalysisTaskState, HasAnalysisTasks};
pub use routes::router;

#[derive(Clone)]
struct StudioState {
    crop: CropTaskState,
    analysis: AnalysisTaskState,
    tasks: TaskScheduler,
}

impl HasTaskScheduler for StudioState {
    fn task_scheduler(&self) -> &TaskScheduler {
        &self.tasks
    }
}

impl HasCropTasks for StudioState {
    fn crop_tasks(&self) -> &CropTaskState {
        &self.crop
    }
}

impl HasAnalysisTasks for StudioState {
    fn analysis_tasks(&self) -> &AnalysisTaskState {
        &self.analysis
    }
}

/// Build the transport-neutral Studio application.
pub fn app() -> Router {
    let state = StudioState {
        crop: CropTaskState::new(),
        analysis: AnalysisTaskState::new(),
        tasks: TaskScheduler::new(SchedulerConfig::default())
            .expect("task scheduler requires a Tokio runtime"),
    };
    Router::new()
        .merge(lisca::http::fs::router())
        .merge(lisca::http::profile::router())
        .merge(aligner_server::router())
        .merge(aligner_server::crop_router())
        .merge(router())
        .merge(annotator_server::router())
        .merge(task_router())
        .with_state(state)
}

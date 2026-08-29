mod analysis;
mod routes;

use aligner_server::{CropJobState, HasCropJobs};
use axum::Router;
use lisca_server::{task_router, HasTaskScheduler, SchedulerConfig, TaskScheduler};

pub use analysis::{AnalysisJobState, HasAnalysisJobs};
pub use routes::router;

#[derive(Clone)]
struct StudioState {
    crop: CropJobState,
    analysis: AnalysisJobState,
    tasks: TaskScheduler,
}

impl HasTaskScheduler for StudioState {
    fn task_scheduler(&self) -> &TaskScheduler {
        &self.tasks
    }
}

impl HasCropJobs for StudioState {
    fn crop_jobs(&self) -> &CropJobState {
        &self.crop
    }
}

impl HasAnalysisJobs for StudioState {
    fn analysis_jobs(&self) -> &AnalysisJobState {
        &self.analysis
    }
}

/// Build the transport-neutral Studio application.
pub fn app() -> Router {
    let state = StudioState {
        crop: CropJobState::new(),
        analysis: AnalysisJobState::new(),
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

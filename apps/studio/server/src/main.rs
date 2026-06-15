use aligner_server::{CropJobState, HasCropJobs};
use axum::Router;
use lisca::{http, protocol::AppId};
use studio_server::{AnalysisJobState, HasAnalysisJobs};

const DEFAULT_PORT: u16 = 8767;

#[derive(Clone)]
struct StudioState {
    crop: CropJobState,
    analysis: AnalysisJobState,
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

fn build_router(state: StudioState) -> Router<()> {
    Router::new()
        .merge(http::fs::router())
        .merge(http::profile::router())
        .merge(aligner_server::router())
        .merge(studio_server::router())
        .merge(annotator_server::router())
        .with_state(state)
}

#[tokio::main]
async fn main() {
    let state = StudioState {
        crop: CropJobState::new(),
        analysis: AnalysisJobState::new(),
    };
    http::run_server(AppId::Studio, DEFAULT_PORT, build_router(state)).await;
}

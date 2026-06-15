use aligner_server::{CropJobState, HasCropJobs};
use axum::Router;
use lisca::{http, protocol::AppId};

const DEFAULT_PORT: u16 = 8765;

#[derive(Clone)]
struct AlignerState {
    crop: CropJobState,
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
        .with_state(state)
}

#[tokio::main]
async fn main() {
    let state = AlignerState {
        crop: CropJobState::new(),
    };
    http::run_server(AppId::Aligner, DEFAULT_PORT, build_router(state)).await;
}

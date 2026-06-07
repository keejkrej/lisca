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
    let crop_events = state.crop.events.clone();
    Router::new()
        .merge(http::fs::router())
        .merge(aligner_server::router())
        .merge(http::ws::router(
            AppId::Aligner,
            env!("CARGO_PKG_VERSION"),
            http::ws::WsEvents {
                crop: Some(crop_events),
                analysis: None,
            },
        ))
        .with_state(state)
}

#[tokio::main]
async fn main() {
    let state = AlignerState {
        crop: CropJobState::new(),
    };
    http::run_server(AppId::Aligner, DEFAULT_PORT, build_router(state)).await;
}

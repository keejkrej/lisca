use aligner_server::{CropJobState, HasCropJobs};
use axum::Router;
use lisca::{http, protocol::AppId};
use std::net::SocketAddr;
use studio_server::{AnalysisJobState, HasAnalysisJobs};
use tracing::info;

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
    let crop_events = state.crop.events.clone();
    let analysis_events = state.analysis.events.clone();
    Router::new()
        .merge(http::fs::router())
        .merge(aligner_server::router())
        .merge(studio_server::router())
        .merge(annotator_server::router())
        .merge(http::ws::router(
            AppId::Studio,
            env!("CARGO_PKG_VERSION"),
            http::ws::WsEvents {
                crop: Some(crop_events),
                analysis: Some(analysis_events),
            },
        ))
        .with_state(state)
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    if let Err(error) = lisca::smb::register_imaging_smb_provider() {
        tracing::warn!(%error, "SMB imaging provider not registered");
    }

    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(DEFAULT_PORT);

    let state = StudioState {
        crop: CropJobState::new(),
        analysis: AnalysisJobState::new(),
    };
    let router = build_router(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    info!(%addr, app = AppId::Studio.as_str(), "listening");

    let listener = tokio::net::TcpListener::bind(addr).await.expect("bind");
    if let Err(e) = axum::serve(listener, http::serve::with_standard_layers(router)).await {
        eprintln!("server error: {e}");
        std::process::exit(1);
    }
}

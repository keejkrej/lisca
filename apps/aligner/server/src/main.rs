use axum::Router;
use lisca::{http, protocol::AppId};

const DEFAULT_PORT: u16 = 8765;

/// Lightweight Aligner state: no crop jobs, no task scheduler.
#[derive(Clone, Default)]
struct AlignerState;

fn build_router(state: AlignerState) -> Router<()> {
    Router::new()
        .merge(http::fs::router())
        .merge(aligner_server::router())
        .with_state(state)
}

#[tokio::main]
async fn main() {
    http::run_server(AppId::Aligner, DEFAULT_PORT, build_router(AlignerState)).await;
}

use axum::Router;
use lisca::{http, protocol::AppId};
use std::net::SocketAddr;
use tracing::info;

const DEFAULT_PORT: u16 = 8766;

fn build_router() -> Router<()> {
    Router::new()
        .merge(http::fs::router())
        .merge(annotator_server::router())
        .merge(http::ws::router(
            AppId::Annotator,
            env!("CARGO_PKG_VERSION"),
            http::ws::WsEvents::default(),
        ))
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    if let Err(error) = lisca::smb::register_mdat_smb_provider() {
        tracing::warn!(%error, "SMB imaging provider not registered");
    }

    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(DEFAULT_PORT);

    let router = build_router();

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    info!(%addr, app = AppId::Annotator.as_str(), "listening");

    let listener = tokio::net::TcpListener::bind(addr).await.expect("bind");
    if let Err(e) = axum::serve(listener, http::serve::with_standard_layers(router)).await {
        eprintln!("server error: {e}");
        std::process::exit(1);
    }
}

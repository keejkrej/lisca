use std::net::SocketAddr;

use axum::Router;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::info;

use crate::protocol::AppId;

pub fn with_standard_layers<S>(router: Router<S>) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    router
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
}

/// Initialize tracing once, using `RUST_LOG`/`EnvFilter` with an `info` fallback.
///
/// Safe to call from any server `main`; subsequent calls are ignored.
pub fn init_tracing() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .try_init();
}

/// Resolve the listen port from the `PORT` env var, falling back to `default_port`.
pub fn resolve_port(default_port: u16) -> u16 {
    std::env::var("PORT")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(default_port)
}

/// Resolve the listen address from the `HOST` env var, falling back to loopback.
pub fn resolve_host(default_host: &str) -> std::net::IpAddr {
    std::env::var("HOST")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or_else(|| default_host.parse().expect("default host is a valid IP"))
}

/// Launch a Lisca HTTP/WebSocket server: init tracing, register the SMB imaging
/// provider, resolve the port, apply the standard middleware layers, and serve
/// until the process exits. `main.rs` supplies only the app id and its router.
pub async fn run_server(app_id: AppId, default_port: u16, router: Router<()>) {
    init_tracing();

    if let Err(error) = crate::smb::register_mdat_smb_provider() {
        tracing::warn!(%error, "SMB imaging provider not registered");
    }

    let port = resolve_port(default_port);
    let addr = SocketAddr::from((resolve_host("127.0.0.1"), port));
    info!(%addr, app = app_id.as_str(), "listening");

    let listener = tokio::net::TcpListener::bind(addr).await.expect("bind");
    if let Err(error) = axum::serve(listener, with_standard_layers(router)).await {
        eprintln!("server error: {error}");
        std::process::exit(1);
    }
}

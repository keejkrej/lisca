use std::io;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::sync::Arc;

use axum::{extract::DefaultBodyLimit, Router};
use tower_http::trace::TraceLayer;
use tracing::info;

use super::log::{self, SharedFile, Tee};
use crate::protocol::AppId;

/// Axum defaults to 2MB; smart ML routes send full frame/base64 payloads.
pub const HTTP_BODY_LIMIT_BYTES: usize = 32 * 1024 * 1024;

/// No CORS layer: web builds call the server on their own origin (Vite dev proxy or Docker
/// nginx) and desktop builds use in-process IPC (ADR-0003).
pub fn with_standard_layers<S>(router: Router<S>) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    router
        .layer(DefaultBodyLimit::max(HTTP_BODY_LIMIT_BYTES))
        .layer(TraceLayer::new_for_http())
}

fn env_filter() -> tracing_subscriber::EnvFilter {
    tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"))
}

fn stderr_and_file(file: Arc<std::sync::Mutex<std::fs::File>>) -> Tee<io::Stderr, SharedFile> {
    Tee {
        stderr: io::stderr(),
        file: SharedFile(file),
    }
}

/// Initialize tracing once, using `RUST_LOG`/`EnvFilter` with an `info` fallback.
///
/// Writes `config_dir()/logs/<app>/<datetime>.log` and mirrors the same plain-text
/// lines to stderr. Safe to call from a server `main` or the desktop shell; a
/// second call is ignored.
pub fn init_tracing(app: AppId) {
    let filter = env_filter();
    match log::open_log_file(app) {
        Ok(file) => {
            let _ = tracing_subscriber::fmt()
                .with_env_filter(filter)
                .with_ansi(false)
                .with_writer(move || stderr_and_file(Arc::clone(&file)))
                .try_init();
        }
        Err(error) => {
            eprintln!(
                "lisca: could not open {} ({error}); logging to stderr",
                log::log_directory(app).display()
            );
            let _ = tracing_subscriber::fmt()
                .with_env_filter(env_filter())
                .try_init();
        }
    }
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
        .or_else(|| default_host.parse().ok())
        .unwrap_or(IpAddr::V4(Ipv4Addr::LOCALHOST))
}

/// Launch a Lisca HTTP server: init tracing, resolve the port, apply
/// the standard middleware layers, and serve until the process exits.
/// `main.rs` supplies only the app id and its router.
pub async fn run_server(app_id: AppId, default_port: u16, router: Router<()>) {
    init_tracing(app_id);

    let port = resolve_port(default_port);
    let addr = SocketAddr::from((resolve_host("127.0.0.1"), port));
    info!(%addr, app = app_id.as_str(), "listening");

    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(listener) => listener,
        Err(error) => {
            eprintln!("failed to bind {addr}: {error}");
            std::process::exit(1);
        }
    };
    if let Err(error) = axum::serve(listener, with_standard_layers(router)).await {
        eprintln!("server error: {error}");
        std::process::exit(1);
    }
}

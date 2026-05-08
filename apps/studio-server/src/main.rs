use lisca::{protocol::AppId, run_ws_server};

const DEFAULT_PORT: u16 = 8767;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(DEFAULT_PORT);

    if let Err(e) = run_ws_server(AppId::Studio, port).await {
        eprintln!("server error: {e}");
        std::process::exit(1);
    }
}

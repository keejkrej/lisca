use std::env;

use lisca::{protocol::AppId, run_ws_server};
use tracing_subscriber::EnvFilter;

const DEFAULT_WS_PORT: u16 = 8765;

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let ws_port = env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(DEFAULT_WS_PORT);

    tauri::Builder::default()
        .setup(move |_app| {
            tauri::async_runtime::spawn(async move {
                if let Err(error) = run_ws_server(AppId::Aligner, ws_port).await {
                    eprintln!("lisca ws server failed: {error}");
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run tauri app");
}

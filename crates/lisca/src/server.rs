use std::net::SocketAddr;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use tower_http::trace::TraceLayer;
use tracing::{info, warn};

use crate::protocol::{AppId, Hello};

#[derive(Clone)]
struct AppState {
    app: AppId,
}

pub async fn run_ws_server(app: AppId, port: u16) -> Result<(), std::io::Error> {
    let state = AppState { app };

    let app_router = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(state)
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    info!(%addr, app = app.as_str(), "listening");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app_router).await?;
    Ok(())
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    let hello = Hello {
        app: state.app,
        version: env!("CARGO_PKG_VERSION").to_string(),
    };
    let Ok(text) = serde_json::to_string(&hello) else {
        warn!("failed to serialize hello");
        return;
    };

    if socket.send(Message::Text(text.into())).await.is_err() {
        return;
    }

    while let Some(msg) = socket.recv().await {
        match msg {
            Ok(Message::Text(t)) => {
                let reply = serde_json::json!({
                    "app": state.app.as_str(),
                    "echo": t.to_string(),
                })
                .to_string();
                if socket.send(Message::Text(reply.into())).await.is_err() {
                    break;
                }
            }
            Ok(Message::Close(_)) => break,
            Ok(_) => {}
            Err(e) => {
                warn!(?e, "websocket error");
                break;
            }
        }
    }
}

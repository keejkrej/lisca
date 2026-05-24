use std::time::Duration;

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    routing::get,
    Router,
};
use tokio::sync::broadcast;
use tracing::warn;

use crate::protocol::{AnalysisProgress, AppId, CropRoiProgress, Hello};

#[derive(Clone, Default)]
pub struct WsEvents {
    pub crop: Option<broadcast::Sender<CropRoiProgress>>,
    pub analysis: Option<broadcast::Sender<AnalysisProgress>>,
}

pub fn router<S>(app: AppId, version: &'static str, events: WsEvents) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    Router::new().route(
        "/ws",
        get(move |ws: WebSocketUpgrade| {
            let events = events.clone();
            async move { ws.on_upgrade(move |socket| handle_socket(socket, app, version, events)) }
        }),
    )
}

async fn handle_socket(
    mut socket: WebSocket,
    app: AppId,
    version: &'static str,
    events: WsEvents,
) {
    let mut crop_events = events.crop.as_ref().map(|sender| sender.subscribe());
    let mut analysis_events = events
        .analysis
        .as_ref()
        .map(|sender| sender.subscribe());
    let mut keepalive = tokio::time::interval(Duration::from_secs(30));
    let hello = Hello {
        app,
        version: version.to_string(),
    };
    let Ok(text) = serde_json::to_string(&hello) else {
        warn!("failed to serialize hello");
        return;
    };

    if socket.send(Message::Text(text.into())).await.is_err() {
        return;
    }

    loop {
        tokio::select! {
            event = async {
                match crop_events.as_mut() {
                    Some(receiver) => receiver.recv().await,
                    None => std::future::pending().await,
                }
            }, if crop_events.is_some() => {
                match event {
                    Ok(progress) => {
                        let event = serde_json::json!({
                            "type": "cropRoiProgress",
                            "progress": progress,
                        })
                        .to_string();
                        if socket.send(Message::Text(event.into())).await.is_err() {
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(skipped)) => {
                        warn!(skipped, "crop progress websocket receiver lagged");
                    }
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
            event = async {
                match analysis_events.as_mut() {
                    Some(receiver) => receiver.recv().await,
                    None => std::future::pending().await,
                }
            }, if analysis_events.is_some() => {
                match event {
                    Ok(progress) => {
                        let event = serde_json::json!({
                            "type": "analysisProgress",
                            "progress": progress,
                        })
                        .to_string();
                        if socket.send(Message::Text(event.into())).await.is_err() {
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(skipped)) => {
                        warn!(skipped, "analysis progress websocket receiver lagged");
                    }
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
            _ = keepalive.tick() => {
                if socket.send(Message::Ping(Vec::new().into())).await.is_err() {
                    break;
                }
            }
        }
    }
}

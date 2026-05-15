use std::{net::SocketAddr, path::PathBuf};

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query,
        State,
    },
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json,
    Router,
};
use serde::Deserialize;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::{info, warn};

use crate::{
    aligner,
    protocol::{
        AlignerSource, AppId, AutoExcludePreviewRequest, ContrastWindow, FrameRequest, Hello,
        HostFsEntry, HostListDirectoryResult, SavedAlignState,
    },
};

#[derive(Clone)]
struct AppState {
    app: AppId,
}

pub async fn run_ws_server(app: AppId, port: u16) -> Result<(), std::io::Error> {
    let state = AppState { app };

    let app_router = Router::new()
        .route("/ws", get(ws_handler))
        .route("/fs/list", get(list_directory_handler))
        .route("/fs/home", get(home_directory_handler))
        .route("/align/scan-source", post(scan_source_handler))
        .route("/align/load-frame", post(load_frame_handler))
        .route("/align/auto-exclude-preview", post(auto_exclude_preview_handler))
        .route("/align/save-bbox", post(save_bbox_handler))
        .route("/align/align-state", get(load_align_state_handler))
        .route("/align/output-paths", get(output_paths_handler))
        .with_state(state)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    info!(%addr, app = app.as_str(), "listening");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app_router).await?;
    Ok(())
}

#[derive(Debug, Deserialize)]
struct ListDirectoryQuery {
    path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScanSourcePayload {
    source: AlignerSource,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LoadFramePayload {
    source: AlignerSource,
    request: FrameRequest,
    contrast: Option<ContrastWindow>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveBboxPayload {
    workspace_path: String,
    pos: u32,
    csv: String,
    align_state: SavedAlignState,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LoadAlignStateQuery {
    workspace_path: String,
    pos: u32,
}

#[derive(Debug, Deserialize)]
struct OutputPathsQuery {
    pos: u32,
}

async fn list_directory_handler(
    Query(query): Query<ListDirectoryQuery>,
) -> Result<Json<HostListDirectoryResult>, FsError> {
    list_directory(query.path).map(Json)
}

async fn home_directory_handler() -> Result<Json<serde_json::Value>, FsError> {
    let home = user_home_directory().ok_or_else(|| FsError::new("home directory not found"))?;
    Ok(Json(serde_json::json!({ "path": home })))
}

async fn scan_source_handler(
    Json(payload): Json<ScanSourcePayload>,
) -> Result<Json<crate::protocol::WorkspaceScan>, FsError> {
    aligner::scan_source(payload.source).map(Json).map_err(FsError::new)
}

async fn load_frame_handler(
    Json(payload): Json<LoadFramePayload>,
) -> Result<Json<crate::protocol::FramePayload>, FsError> {
    aligner::load_frame_payload(payload.source, payload.request, payload.contrast)
        .map(Json)
        .map_err(FsError::new)
}

async fn auto_exclude_preview_handler(
    Json(request): Json<AutoExcludePreviewRequest>,
) -> Result<Json<crate::protocol::AutoExcludePreviewResponse>, FsError> {
    aligner::auto_exclude_preview(request)
        .map(Json)
        .map_err(FsError::new)
}

async fn save_bbox_handler(
    Json(payload): Json<SaveBboxPayload>,
) -> Result<Json<crate::protocol::SaveBboxResponse>, FsError> {
    aligner::save_bbox(
        &payload.workspace_path,
        payload.pos,
        &payload.csv,
        &payload.align_state,
    )
    .map(Json)
    .map_err(FsError::new)
}

async fn load_align_state_handler(
    Query(query): Query<LoadAlignStateQuery>,
) -> Result<Json<Option<SavedAlignState>>, FsError> {
    aligner::load_align_state(&query.workspace_path, query.pos)
        .map(Json)
        .map_err(FsError::new)
}

async fn output_paths_handler(
    Query(query): Query<OutputPathsQuery>,
) -> Json<aligner::OutputPaths> {
    Json(aligner::output_paths(query.pos))
}

#[derive(Debug)]
struct FsError {
    message: String,
}

impl FsError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

impl IntoResponse for FsError {
    fn into_response(self) -> Response {
        (StatusCode::BAD_REQUEST, self.message).into_response()
    }
}

fn user_home_directory() -> Option<String> {
    std::env::var("USERPROFILE")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| std::env::var("HOME").ok())
}

fn list_directory(path: Option<String>) -> Result<HostListDirectoryResult, FsError> {
    if path.as_deref().map(str::is_empty).unwrap_or(true) {
        return Ok(list_roots());
    }

    let path = PathBuf::from(path.expect("checked above"));
    let metadata = std::fs::metadata(&path)
        .map_err(|error| FsError::new(format!("failed to read directory: {error}")))?;
    if !metadata.is_dir() {
        return Err(FsError::new("path is not a directory"));
    }

    let mut entries = Vec::new();
    let read_dir = std::fs::read_dir(&path)
        .map_err(|error| FsError::new(format!("failed to list directory: {error}")))?;

    for entry in read_dir.flatten() {
        let entry_path = entry.path();
        let Ok(entry_type) = entry.file_type() else {
            continue;
        };
        let name = entry.file_name().to_string_lossy().to_string();
        entries.push(HostFsEntry {
            name,
            path: entry_path.to_string_lossy().to_string(),
            is_directory: entry_type.is_dir(),
        });
    }

    entries.sort_by(|left, right| {
        right
            .is_directory
            .cmp(&left.is_directory)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });

    Ok(HostListDirectoryResult {
        parent: path.parent().map(|parent| parent.to_string_lossy().to_string()),
        path: Some(path.to_string_lossy().to_string()),
        entries,
    })
}

#[cfg(windows)]
fn list_roots() -> HostListDirectoryResult {
    let mut entries = Vec::new();
    for letter in b'A'..=b'Z' {
        let path = format!("{}:\\", letter as char);
        if std::path::Path::new(&path).exists() {
            entries.push(HostFsEntry {
                name: path.clone(),
                path,
                is_directory: true,
            });
        }
    }

    HostListDirectoryResult {
        path: None,
        parent: None,
        entries,
    }
}

#[cfg(not(windows))]
fn list_roots() -> HostListDirectoryResult {
    HostListDirectoryResult {
        path: None,
        parent: None,
        entries: vec![HostFsEntry {
            name: "/".to_string(),
            path: "/".to_string(),
            is_directory: true,
        }],
    }
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

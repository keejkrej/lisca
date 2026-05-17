use std::{
    collections::HashMap,
    net::SocketAddr,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering as AtomicOrdering},
        Arc, Mutex,
    },
    time::Duration,
};

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use tokio::sync::broadcast;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::{info, warn};

use crate::{
    aligner, image_source,
    protocol::{
        AlignerSource, AnnotationLabel, AppId, AutoExcludePreviewRequest, ContrastWindow,
        CropRoiProgress, CropRoiRequest, CropRoiStatus, FrameRequest, Hello, HostFsEntry,
        HostListDirectoryResult, ReadTextFileResponse, RoiFrameAnnotationPayload, RoiFrameRequest,
        SaveAssayJsonRequest, SaveAssayJsonResponse, SavedAlignState,
    },
    roi,
};

#[derive(Clone)]
struct AppState {
    app: AppId,
    crop_jobs: Arc<Mutex<HashMap<String, CropJob>>>,
    crop_events: broadcast::Sender<CropRoiProgress>,
}

#[derive(Clone)]
struct CropJob {
    progress: CropRoiProgress,
    cancel: Arc<AtomicBool>,
}

pub async fn run_ws_server(app: AppId, port: u16) -> Result<(), std::io::Error> {
    let state = AppState {
        app,
        crop_jobs: Arc::new(Mutex::new(HashMap::new())),
        crop_events: broadcast::channel(128).0,
    };

    let app_router = Router::new()
        .route("/ws", get(ws_handler))
        .route("/fs/list", get(list_directory_handler))
        .route("/fs/home", get(home_directory_handler))
        .route("/fs/read-text", get(read_text_file_handler))
        .route("/studio/save-assay-json", post(save_assay_json_handler))
        .route("/align/scan-source", post(scan_source_handler))
        .route("/align/load-frame", post(load_frame_handler))
        .route(
            "/align/auto-exclude-preview",
            post(auto_exclude_preview_handler),
        )
        .route("/align/save-bbox", post(save_bbox_handler))
        .route("/align/align-state", get(load_align_state_handler))
        .route("/align/output-paths", get(output_paths_handler))
        .route(
            "/align/saved-bbox-positions",
            get(saved_bbox_positions_handler),
        )
        .route("/align/roi-pos-exists", get(roi_pos_exists_handler))
        .route("/align/crop-roi", post(crop_roi_handler))
        .route("/align/cancel-crop-roi", post(cancel_crop_roi_handler))
        .route("/align/crop-roi-progress", get(crop_roi_progress_handler))
        .route(
            "/annotate/scan-roi-workspace",
            post(scan_roi_workspace_handler),
        )
        .route(
            "/annotate/load-labels",
            post(load_annotation_labels_handler),
        )
        .route(
            "/annotate/save-labels",
            post(save_annotation_labels_handler),
        )
        .route("/annotate/load-roi-frame", post(load_roi_frame_handler))
        .route(
            "/annotate/load-roi-frame-annotation",
            post(load_roi_frame_annotation_handler),
        )
        .route(
            "/annotate/save-roi-frame-annotation",
            post(save_roi_frame_annotation_handler),
        )
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
struct ReadTextFileQuery {
    path: String,
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
#[serde(rename_all = "camelCase")]
struct WorkspacePosQuery {
    workspace_path: String,
    pos: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CropProgressQuery {
    request_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CancelCropPayload {
    request_id: String,
}

#[derive(Debug, Deserialize)]
struct OutputPathsQuery {
    pos: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkspacePathPayload {
    workspace_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LoadRoiFramePayload {
    workspace_path: String,
    request: RoiFrameRequest,
    contrast: Option<ContrastWindow>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveAnnotationLabelsPayload {
    workspace_path: String,
    labels: Vec<AnnotationLabel>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RoiFrameAnnotationPayloadBody {
    workspace_path: String,
    request: RoiFrameRequest,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveRoiFrameAnnotationPayload {
    workspace_path: String,
    request: RoiFrameRequest,
    annotation: RoiFrameAnnotationPayload,
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

async fn read_text_file_handler(
    Query(query): Query<ReadTextFileQuery>,
) -> Result<Json<ReadTextFileResponse>, FsError> {
    let contents = std::fs::read_to_string(&query.path)
        .map_err(|error| FsError::new(format!("failed to read text file: {error}")))?;
    Ok(Json(ReadTextFileResponse { contents }))
}

async fn save_assay_json_handler(
    Json(payload): Json<SaveAssayJsonRequest>,
) -> Result<Json<SaveAssayJsonResponse>, FsError> {
    let save_to = payload.save_to.trim();
    if save_to.is_empty() {
        return Err(FsError::new("saveTo is required"));
    }

    let target = PathBuf::from(save_to).join("assay.json");
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| FsError::new(format!("failed to create assay folder: {error}")))?;
    }
    std::fs::write(&target, payload.contents)
        .map_err(|error| FsError::new(format!("failed to save assay.json: {error}")))?;

    Ok(Json(SaveAssayJsonResponse {
        ok: true,
        path: target.to_string_lossy().to_string(),
    }))
}

async fn scan_source_handler(
    Json(payload): Json<ScanSourcePayload>,
) -> Result<Json<crate::protocol::WorkspaceScan>, FsError> {
    aligner::scan_source(payload.source)
        .map(Json)
        .map_err(FsError::new)
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

async fn output_paths_handler(Query(query): Query<OutputPathsQuery>) -> Json<aligner::OutputPaths> {
    Json(aligner::output_paths(query.pos))
}

async fn saved_bbox_positions_handler(
    Query(query): Query<WorkspacePathPayload>,
) -> Result<Json<Vec<u32>>, FsError> {
    aligner::list_saved_bbox_positions(&query.workspace_path)
        .map(Json)
        .map_err(FsError::new)
}

async fn roi_pos_exists_handler(
    Query(query): Query<WorkspacePosQuery>,
) -> Json<crate::protocol::RoiPosExistsResponse> {
    Json(crate::protocol::RoiPosExistsResponse {
        exists: aligner::roi_pos_exists(&query.workspace_path, query.pos),
    })
}

async fn crop_roi_handler(
    State(state): State<AppState>,
    Json(request): Json<CropRoiRequest>,
) -> Result<Json<crate::protocol::CropRoiResponse>, FsError> {
    if request.request_id.trim().is_empty() {
        return Err(FsError::new("crop request id is required"));
    }

    let progress = CropRoiProgress {
        request_id: request.request_id.clone(),
        status: CropRoiStatus::Queued,
        position: None,
        completed_positions: 0,
        total_positions: request.positions.len() as u32,
        completed_rois: 0,
        total_rois: 0,
        message: Some("Queued crop".to_string()),
        error: None,
    };
    let cancel = Arc::new(AtomicBool::new(false));
    {
        let mut jobs = state
            .crop_jobs
            .lock()
            .map_err(|_| FsError::new("crop job state is poisoned"))?;
        if jobs.contains_key(&request.request_id) {
            return Err(FsError::new("crop request id already exists"));
        }
        jobs.insert(
            request.request_id.clone(),
            CropJob {
                progress: progress.clone(),
                cancel: cancel.clone(),
            },
        );
    }
    let _ = state.crop_events.send(progress.clone());

    let request_id = request.request_id.clone();
    let jobs = state.crop_jobs.clone();
    let crop_events = state.crop_events.clone();
    tokio::task::spawn_blocking(move || {
        let update_jobs = jobs.clone();
        let result = aligner::crop_roi(request, &cancel, |progress| {
            if let Ok(mut jobs) = update_jobs.lock() {
                if let Some(job) = jobs.get_mut(&progress.request_id) {
                    job.progress = progress.clone();
                }
            }
            let _ = crop_events.send(progress);
        });

        if let Err(error) = result {
            if let Ok(mut jobs) = jobs.lock() {
                if let Some(job) = jobs.get_mut(&request_id) {
                    job.progress.status = CropRoiStatus::Error;
                    job.progress.error = Some(error);
                    job.progress.message = Some("Crop failed".to_string());
                    let _ = crop_events.send(job.progress.clone());
                }
            }
        }
    });

    Ok(Json(crate::protocol::CropRoiResponse {
        request_id: progress.request_id,
        status: CropRoiStatus::Queued,
    }))
}

async fn cancel_crop_roi_handler(
    State(state): State<AppState>,
    Json(payload): Json<CancelCropPayload>,
) -> Result<Json<CropRoiProgress>, FsError> {
    let mut jobs = state
        .crop_jobs
        .lock()
        .map_err(|_| FsError::new("crop job state is poisoned"))?;
    let job = jobs
        .get_mut(&payload.request_id)
        .ok_or_else(|| FsError::new("crop job not found"))?;
    job.cancel.store(true, AtomicOrdering::SeqCst);
    if matches!(
        job.progress.status,
        CropRoiStatus::Queued | CropRoiStatus::Running
    ) {
        job.progress.status = CropRoiStatus::Cancelled;
        job.progress.message = Some("Crop cancellation requested".to_string());
    }
    let _ = state.crop_events.send(job.progress.clone());
    Ok(Json(job.progress.clone()))
}

async fn crop_roi_progress_handler(
    State(state): State<AppState>,
    Query(query): Query<CropProgressQuery>,
) -> Result<Json<CropRoiProgress>, FsError> {
    let jobs = state
        .crop_jobs
        .lock()
        .map_err(|_| FsError::new("crop job state is poisoned"))?;
    jobs.get(&query.request_id)
        .map(|job| Json(job.progress.clone()))
        .ok_or_else(|| FsError::new("crop job not found"))
}

async fn scan_roi_workspace_handler(
    Json(payload): Json<WorkspacePathPayload>,
) -> Result<Json<crate::protocol::RoiWorkspaceScan>, FsError> {
    roi::scan_roi_workspace(&payload.workspace_path)
        .map(Json)
        .map_err(FsError::new)
}

async fn load_annotation_labels_handler(
    Json(payload): Json<WorkspacePathPayload>,
) -> Result<Json<Vec<crate::protocol::AnnotationLabel>>, FsError> {
    roi::load_annotation_labels(&payload.workspace_path)
        .map(Json)
        .map_err(FsError::new)
}

async fn save_annotation_labels_handler(
    Json(payload): Json<SaveAnnotationLabelsPayload>,
) -> Result<Json<Vec<crate::protocol::AnnotationLabel>>, FsError> {
    roi::save_annotation_labels(&payload.workspace_path, payload.labels)
        .map(Json)
        .map_err(FsError::new)
}

async fn load_roi_frame_handler(
    Json(payload): Json<LoadRoiFramePayload>,
) -> Result<Json<crate::protocol::FramePayload>, FsError> {
    roi::load_roi_frame(&payload.workspace_path, payload.request)
        .map(|raw| image_source::to_frame_payload(raw, payload.contrast))
        .map(Json)
        .map_err(FsError::new)
}

async fn load_roi_frame_annotation_handler(
    Json(payload): Json<RoiFrameAnnotationPayloadBody>,
) -> Result<Json<crate::protocol::LoadedRoiFrameAnnotation>, FsError> {
    roi::load_roi_frame_annotation(&payload.workspace_path, payload.request)
        .map(Json)
        .map_err(FsError::new)
}

async fn save_roi_frame_annotation_handler(
    Json(payload): Json<SaveRoiFrameAnnotationPayload>,
) -> Result<Json<crate::protocol::RoiFrameAnnotation>, FsError> {
    roi::save_roi_frame_annotation(&payload.workspace_path, payload.request, payload.annotation)
        .map(Json)
        .map_err(FsError::new)
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
        parent: path
            .parent()
            .map(|parent| parent.to_string_lossy().to_string()),
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

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    let mut crop_events = state.crop_events.subscribe();
    let mut keepalive = tokio::time::interval(Duration::from_secs(30));
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

    loop {
        tokio::select! {
            event = crop_events.recv() => {
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
            _ = keepalive.tick() => {
                if socket.send(Message::Ping(Vec::new().into())).await.is_err() {
                    break;
                }
            }
        }
    }
}

use axum::{
    routing::post,
    Json, Router,
};
use lisca::{
    image_source,
    protocol::{
        AnnotationLabel, ContrastWindow, RoiFrameAnnotationPayload,
        RoiFrameRequest,
    },
    roi,
};
use lisca::http::FsError;
use serde::Deserialize;

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

pub fn router<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    Router::new()
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
}

async fn scan_roi_workspace_handler(
    Json(payload): Json<WorkspacePathPayload>,
) -> Result<Json<lisca::protocol::RoiWorkspaceScan>, FsError> {
    roi::scan_roi_workspace(&payload.workspace_path)
        .map(Json)
        .map_err(FsError::new)
}

async fn load_annotation_labels_handler(
    Json(payload): Json<WorkspacePathPayload>,
) -> Result<Json<Vec<lisca::protocol::AnnotationLabel>>, FsError> {
    roi::load_annotation_labels(&payload.workspace_path)
        .map(Json)
        .map_err(FsError::new)
}

async fn save_annotation_labels_handler(
    Json(payload): Json<SaveAnnotationLabelsPayload>,
) -> Result<Json<Vec<lisca::protocol::AnnotationLabel>>, FsError> {
    roi::save_annotation_labels(&payload.workspace_path, payload.labels)
        .map(Json)
        .map_err(FsError::new)
}

async fn load_roi_frame_handler(
    Json(payload): Json<LoadRoiFramePayload>,
) -> Result<Json<lisca::protocol::FramePayload>, FsError> {
    roi::load_roi_frame(&payload.workspace_path, payload.request)
        .map(|raw| image_source::to_frame_payload(raw, payload.contrast))
        .map(Json)
        .map_err(FsError::new)
}

async fn load_roi_frame_annotation_handler(
    Json(payload): Json<RoiFrameAnnotationPayloadBody>,
) -> Result<Json<lisca::protocol::LoadedRoiFrameAnnotation>, FsError> {
    roi::load_roi_frame_annotation(&payload.workspace_path, payload.request)
        .map(Json)
        .map_err(FsError::new)
}

async fn save_roi_frame_annotation_handler(
    Json(payload): Json<SaveRoiFrameAnnotationPayload>,
) -> Result<Json<lisca::protocol::RoiFrameAnnotation>, FsError> {
    roi::save_roi_frame_annotation(&payload.workspace_path, payload.request, payload.annotation)
        .map(Json)
        .map_err(FsError::new)
}
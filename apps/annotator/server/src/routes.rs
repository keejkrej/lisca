use axum::{routing::post, Json, Router};
use lisca::http::FsError;
use lisca::{
    image_source,
    protocol::{
        LoadAnnotationLabelsRequest, LoadRoiFrameAnnotationRequest, LoadRoiFrameRequest,
        SaveAnnotationLabelsRequest, SaveRoiFrameAnnotationRequest, ScanRoiWorkspaceRequest,
    },
    roi,
};

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
        .route("/annotate/smart-segment", post(smart_segment_handler))
}

async fn smart_segment_handler(
    Json(payload): Json<lisca::protocol::SmartSegmentRequest>,
) -> Result<Json<lisca::protocol::SmartSegmentResponse>, FsError> {
    lisca::smart::segment::segment_mask(payload)
        .map(Json)
        .map_err(FsError::new)
}

async fn scan_roi_workspace_handler(
    Json(payload): Json<ScanRoiWorkspaceRequest>,
) -> Result<Json<lisca::protocol::RoiWorkspaceScan>, FsError> {
    roi::scan_roi_workspace(&payload.workspace_path)
        .map(Json)
        .map_err(FsError::new)
}

async fn load_annotation_labels_handler(
    Json(payload): Json<LoadAnnotationLabelsRequest>,
) -> Result<Json<Vec<lisca::protocol::AnnotationLabel>>, FsError> {
    roi::load_annotation_labels(&payload.workspace_path)
        .map(Json)
        .map_err(FsError::new)
}

async fn save_annotation_labels_handler(
    Json(payload): Json<SaveAnnotationLabelsRequest>,
) -> Result<Json<Vec<lisca::protocol::AnnotationLabel>>, FsError> {
    roi::save_annotation_labels(&payload.workspace_path, payload.labels)
        .map(Json)
        .map_err(FsError::new)
}

async fn load_roi_frame_handler(
    Json(payload): Json<LoadRoiFrameRequest>,
) -> Result<Json<lisca::protocol::FramePayload>, FsError> {
    roi::load_roi_frame(&payload.workspace_path, payload.request)
        .map(|raw| image_source::to_frame_payload(raw, payload.contrast))
        .map(Json)
        .map_err(FsError::new)
}

async fn load_roi_frame_annotation_handler(
    Json(payload): Json<LoadRoiFrameAnnotationRequest>,
) -> Result<Json<lisca::protocol::LoadedRoiFrameAnnotation>, FsError> {
    roi::load_roi_frame_annotation(&payload.workspace_path, payload.request)
        .map(Json)
        .map_err(FsError::new)
}

async fn save_roi_frame_annotation_handler(
    Json(payload): Json<SaveRoiFrameAnnotationRequest>,
) -> Result<Json<lisca::protocol::RoiFrameAnnotation>, FsError> {
    roi::save_roi_frame_annotation(&payload.workspace_path, payload.request, payload.annotation)
        .map(Json)
        .map_err(FsError::new)
}

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

async fn run_blocking<T>(
    operation: &'static str,
    task: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, FsError>
where
    T: Send + 'static,
{
    tokio::task::spawn_blocking(task)
        .await
        .map_err(|error| FsError::internal(format!("{operation} worker failed: {error}")))?
        .map_err(FsError::new)
}

async fn smart_segment_handler(
    Json(payload): Json<lisca::protocol::SmartSegmentRequest>,
) -> Result<Json<lisca::protocol::SmartSegmentResponse>, FsError> {
    run_blocking("smart segment", move || {
        lisca::smart::segment::segment_mask(payload)
    })
    .await
    .map(Json)
}

async fn scan_roi_workspace_handler(
    Json(payload): Json<ScanRoiWorkspaceRequest>,
) -> Result<Json<lisca::protocol::RoiWorkspaceScan>, FsError> {
    run_blocking("ROI workspace scan", move || {
        roi::scan_roi_workspace(&payload.workspace_path)
    })
    .await
    .map(Json)
}

async fn load_annotation_labels_handler(
    Json(payload): Json<LoadAnnotationLabelsRequest>,
) -> Result<Json<Vec<lisca::protocol::AnnotationLabel>>, FsError> {
    run_blocking("annotation label load", move || {
        roi::load_annotation_labels(&payload.workspace_path)
    })
    .await
    .map(Json)
}

async fn save_annotation_labels_handler(
    Json(payload): Json<SaveAnnotationLabelsRequest>,
) -> Result<Json<Vec<lisca::protocol::AnnotationLabel>>, FsError> {
    run_blocking("annotation label save", move || {
        roi::save_annotation_labels(&payload.workspace_path, payload.labels)
    })
    .await
    .map(Json)
}

async fn load_roi_frame_handler(
    Json(payload): Json<LoadRoiFrameRequest>,
) -> Result<Json<lisca::protocol::FramePayload>, FsError> {
    run_blocking("ROI frame load", move || {
        roi::load_roi_frame(&payload.workspace_path, payload.request)
            .map(|raw| image_source::to_frame_payload(raw, payload.contrast))
    })
    .await
    .map(Json)
}

async fn load_roi_frame_annotation_handler(
    Json(payload): Json<LoadRoiFrameAnnotationRequest>,
) -> Result<Json<lisca::protocol::LoadedRoiFrameAnnotation>, FsError> {
    run_blocking("ROI frame annotation load", move || {
        roi::load_roi_frame_annotation(&payload.workspace_path, payload.request)
    })
    .await
    .map(Json)
}

async fn save_roi_frame_annotation_handler(
    Json(payload): Json<SaveRoiFrameAnnotationRequest>,
) -> Result<Json<lisca::protocol::RoiFrameAnnotation>, FsError> {
    run_blocking("ROI frame annotation save", move || {
        roi::save_roi_frame_annotation(&payload.workspace_path, payload.request, payload.annotation)
    })
    .await
    .map(Json)
}

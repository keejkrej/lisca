#![cfg_attr(all(target_os = "windows", not(debug_assertions)), windows_subsystem = "windows")]

use std::path::Path;

use rfd::FileDialog;
use tauri::{command, AppHandle, Emitter};
use lisca::viewer::backend::{
    auto_exclude_preview as run_auto_exclude_preview, crop_roi as run_crop_roi,
    load_annotation_labels as run_load_annotation_labels, load_frame_payload,
    load_roi_frame_annotation as run_load_roi_frame_annotation, load_roi_frame_payload,
    save_annotation_labels as run_save_annotation_labels, save_bbox as run_save_bbox,
    save_roi_frame_annotation as run_save_roi_frame_annotation,
    scan_roi_workspace as run_scan_roi_workspace, scan_source as run_scan_source, AnnotationLabel,
    AutoExcludePreviewRequest, AutoExcludePreviewResponse, ContrastWindow, CropOutputFormat,
    CropRoiResponse, FramePayload, FrameRequest, LoadedRoiFrameAnnotation, RoiFrameAnnotation,
    RoiFrameAnnotationPayload, RoiFrameRequest, RoiWorkspaceScan, SaveBboxResponse,
    ViewerSource, WorkspaceScan,
};

#[derive(Clone, serde::Serialize)]
struct CropRoiProgress {
    request_id: String,
    progress: f64,
    message: String,
}

#[command]
fn pick_workspace() -> Option<String> {
    FileDialog::new()
        .pick_folder()
        .map(|path| path.to_string_lossy().to_string())
}

#[command]
fn pick_tif() -> Option<String> {
    FileDialog::new()
        .pick_folder()
        .map(|path| path.to_string_lossy().to_string())
}

#[command]
fn pick_nd2() -> Option<String> {
    FileDialog::new()
        .add_filter("ND2", &["nd2"])
        .pick_file()
        .map(|path| path.to_string_lossy().to_string())
}

#[command]
fn pick_czi() -> Option<String> {
    FileDialog::new()
        .add_filter("CZI", &["czi"])
        .pick_file()
        .map(|path| path.to_string_lossy().to_string())
}

#[command]
fn roi_pos_exists(workspace_path: String, pos: u32) -> bool {
    Path::new(&workspace_path)
        .join("roi")
        .join(format!("Pos{pos}"))
        .is_dir()
}

#[command]
fn scan_source(source: ViewerSource) -> Result<WorkspaceScan, String> {
    run_scan_source(source)
}

#[command]
fn load_frame(
    source: ViewerSource,
    request: FrameRequest,
    contrast: Option<ContrastWindow>,
) -> Result<FramePayload, String> {
    load_frame_payload(source, request, contrast)
}

#[command]
fn scan_roi_workspace(workspace_path: String) -> Result<RoiWorkspaceScan, String> {
    run_scan_roi_workspace(workspace_path)
}

#[command]
fn auto_exclude_preview(
    request: AutoExcludePreviewRequest,
) -> Result<AutoExcludePreviewResponse, String> {
    run_auto_exclude_preview(request)
}

#[command]
fn load_annotation_labels(workspace_path: String) -> Result<Vec<AnnotationLabel>, String> {
    run_load_annotation_labels(workspace_path)
}

#[command]
fn save_annotation_labels(
    workspace_path: String,
    labels: Vec<AnnotationLabel>,
) -> Result<Vec<AnnotationLabel>, String> {
    run_save_annotation_labels(workspace_path, labels)
}

#[command]
fn load_roi_frame(
    workspace_path: String,
    request: RoiFrameRequest,
    contrast: Option<ContrastWindow>,
) -> Result<FramePayload, String> {
    load_roi_frame_payload(workspace_path, request, contrast)
}

#[command]
fn load_roi_frame_annotation(
    workspace_path: String,
    request: RoiFrameRequest,
) -> Result<LoadedRoiFrameAnnotation, String> {
    run_load_roi_frame_annotation(workspace_path, request)
}

#[command]
fn save_roi_frame_annotation(
    workspace_path: String,
    request: RoiFrameRequest,
    annotation: RoiFrameAnnotationPayload,
) -> Result<RoiFrameAnnotation, String> {
    run_save_roi_frame_annotation(workspace_path, request, annotation)
}

#[command]
fn save_bbox(workspace_path: String, pos: u32, csv: String) -> SaveBboxResponse {
    run_save_bbox(workspace_path, pos, csv)
}

#[command]
fn crop_roi(
    app: AppHandle,
    workspace_path: String,
    source: ViewerSource,
    pos: u32,
    format: CropOutputFormat,
    request_id: String,
) -> CropRoiResponse {
    run_crop_roi(workspace_path, source, pos, format, &mut |progress, message| {
        app.emit(
            "view://crop-progress",
            CropRoiProgress {
                request_id: request_id.clone(),
                progress,
                message: message.to_string(),
            },
        )
        .map_err(|err| err.to_string())
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            pick_workspace,
            pick_tif,
            pick_nd2,
            pick_czi,
            roi_pos_exists,
            scan_source,
            load_frame,
            scan_roi_workspace,
            auto_exclude_preview,
            load_annotation_labels,
            save_annotation_labels,
            load_roi_frame,
            load_roi_frame_annotation,
            save_roi_frame_annotation,
            save_bbox,
            crop_roi
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

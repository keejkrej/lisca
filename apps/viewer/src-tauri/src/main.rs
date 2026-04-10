#![cfg_attr(
    all(target_os = "windows", not(debug_assertions)),
    windows_subsystem = "windows"
)]

use std::{
    collections::HashSet,
    env, fs,
    path::Path,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use lisca::viewer::backend::{
    auto_exclude_preview as run_auto_exclude_preview, crop_roi as run_crop_roi,
    list_saved_bbox_positions as run_list_saved_bbox_positions,
    load_align_state as run_load_align_state, load_annotation_labels as run_load_annotation_labels,
    load_frame_payload, load_roi_frame_annotation as run_load_roi_frame_annotation,
    load_roi_frame_payload, save_annotation_labels as run_save_annotation_labels,
    save_bbox as run_save_bbox, save_roi_frame_annotation as run_save_roi_frame_annotation,
    scan_roi_workspace as run_scan_roi_workspace, scan_source as run_scan_source, AnnotationLabel,
    AutoExcludePreviewRequest, AutoExcludePreviewResponse, ContrastWindow, CropOutputFormat,
    CropRoiResponse, CropRoiStatus, FramePayload, FrameRequest, LoadedRoiFrameAnnotation,
    RoiFrameAnnotation, RoiFrameAnnotationPayload, RoiFrameRequest, RoiWorkspaceScan,
    SaveBboxResponse, SavedAlignState, ViewerSource, WorkspaceScan,
};
use rfd::FileDialog;
use tauri::{command, Emitter, State, WebviewWindow};

#[derive(Clone, serde::Serialize)]
struct CropRoiProgress {
    request_id: String,
    progress: f64,
    message: String,
}

#[derive(Default)]
struct CropCancellationRegistry {
    cancelled: Mutex<HashSet<String>>,
}

impl CropCancellationRegistry {
    fn cancel(&self, request_id: &str) {
        if let Ok(mut cancelled) = self.cancelled.lock() {
            cancelled.insert(request_id.to_string());
        }
    }

    fn is_cancelled(&self, request_id: &str) -> bool {
        self.cancelled
            .lock()
            .map(|cancelled| cancelled.contains(request_id))
            .unwrap_or(false)
    }

    fn clear(&self, request_id: &str) {
        if let Ok(mut cancelled) = self.cancelled.lock() {
            cancelled.remove(request_id);
        }
    }
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
fn list_saved_bbox_positions(workspace_path: String) -> Result<Vec<u32>, String> {
    run_list_saved_bbox_positions(workspace_path)
}

#[command]
fn load_align_state(workspace_path: String, pos: u32) -> Result<Option<SavedAlignState>, String> {
    run_load_align_state(workspace_path, pos)
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
fn save_bbox(
    workspace_path: String,
    pos: u32,
    csv: String,
    align_state: SavedAlignState,
) -> SaveBboxResponse {
    run_save_bbox(workspace_path, pos, csv, align_state)
}

#[command]
fn cancel_crop_roi(request_id: String, registry: State<'_, Arc<CropCancellationRegistry>>) {
    registry.cancel(&request_id);
}

#[command]
async fn crop_roi(
    window: WebviewWindow,
    registry: State<'_, Arc<CropCancellationRegistry>>,
    workspace_path: String,
    source: ViewerSource,
    pos: u32,
    format: CropOutputFormat,
    batch: Option<usize>,
    request_id: String,
) -> Result<CropRoiResponse, String> {
    let registry = registry.inner().clone();
    let response = tauri::async_runtime::spawn_blocking(move || {
        let mut last_emit_at = Instant::now()
            .checked_sub(Duration::from_secs(1))
            .unwrap_or_else(Instant::now);
        let mut last_progress = -1.0f64;
        let request_id_for_cancel = request_id.clone();

        let response = run_crop_roi(
            workspace_path,
            source,
            pos,
            format,
            batch,
            &mut |progress, message| {
                let should_emit = progress >= 1.0
                    || progress <= 0.0
                    || (progress - last_progress).abs() >= 0.01
                    || last_emit_at.elapsed() >= Duration::from_millis(80);

                if !should_emit {
                    return Ok(());
                }

                last_emit_at = Instant::now();
                last_progress = progress;

                window
                    .emit(
                        "viewer://crop-progress",
                        CropRoiProgress {
                            request_id: request_id.clone(),
                            progress,
                            message: message.to_string(),
                        },
                    )
                    .map_err(|err| err.to_string())
            },
            &|| registry.is_cancelled(&request_id_for_cancel),
        );

        registry.clear(&request_id_for_cancel);
        response
    })
    .await
    .unwrap_or_else(|error| CropRoiResponse {
        ok: false,
        status: CropRoiStatus::Error,
        cancelled: None,
        error: Some(format!("Failed to join ROI crop task: {error}")),
        output_path: None,
    });

    Ok(response)
}

fn main() {
    apply_linux_webkit_workarounds();

    tauri::Builder::default()
        .manage(Arc::new(CropCancellationRegistry::default()))
        .invoke_handler(tauri::generate_handler![
            pick_workspace,
            pick_tif,
            pick_nd2,
            pick_czi,
            roi_pos_exists,
            scan_source,
            load_frame,
            scan_roi_workspace,
            list_saved_bbox_positions,
            load_align_state,
            auto_exclude_preview,
            load_annotation_labels,
            save_annotation_labels,
            load_roi_frame,
            load_roi_frame_annotation,
            save_roi_frame_annotation,
            save_bbox,
            cancel_crop_roi,
            crop_roi
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn apply_linux_webkit_workarounds() {
    #[cfg(target_os = "linux")]
    {
        if !linux_has_nvidia_gpu() {
            return;
        }

        match env::var("XDG_SESSION_TYPE").as_deref() {
            Ok("wayland") => {
                if env::var_os("__NV_DISABLE_EXPLICIT_SYNC").is_none() {
                    env::set_var("__NV_DISABLE_EXPLICIT_SYNC", "1");
                }
            }
            Ok("x11") => {
                if env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
                    env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
                }
            }
            _ => {}
        }
    }
}

#[cfg(target_os = "linux")]
fn linux_has_nvidia_gpu() -> bool {
    if Path::new("/sys/module/nvidia").exists() {
        return true;
    }

    let Ok(entries) = fs::read_dir("/sys/class/drm") else {
        return false;
    };

    entries.filter_map(Result::ok).any(|entry| {
        let vendor_path = entry.path().join("device/vendor");
        fs::read_to_string(vendor_path)
            .map(|vendor| vendor.trim().eq_ignore_ascii_case("0x10de"))
            .unwrap_or(false)
    })
}

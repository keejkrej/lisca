import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import type {
  AutoExcludePreviewRequest,
  AutoExcludePreviewResponse,
  AnnotationLabel,
  CropOutputFormat,
  CropRoiProgressEvent,
  CropRoiResponse,
  FrameRequest,
  FrameResult,
  LoadedRoiFrameAnnotation,
  LoadFrameOptions,
  RoiFrameAnnotation,
  RoiFrameAnnotationPayload,
  RoiFrameRequest,
  RoiWorkspaceScan,
  SavedAlignState,
  SaveBboxResponse,
  ViewerDataPort,
  ViewerHostPort,
  ViewerSource,
  WorkspaceScan,
} from "lisca/viewer/contracts";

interface FramePayload {
  width: number;
  height: number;
  data_base64: string;
  pixel_type?: FrameResult["pixelType"];
  contrast_domain?: FrameResult["contrastDomain"];
  suggested_contrast?: FrameResult["suggestedContrast"];
  applied_contrast?: FrameResult["appliedContrast"];
}

interface CropRoiProgressPayload {
  request_id: string;
  progress: number;
  message: string;
}

const CROP_PROGRESS_EVENT = "viewer://crop-progress";

function decodeBase64ToBytes(value: string): Uint8Array {
  if (typeof atob !== "function") {
    throw new Error("Base64 decoding is unavailable in this host");
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toFrameResult(payload: FramePayload): FrameResult {
  return {
    width: payload.width,
    height: payload.height,
    pixels: decodeBase64ToBytes(payload.data_base64),
    pixelType: payload.pixel_type ?? "uint8",
    contrastDomain: payload.contrast_domain,
    suggestedContrast: payload.suggested_contrast,
    appliedContrast: payload.applied_contrast,
  };
}

function toCropRoiProgressEvent(payload: CropRoiProgressPayload): CropRoiProgressEvent {
  return {
    requestId: payload.request_id,
    progress: payload.progress,
    message: payload.message,
  };
}

function makeRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface TauriDesktopPorts {
  dataPort: ViewerDataPort;
  hostPort: ViewerHostPort;
}

export function createTauriDesktopPorts(): TauriDesktopPorts {
  const cropProgressListeners = new Set<(event: CropRoiProgressEvent) => void>();
  let cropProgressUnlistenPromise: Promise<() => void> | null = null;

  const ensureCropProgressListener = () => {
    if (!cropProgressUnlistenPromise) {
      cropProgressUnlistenPromise = getCurrentWebviewWindow()
        .listen<CropRoiProgressPayload>(CROP_PROGRESS_EVENT, (event) => {
          const payload = toCropRoiProgressEvent(event.payload);
          for (const listener of cropProgressListeners) {
            listener(payload);
          }
        })
        .catch((error) => {
          cropProgressUnlistenPromise = null;
          console.error("Failed to subscribe to ROI crop progress events", error);
          throw error;
        });
    }

    return cropProgressUnlistenPromise;
  };

  const dataPort: ViewerDataPort = {
    scanSource(source: ViewerSource): Promise<WorkspaceScan> {
      return invoke("scan_source", { source });
    },

    loadFrame(source: ViewerSource, request: FrameRequest, options?: LoadFrameOptions) {
      return invoke<FramePayload>("load_frame", {
        source,
        request,
        contrast: options?.contrast ?? null,
      }).then(toFrameResult);
    },

    scanRoiWorkspace(workspacePath: string): Promise<RoiWorkspaceScan> {
      return invoke("scan_roi_workspace", { workspacePath });
    },

    listSavedBboxPositions(workspacePath: string): Promise<number[]> {
      return invoke("list_saved_bbox_positions", { workspacePath });
    },

    loadAlignState(workspacePath: string, pos: number): Promise<SavedAlignState | null> {
      return invoke("load_align_state", { workspacePath, pos });
    },

    autoExcludePreview(request: AutoExcludePreviewRequest): Promise<AutoExcludePreviewResponse> {
      return invoke("auto_exclude_preview", { request });
    },

    loadAnnotationLabels(workspacePath: string): Promise<AnnotationLabel[]> {
      return invoke("load_annotation_labels", { workspacePath });
    },

    saveAnnotationLabels(workspacePath: string, labels: AnnotationLabel[]): Promise<AnnotationLabel[]> {
      return invoke("save_annotation_labels", { workspacePath, labels });
    },

    loadRoiFrame(workspacePath: string, request: RoiFrameRequest, options?: LoadFrameOptions) {
      return invoke<FramePayload>("load_roi_frame", {
        workspacePath,
        request,
        contrast: options?.contrast ?? null,
      }).then(toFrameResult);
    },

    loadRoiFrameAnnotation(
      workspacePath: string,
      request: RoiFrameRequest,
    ): Promise<LoadedRoiFrameAnnotation> {
      return invoke("load_roi_frame_annotation", { workspacePath, request });
    },

    saveRoiFrameAnnotation(
      workspacePath: string,
      request: RoiFrameRequest,
      annotation: RoiFrameAnnotationPayload,
    ): Promise<RoiFrameAnnotation> {
      return invoke("save_roi_frame_annotation", {
        workspacePath,
        request,
        annotation,
      });
    },

    saveBbox(
      workspacePath: string,
      source: ViewerSource,
      pos: number,
      csv: string,
      alignState: SavedAlignState,
    ): Promise<SaveBboxResponse> {
      return invoke("save_bbox", {
        workspacePath,
        source,
        pos,
        csv,
        alignState,
      });
    },

    async cropRoi(
      workspacePath: string,
      source: ViewerSource,
      pos: number,
      format: CropOutputFormat,
      requestId?: string,
    ): Promise<CropRoiResponse> {
      const nextRequestId = requestId ?? makeRequestId();
      await ensureCropProgressListener().catch(() => undefined);
      return invoke("crop_roi", {
        workspacePath,
        source,
        pos,
        format,
        requestId: nextRequestId,
      });
    },

    cancelCropRoi(requestId: string): Promise<void> {
      return invoke("cancel_crop_roi", { requestId });
    },

    onCropRoiProgress(listener) {
      cropProgressListeners.add(listener);
      void ensureCropProgressListener().catch(() => undefined);

      return () => {
        cropProgressListeners.delete(listener);
      };
    },
  };

  const hostPort: ViewerHostPort = {
    pickWorkspace() {
      return invoke("pick_workspace");
    },

    pickTifDirectory() {
      return invoke("pick_tif");
    },

    pickNd2File() {
      return invoke("pick_nd2");
    },

    pickCziFile() {
      return invoke("pick_czi");
    },

    roiPosExists(workspacePath: string, pos: number) {
      return invoke("roi_pos_exists", {
        workspacePath,
        pos,
      });
    },
  };

  return { dataPort, hostPort };
}

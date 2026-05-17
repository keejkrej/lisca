import {
  WS_PATH,
  type AlignerDataPort,
  type AlignerSource,
  type AutoExcludePreviewRequest,
  type AutoExcludePreviewResponse,
  type ContrastWindow,
  type CropRoiProgress,
  type CropRoiProgressMessage,
  type CropRoiRequest,
  type CropRoiResponse,
  type FramePayload,
  type FrameRequest,
  type FrameResult,
  type HostListDirectoryResult,
  type PixelArray,
  type PixelType,
  type SaveBboxResponse,
  type SavedAlignState,
  type StudioHostPort,
  type StudioSaveAssayJsonResponse,
  type WorkspaceScan,
} from "@lisca/contracts";
import { resolveLiscaWsUrl } from "@lisca/utils";

function createPixelArray(pixelType: PixelType, buffer: ArrayBuffer): PixelArray {
  if (pixelType === "uint8") return new Uint8Array(buffer);
  if (pixelType === "uint8clamped") return new Uint8ClampedArray(buffer);
  if (pixelType === "int8") return new Int8Array(buffer);
  if (pixelType === "uint16") return new Uint16Array(buffer);
  if (pixelType === "int16") return new Int16Array(buffer);
  if (pixelType === "uint32") return new Uint32Array(buffer);
  return new Int32Array(buffer);
}

export function decodeFramePayload(payload: FramePayload): FrameResult {
  try {
    const binary = window.atob(payload.dataBase64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return {
      width: payload.width,
      height: payload.height,
      pixels: createPixelArray(payload.pixelType, bytes.buffer),
      pixelType: payload.pixelType,
      contrastDomain: payload.contrastDomain,
      suggestedContrast: payload.suggestedContrast,
      appliedContrast: payload.appliedContrast,
    };
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`Base64 decode failed: ${detail}`);
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function postJson<T>(
  baseUrl: string,
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  }).then(readJson<T>);
}

function getJson<T>(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number>,
  signal?: AbortSignal,
) {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value));
  }
  return fetch(url, { signal }).then(readJson<T>);
}

function resolveStudioWsUrl(baseUrl: string): string {
  const base = new URL(baseUrl);
  const defaultPort = Number(base.port || (base.protocol === "https:" ? 443 : 80));
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  return resolveLiscaWsUrl({
    searchParams: params,
    viteWsUrl: import.meta.env.VITE_WS_URL,
    viteWsHost: import.meta.env.VITE_WS_HOST ?? base.hostname,
    viteWsPort: import.meta.env.VITE_WS_PORT ?? base.port,
    defaultPort,
    wsPath: WS_PATH,
  });
}

function isCropRoiProgressMessage(value: unknown): value is CropRoiProgressMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as { type?: unknown; progress?: { requestId?: unknown } };
  return message.type === "cropRoiProgress" && typeof message.progress?.requestId === "string";
}

function pollCropRoiProgress(
  baseUrl: string,
  requestId: string,
  onProgress: (progress: CropRoiProgress) => void,
) {
  let closed = false;
  const poll = async () => {
    if (closed) return;
    try {
      const progress = await getJson<CropRoiProgress>(baseUrl, "/align/crop-roi-progress", {
        requestId,
      });
      onProgress(progress);
      if (["completed", "cancelled", "error"].includes(progress.status)) return;
    } catch (cause) {
      onProgress({
        requestId,
        status: "error",
        position: null,
        completedPositions: 0,
        totalPositions: 0,
        completedRois: 0,
        totalRois: 0,
        message: null,
        error: cause instanceof Error ? cause.message : String(cause),
      });
      return;
    }
    window.setTimeout(poll, 350);
  };
  void poll();
  return () => {
    closed = true;
  };
}

export function createStudioHttpClient(baseUrl: string): AlignerDataPort & StudioHostPort {
  const aligner: AlignerDataPort = {
    scanSource(source: AlignerSource) {
      return postJson<WorkspaceScan>(baseUrl, "/align/scan-source", { source });
    },
    async loadFrame(
      source: AlignerSource,
      request: FrameRequest,
      contrast?: ContrastWindow | null,
      signal?: AbortSignal,
    ) {
      const payload = await postJson<FramePayload>(
        baseUrl,
        "/align/load-frame",
        { source, request, contrast: contrast ?? null },
        signal,
      );
      return decodeFramePayload(payload);
    },
    loadAlignState(workspacePath: string, pos: number) {
      return getJson<SavedAlignState | null>(baseUrl, "/align/align-state", {
        workspacePath,
        pos,
      });
    },
    saveBbox(workspacePath: string, pos: number, csv: string, alignState: SavedAlignState) {
      return postJson<SaveBboxResponse>(baseUrl, "/align/save-bbox", {
        workspacePath,
        pos,
        csv,
        alignState,
      });
    },
    autoExcludePreview(request: AutoExcludePreviewRequest) {
      return postJson<AutoExcludePreviewResponse>(baseUrl, "/align/auto-exclude-preview", request);
    },
    listSavedBboxPositions(workspacePath: string) {
      return getJson<number[]>(baseUrl, "/align/saved-bbox-positions", { workspacePath });
    },
    cropRoi(request: CropRoiRequest) {
      return postJson<CropRoiResponse>(baseUrl, "/align/crop-roi", request);
    },
    cancelCropRoi(requestId: string) {
      return postJson<CropRoiProgress>(baseUrl, "/align/cancel-crop-roi", { requestId });
    },
    onCropRoiProgress(requestId: string, onProgress: (progress: CropRoiProgress) => void) {
      let closed = false;
      let terminal = false;
      let ws: WebSocket | null = null;
      let stopFallback: (() => void) | null = null;
      const fallbackTimer = window.setTimeout(() => {
        if (closed) return;
        stopFallback = pollCropRoiProgress(baseUrl, requestId, onProgress);
      }, 1500);

      try {
        ws = new WebSocket(resolveStudioWsUrl(baseUrl));
      } catch {
        window.clearTimeout(fallbackTimer);
        stopFallback = pollCropRoiProgress(baseUrl, requestId, onProgress);
      }

      ws?.addEventListener("open", () => {
        window.clearTimeout(fallbackTimer);
        void getJson<CropRoiProgress>(baseUrl, "/align/crop-roi-progress", { requestId })
          .then((progress) => {
            if (closed) return;
            onProgress(progress);
            terminal = ["completed", "cancelled", "error"].includes(progress.status);
            if (terminal) ws?.close();
          })
          .catch(() => {
            if (closed || stopFallback) return;
            stopFallback = pollCropRoiProgress(baseUrl, requestId, onProgress);
          });
      });

      ws?.addEventListener("message", (event) => {
        if (closed) return;
        try {
          const message = JSON.parse(String(event.data)) as unknown;
          if (!isCropRoiProgressMessage(message) || message.progress.requestId !== requestId) {
            return;
          }
          onProgress(message.progress);
          terminal = ["completed", "cancelled", "error"].includes(message.progress.status);
          if (terminal) ws?.close();
        } catch {
          // Ignore non-JSON websocket messages such as development probes.
        }
      });

      ws?.addEventListener("error", () => {
        if (closed || stopFallback) return;
        window.clearTimeout(fallbackTimer);
        stopFallback = pollCropRoiProgress(baseUrl, requestId, onProgress);
      });

      ws?.addEventListener("close", () => {
        if (closed || terminal || stopFallback) return;
        window.clearTimeout(fallbackTimer);
        stopFallback = pollCropRoiProgress(baseUrl, requestId, onProgress);
      });

      return () => {
        closed = true;
        window.clearTimeout(fallbackTimer);
        stopFallback?.();
        ws?.close();
      };
    },
    async roiPosExists(workspacePath: string, pos: number) {
      const result = await getJson<{ exists: boolean }>(baseUrl, "/align/roi-pos-exists", {
        workspacePath,
        pos,
      });
      return result.exists;
    },
  };

  return {
    ...aligner,
    listDirectory(path: string | null): Promise<HostListDirectoryResult> {
      const params = path ? { path } : undefined;
      return getJson<HostListDirectoryResult>(baseUrl, "/fs/list", params);
    },
    userHomeDirectory() {
      return getJson<{ path: string }>(baseUrl, "/fs/home").then((result) => result.path);
    },
    readTextFile(path: string) {
      return getJson<{ contents: string }>(baseUrl, "/fs/read-text", { path }).then(
        (result) => result.contents,
      );
    },
    saveAssayJson(saveTo: string, contents: string) {
      return postJson<StudioSaveAssayJsonResponse>(baseUrl, "/studio/save-assay-json", {
        saveTo,
        contents,
      });
    },
  };
}

export const studioClient = createStudioHttpClient("http://127.0.0.1:8767");

export function toErrorMessage(cause: unknown, fallback: string): string {
  const message = cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "";
  if (
    cause instanceof TypeError ||
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("fetch failed")
  ) {
    return `${fallback}: server unreachable at 127.0.0.1:8767`;
  }
  return message ? `${fallback}: ${message}` : fallback;
}

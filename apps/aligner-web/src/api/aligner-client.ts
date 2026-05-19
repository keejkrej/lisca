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
  type SaveBboxResponse,
  type SavedAlignState,
  type WorkspaceScan,
} from "@lisca/contracts";
import { decodeFramePayload, resolveLiscaHttpBaseUrl, resolveLiscaWsUrl } from "@lisca/utils";

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

function alignerUrlOptions() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  return {
    searchParams: params,
    viteHttpUrl: import.meta.env.VITE_HTTP_URL,
    viteWsUrl: import.meta.env.VITE_WS_URL,
    viteWsHost: import.meta.env.VITE_WS_HOST,
    viteWsPort: import.meta.env.VITE_WS_PORT,
    defaultPort: 8765,
    wsPath: WS_PATH,
  };
}

export function resolveAlignerHttpBaseUrl(): string {
  return resolveLiscaHttpBaseUrl(alignerUrlOptions());
}

function resolveAlignerWsUrl(): string {
  return resolveLiscaWsUrl(alignerUrlOptions());
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

export function createAlignerHttpClient(
  getBaseUrl: () => string = resolveAlignerHttpBaseUrl,
): AlignerDataPort {
  const baseUrl = getBaseUrl;
  return {
    scanSource(source: AlignerSource) {
      return postJson<WorkspaceScan>(baseUrl(), "/align/scan-source", { source });
    },
    async loadFrame(
      source: AlignerSource,
      request: FrameRequest,
      contrast?: ContrastWindow | null,
      signal?: AbortSignal,
    ) {
      const payload = await postJson<FramePayload>(
        baseUrl(),
        "/align/load-frame",
        {
          source,
          request,
          contrast: contrast ?? null,
        },
        signal,
      );
      return decodeFramePayload(payload);
    },
    loadAlignState(workspacePath: string, pos: number) {
      return getJson<SavedAlignState | null>(baseUrl(), "/align/align-state", {
        workspacePath,
        pos,
      });
    },
    saveBbox(workspacePath: string, pos: number, csv: string, alignState: SavedAlignState) {
      return postJson<SaveBboxResponse>(baseUrl(), "/align/save-bbox", {
        workspacePath,
        pos,
        csv,
        alignState,
      });
    },
    autoExcludePreview(request: AutoExcludePreviewRequest) {
      return postJson<AutoExcludePreviewResponse>(
        baseUrl(),
        "/align/auto-exclude-preview",
        request,
      );
    },
    listSavedBboxPositions(workspacePath: string) {
      return getJson<number[]>(baseUrl(), "/align/saved-bbox-positions", { workspacePath });
    },
    cropRoi(request: CropRoiRequest) {
      return postJson<CropRoiResponse>(baseUrl(), "/align/crop-roi", request);
    },
    cancelCropRoi(requestId: string) {
      return postJson<CropRoiProgress>(baseUrl(), "/align/cancel-crop-roi", { requestId });
    },
    onCropRoiProgress(requestId: string, onProgress: (progress: CropRoiProgress) => void) {
      let closed = false;
      let terminal = false;
      let ws: WebSocket | null = null;
      let stopFallback: (() => void) | null = null;
      const fallbackTimer = window.setTimeout(() => {
        if (closed) return;
        stopFallback = pollCropRoiProgress(baseUrl(), requestId, onProgress);
      }, 1500);

      try {
        ws = new WebSocket(resolveAlignerWsUrl());
      } catch {
        window.clearTimeout(fallbackTimer);
        stopFallback = pollCropRoiProgress(baseUrl(), requestId, onProgress);
      }

      ws?.addEventListener("open", () => {
        window.clearTimeout(fallbackTimer);
        void getJson<CropRoiProgress>(baseUrl(), "/align/crop-roi-progress", { requestId })
          .then((progress) => {
            if (closed) return;
            onProgress(progress);
            terminal = ["completed", "cancelled", "error"].includes(progress.status);
            if (terminal) ws?.close();
          })
          .catch(() => {
            if (closed || stopFallback) return;
            stopFallback = pollCropRoiProgress(baseUrl(), requestId, onProgress);
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
          if (terminal) {
            ws?.close();
          }
        } catch {
          // Ignore non-JSON websocket messages such as development probes.
        }
      });

      ws?.addEventListener("error", () => {
        if (closed || stopFallback) return;
        window.clearTimeout(fallbackTimer);
        stopFallback = pollCropRoiProgress(baseUrl(), requestId, onProgress);
      });

      ws?.addEventListener("close", () => {
        if (closed || terminal || stopFallback) return;
        window.clearTimeout(fallbackTimer);
        stopFallback = pollCropRoiProgress(baseUrl(), requestId, onProgress);
      });

      return () => {
        closed = true;
        window.clearTimeout(fallbackTimer);
        stopFallback?.();
        ws?.close();
      };
    },
    async roiPosExists(workspacePath: string, pos: number) {
      const result = await getJson<{ exists: boolean }>(baseUrl(), "/align/roi-pos-exists", {
        workspacePath,
        pos,
      });
      return result.exists;
    },
  };
}

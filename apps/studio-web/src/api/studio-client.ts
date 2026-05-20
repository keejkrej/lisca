import {
  AnalysisProgressMessageSchema,
  AnalysisProgressSchema,
  AutoExcludePreviewResponseSchema,
  CropRoiProgressMessageSchema,
  CropRoiProgressSchema,
  CropRoiResponseSchema,
  decodeJson,
  FramePayloadSchema,
  HomeDirectoryResponseSchema,
  HostListDirectoryResultSchema,
  NullableAnalysisProgressSchema,
  NullableSavedAlignStateSchema,
  ReadTextFileResponseSchema,
  RoiPosExistsResponseSchema,
  RoiWorkspaceScanSchema,
  SaveAssayJsonResponseSchema,
  SaveBboxResponseSchema,
  SaveResultPdfRequestSchema,
  SaveResultPdfResponseSchema,
  UIntArraySchema,
  WorkspaceScanSchema,
  WS_PATH,
  readJsonResponse,
  type AlignerDataPort,
  type AlignerSource,
  type AnalysisDataPort,
  type AnalysisProgress,
  type AnalysisStartRequest,
  type AutoExcludePreviewRequest,
  type ContrastWindow,
  type CropRoiProgress,
  type CropRoiRequest,
  type FrameRequest,
  type FrameResult,
  type HostListDirectoryResult,
  type RoiFrameRequest,
  type RoiWorkspaceScan,
  type SavedAlignState,
  type StudioHostPort,
  type SaveResultPdfRequest,
} from "@lisca/contracts";
import { Schema } from "effect";
import { decodeFramePayload, resolveLiscaHttpBaseUrl, resolveLiscaWsUrl } from "@lisca/utils";

type StudioHttpClient = AlignerDataPort &
  AnalysisDataPort &
  StudioHostPort & {
    scanRoiWorkspace(workspacePath: string, signal?: AbortSignal): Promise<RoiWorkspaceScan>;
    getAnalysisResults(workspacePath: string): Promise<AnalysisProgress | null>;
    getLatestAnalysisProgress(workspacePath: string): Promise<AnalysisProgress | null>;
    loadRoiFrame(
      workspacePath: string,
      request: RoiFrameRequest,
      contrast?: ContrastWindow | null,
      signal?: AbortSignal,
    ): Promise<FrameResult>;
  };

function postJson<S extends Schema.Schema.Any>(
  baseUrl: string,
  path: string,
  body: unknown,
  schema: S,
  signal?: AbortSignal,
) {
  return fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  }).then((response) => readJsonResponse(response, schema));
}

function getJson<S extends Schema.Schema.Any>(
  baseUrl: string,
  path: string,
  schema: S,
  params?: Record<string, string | number>,
  signal?: AbortSignal,
) {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value));
  }
  return fetch(url, { signal }).then((response) => readJsonResponse(response, schema));
}

function studioUrlOptions() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  return {
    searchParams: params,
    viteHttpUrl: import.meta.env.VITE_HTTP_URL,
    viteWsUrl: import.meta.env.VITE_WS_URL,
    viteWsHost: import.meta.env.VITE_WS_HOST,
    viteWsPort: import.meta.env.VITE_WS_PORT,
    defaultPort: 8767,
    wsPath: WS_PATH,
  };
}

export function resolveStudioHttpBaseUrl(): string {
  return resolveLiscaHttpBaseUrl(studioUrlOptions());
}

function resolveStudioWsUrl(): string {
  return resolveLiscaWsUrl(studioUrlOptions());
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
      const progress = await getJson(baseUrl, "/align/crop-roi-progress", CropRoiProgressSchema, {
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

function pollAnalysisProgress(
  baseUrl: string,
  requestId: string,
  onProgress: (progress: AnalysisProgress) => void,
) {
  let closed = false;
  const poll = async () => {
    if (closed) return;
    try {
      const progress = await getJson(baseUrl, "/studio/analysis-progress", AnalysisProgressSchema, {
        requestId,
      });
      onProgress(progress);
      if (["completed", "error"].includes(progress.status)) return;
    } catch (cause) {
      onProgress({
        requestId,
        status: "error",
        stage: "queued",
        progress: 0,
        message: cause instanceof Error ? cause.message : String(cause),
        resultFiles: [],
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

export function createStudioHttpClient(
  getBaseUrl: () => string = resolveStudioHttpBaseUrl,
): StudioHttpClient {
  const baseUrl = getBaseUrl;
  const aligner: AlignerDataPort & AnalysisDataPort = {
    scanSource(source: AlignerSource) {
      return postJson(baseUrl(), "/align/scan-source", { source }, WorkspaceScanSchema);
    },
    async loadFrame(
      source: AlignerSource,
      request: FrameRequest,
      contrast?: ContrastWindow | null,
      signal?: AbortSignal,
    ) {
      const payload = await postJson(
        baseUrl(),
        "/align/load-frame",
        { source, request, contrast: contrast ?? null },
        FramePayloadSchema,
        signal,
      );
      return decodeFramePayload(payload);
    },
    loadAlignState(workspacePath: string, pos: number) {
      return getJson(baseUrl(), "/align/align-state", NullableSavedAlignStateSchema, {
        workspacePath,
        pos,
      });
    },
    saveBbox(workspacePath: string, pos: number, csv: string, alignState: SavedAlignState) {
      return postJson(
        baseUrl(),
        "/align/save-bbox",
        { workspacePath, pos, csv, alignState },
        SaveBboxResponseSchema,
      );
    },
    autoExcludePreview(request: AutoExcludePreviewRequest) {
      return postJson(
        baseUrl(),
        "/align/auto-exclude-preview",
        request,
        AutoExcludePreviewResponseSchema,
      );
    },
    listSavedBboxPositions(workspacePath: string) {
      return getJson(baseUrl(), "/align/saved-bbox-positions", UIntArraySchema, { workspacePath });
    },
    cropRoi(request: CropRoiRequest) {
      return postJson(baseUrl(), "/align/crop-roi", request, CropRoiResponseSchema);
    },
    cancelCropRoi(requestId: string) {
      return postJson(baseUrl(), "/align/cancel-crop-roi", { requestId }, CropRoiProgressSchema);
    },
    startAnalysis(request: AnalysisStartRequest) {
      return postJson(baseUrl(), "/studio/start-analysis", request, AnalysisProgressSchema);
    },
    getAnalysisProgress(requestId: string) {
      return getJson(baseUrl(), "/studio/analysis-progress", AnalysisProgressSchema, { requestId });
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
        ws = new WebSocket(resolveStudioWsUrl());
      } catch {
        window.clearTimeout(fallbackTimer);
        stopFallback = pollCropRoiProgress(baseUrl(), requestId, onProgress);
      }

      ws?.addEventListener("open", () => {
        window.clearTimeout(fallbackTimer);
        void getJson(baseUrl(), "/align/crop-roi-progress", CropRoiProgressSchema, { requestId })
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
          const message = decodeJson(
            CropRoiProgressMessageSchema,
            JSON.parse(String(event.data)) as unknown,
          );
          if (message.progress.requestId !== requestId) return;
          onProgress(message.progress);
          terminal = ["completed", "cancelled", "error"].includes(message.progress.status);
          if (terminal) ws?.close();
        } catch {
          // Ignore non-protocol websocket messages.
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
    onAnalysisProgress(requestId: string, onProgress: (progress: AnalysisProgress) => void) {
      let closed = false;
      let terminal = false;
      let ws: WebSocket | null = null;
      let stopFallback: (() => void) | null = null;
      const fallbackTimer = window.setTimeout(() => {
        if (closed) return;
        stopFallback = pollAnalysisProgress(baseUrl(), requestId, onProgress);
      }, 1500);

      try {
        ws = new WebSocket(resolveStudioWsUrl());
      } catch {
        window.clearTimeout(fallbackTimer);
        stopFallback = pollAnalysisProgress(baseUrl(), requestId, onProgress);
      }

      ws?.addEventListener("open", () => {
        window.clearTimeout(fallbackTimer);
        void getJson(baseUrl(), "/studio/analysis-progress", AnalysisProgressSchema, { requestId })
          .then((progress) => {
            if (closed) return;
            onProgress(progress);
            terminal = ["completed", "error"].includes(progress.status);
            if (terminal) ws?.close();
          })
          .catch(() => {
            if (closed || stopFallback) return;
            stopFallback = pollAnalysisProgress(baseUrl(), requestId, onProgress);
          });
      });

      ws?.addEventListener("message", (event) => {
        if (closed) return;
        try {
          const message = decodeJson(
            AnalysisProgressMessageSchema,
            JSON.parse(String(event.data)) as unknown,
          );
          if (message.progress.requestId !== requestId) return;
          onProgress(message.progress);
          terminal = ["completed", "error"].includes(message.progress.status);
          if (terminal) ws?.close();
        } catch {
          // Ignore non-protocol websocket messages.
        }
      });

      ws?.addEventListener("error", () => {
        if (closed || stopFallback) return;
        window.clearTimeout(fallbackTimer);
        stopFallback = pollAnalysisProgress(baseUrl(), requestId, onProgress);
      });

      ws?.addEventListener("close", () => {
        if (closed || terminal || stopFallback) return;
        window.clearTimeout(fallbackTimer);
        stopFallback = pollAnalysisProgress(baseUrl(), requestId, onProgress);
      });

      return () => {
        closed = true;
        window.clearTimeout(fallbackTimer);
        stopFallback?.();
        ws?.close();
      };
    },
    async roiPosExists(workspacePath: string, pos: number) {
      const result = await getJson(baseUrl(), "/align/roi-pos-exists", RoiPosExistsResponseSchema, {
        workspacePath,
        pos,
      });
      return result.exists;
    },
  };

  return {
    ...aligner,
    getAnalysisResults(workspacePath: string) {
      return getJson(baseUrl(), "/studio/analysis-results", NullableAnalysisProgressSchema, {
        workspacePath,
      });
    },
    getLatestAnalysisProgress(workspacePath: string) {
      return getJson(baseUrl(), "/studio/latest-analysis", NullableAnalysisProgressSchema, {
        workspacePath,
      });
    },
    scanRoiWorkspace(workspacePath: string, signal?: AbortSignal) {
      return postJson(
        baseUrl(),
        "/annotate/scan-roi-workspace",
        { workspacePath },
        RoiWorkspaceScanSchema,
        signal,
      );
    },
    async loadRoiFrame(
      workspacePath: string,
      request: RoiFrameRequest,
      contrast?: ContrastWindow | null,
      signal?: AbortSignal,
    ) {
      const payload = await postJson(
        baseUrl(),
        "/annotate/load-roi-frame",
        { workspacePath, request, contrast: contrast ?? null },
        FramePayloadSchema,
        signal,
      );
      return decodeFramePayload(payload);
    },
    listDirectory(path: string | null): Promise<HostListDirectoryResult> {
      const params = path ? { path } : undefined;
      return getJson(baseUrl(), "/fs/list", HostListDirectoryResultSchema, params);
    },
    async userHomeDirectory() {
      const result = await getJson(baseUrl(), "/fs/home", HomeDirectoryResponseSchema);
      return result.path;
    },
    async readTextFile(path: string, signal?: AbortSignal) {
      const result = await getJson(
        baseUrl(),
        "/fs/read-text",
        ReadTextFileResponseSchema,
        { path },
        signal,
      );
      return result.contents;
    },
    saveAssayJson(saveTo: string, contents: string) {
      return postJson(
        baseUrl(),
        "/studio/save-assay-json",
        { saveTo, contents },
        SaveAssayJsonResponseSchema,
      );
    },
    saveResultPdf(request: SaveResultPdfRequest) {
      return postJson(baseUrl(), "/studio/save-result-pdf", request, SaveResultPdfResponseSchema);
    },
  };
}

export const studioClient = createStudioHttpClient();

export function toErrorMessage(cause: unknown, fallback: string): string {
  const message = cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "";
  if (
    cause instanceof TypeError ||
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("fetch failed")
  ) {
    return `${fallback}: server unreachable at ${resolveStudioHttpBaseUrl()}`;
  }
  return message ? `${fallback}: ${message}` : fallback;
}

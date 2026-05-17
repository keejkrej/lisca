import type {
  AlignerDataPort,
  AlignerSource,
  AutoExcludePreviewRequest,
  AutoExcludePreviewResponse,
  ContrastWindow,
  CropRoiProgress,
  CropRoiRequest,
  CropRoiResponse,
  FramePayload,
  FrameRequest,
  FrameResult,
  PixelArray,
  PixelType,
  SaveBboxResponse,
  SavedAlignState,
  WorkspaceScan,
} from "@lisca/contracts";

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

export function createAlignerHttpClient(baseUrl: string): AlignerDataPort {
  return {
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
    },
    async roiPosExists(workspacePath: string, pos: number) {
      const result = await getJson<{ exists: boolean }>(baseUrl, "/align/roi-pos-exists", {
        workspacePath,
        pos,
      });
      return result.exists;
    },
  };
}

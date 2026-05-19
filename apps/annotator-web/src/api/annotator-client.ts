import type {
  AnnotationLabel,
  ContrastWindow,
  FramePayload,
  HostListDirectoryResult,
  LoadedRoiFrameAnnotation,
  RoiFrameAnnotation,
  RoiFrameAnnotationPayload,
  RoiFrameRequest,
  RoiWorkspaceScan,
} from "@lisca/contracts";
import { resolveLiscaHttpBaseUrl } from "@lisca/utils";

async function postJson<T>(
  baseUrl: string,
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as T;
}

export function createAnnotatorApi(getBaseUrl: () => string = annotatorBaseUrl) {
  const baseUrl = getBaseUrl;
  return {
    async listDirectory(
      path: string | null,
      signal?: AbortSignal,
    ): Promise<HostListDirectoryResult> {
      const url = new URL(`${baseUrl()}/fs/list`);
      if (path) url.searchParams.set("path", path);
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(await response.text());
      return (await response.json()) as HostListDirectoryResult;
    },
    async userHomeDirectory(signal?: AbortSignal): Promise<string> {
      const response = await fetch(`${baseUrl()}/fs/home`, { signal });
      if (!response.ok) throw new Error(await response.text());
      const result = (await response.json()) as { path: string };
      return result.path;
    },
    scanRoiWorkspace(workspacePath: string, signal?: AbortSignal) {
      return postJson<RoiWorkspaceScan>(
        baseUrl(),
        "/annotate/scan-roi-workspace",
        {
          workspacePath,
        },
        signal,
      );
    },
    loadLabels(workspacePath: string, signal?: AbortSignal) {
      return postJson<AnnotationLabel[]>(
        baseUrl(),
        "/annotate/load-labels",
        { workspacePath },
        signal,
      );
    },
    saveLabels(workspacePath: string, labels: AnnotationLabel[], signal?: AbortSignal) {
      return postJson<AnnotationLabel[]>(
        baseUrl(),
        "/annotate/save-labels",
        {
          workspacePath,
          labels,
        },
        signal,
      );
    },
    loadRoiFrame(
      workspacePath: string,
      request: RoiFrameRequest,
      contrast: ContrastWindow | null,
      signal?: AbortSignal,
    ) {
      return postJson<FramePayload>(
        baseUrl(),
        "/annotate/load-roi-frame",
        {
          workspacePath,
          request,
          contrast,
        },
        signal,
      );
    },
    loadRoiFrameAnnotation(workspacePath: string, request: RoiFrameRequest, signal?: AbortSignal) {
      return postJson<LoadedRoiFrameAnnotation>(
        baseUrl(),
        "/annotate/load-roi-frame-annotation",
        {
          workspacePath,
          request,
        },
        signal,
      );
    },
    saveRoiFrameAnnotation(
      workspacePath: string,
      request: RoiFrameRequest,
      annotation: RoiFrameAnnotationPayload,
      signal?: AbortSignal,
    ) {
      return postJson<RoiFrameAnnotation>(
        baseUrl(),
        "/annotate/save-roi-frame-annotation",
        {
          workspacePath,
          request,
          annotation,
        },
        signal,
      );
    },
  };
}

export type AnnotatorApi = ReturnType<typeof createAnnotatorApi>;

export function annotatorBaseUrl(): string {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  return resolveLiscaHttpBaseUrl({
    searchParams: params,
    viteHttpUrl: import.meta.env.VITE_HTTP_URL,
    viteWsHost: import.meta.env.VITE_WS_HOST,
    viteWsPort: import.meta.env.VITE_HTTP_PORT ?? import.meta.env.VITE_WS_PORT,
    defaultPort: 8766,
  });
}

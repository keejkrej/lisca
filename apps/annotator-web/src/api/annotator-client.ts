import {
  FramePayloadSchema,
  HomeDirectoryResponseSchema,
  HostListDirectoryResultSchema,
  LoadedRoiFrameAnnotationSchema,
  RoiFrameAnnotationSchema,
  RoiWorkspaceScanSchema,
  readJsonResponse,
  type AnnotationLabel,
  type ContrastWindow,
  type HostListDirectoryResult,
  type RoiFrameAnnotationPayload,
  type RoiFrameRequest,
} from "@lisca/contracts";
import { AnnotationLabelArraySchema } from "@lisca/contracts";
import type * as Schema from "effect/Schema";
import { resolveLiscaHttpBaseUrl } from "@lisca/utils";

function postJson<S extends Schema.Schema.Any>(
  baseUrl: string,
  path: string,
  body: unknown,
  schema: S,
  signal?: AbortSignal,
) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  }).then((response) => readJsonResponse(response, schema));
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
      return readJsonResponse(await fetch(url, { signal }), HostListDirectoryResultSchema);
    },
    async userHomeDirectory(signal?: AbortSignal): Promise<string> {
      const result = await readJsonResponse(
        await fetch(`${baseUrl()}/fs/home`, { signal }),
        HomeDirectoryResponseSchema,
      );
      return result.path;
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
    loadLabels(workspacePath: string, signal?: AbortSignal) {
      return postJson(
        baseUrl(),
        "/annotate/load-labels",
        { workspacePath },
        AnnotationLabelArraySchema,
        signal,
      );
    },
    saveLabels(workspacePath: string, labels: AnnotationLabel[], signal?: AbortSignal) {
      return postJson(
        baseUrl(),
        "/annotate/save-labels",
        { workspacePath, labels },
        AnnotationLabelArraySchema,
        signal,
      );
    },
    loadRoiFrame(
      workspacePath: string,
      request: RoiFrameRequest,
      contrast: ContrastWindow | null,
      signal?: AbortSignal,
    ) {
      return postJson(
        baseUrl(),
        "/annotate/load-roi-frame",
        { workspacePath, request, contrast },
        FramePayloadSchema,
        signal,
      );
    },
    loadRoiFrameAnnotation(workspacePath: string, request: RoiFrameRequest, signal?: AbortSignal) {
      return postJson(
        baseUrl(),
        "/annotate/load-roi-frame-annotation",
        { workspacePath, request },
        LoadedRoiFrameAnnotationSchema,
        signal,
      );
    },
    saveRoiFrameAnnotation(
      workspacePath: string,
      request: RoiFrameRequest,
      annotation: RoiFrameAnnotationPayload,
      signal?: AbortSignal,
    ) {
      return postJson(
        baseUrl(),
        "/annotate/save-roi-frame-annotation",
        { workspacePath, request, annotation },
        RoiFrameAnnotationSchema,
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

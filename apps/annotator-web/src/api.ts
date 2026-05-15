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

async function postJson<T>(baseUrl: string, path: string, body: unknown): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as T;
}

export function createAnnotatorApi(baseUrl: string) {
  return {
    async listDirectory(path: string | null): Promise<HostListDirectoryResult> {
      const url = new URL(`${baseUrl}/fs/list`);
      if (path) url.searchParams.set("path", path);
      const response = await fetch(url);
      if (!response.ok) throw new Error(await response.text());
      return (await response.json()) as HostListDirectoryResult;
    },
    async userHomeDirectory(): Promise<string> {
      const response = await fetch(`${baseUrl}/fs/home`);
      if (!response.ok) throw new Error(await response.text());
      const result = (await response.json()) as { path: string };
      return result.path;
    },
    scanRoiWorkspace(workspacePath: string) {
      return postJson<RoiWorkspaceScan>(baseUrl, "/annotate/scan-roi-workspace", {
        workspacePath,
      });
    },
    loadLabels(workspacePath: string) {
      return postJson<AnnotationLabel[]>(baseUrl, "/annotate/load-labels", { workspacePath });
    },
    saveLabels(workspacePath: string, labels: AnnotationLabel[]) {
      return postJson<AnnotationLabel[]>(baseUrl, "/annotate/save-labels", {
        workspacePath,
        labels,
      });
    },
    loadRoiFrame(workspacePath: string, request: RoiFrameRequest, contrast: ContrastWindow | null) {
      return postJson<FramePayload>(baseUrl, "/annotate/load-roi-frame", {
        workspacePath,
        request,
        contrast,
      });
    },
    loadRoiFrameAnnotation(workspacePath: string, request: RoiFrameRequest) {
      return postJson<LoadedRoiFrameAnnotation>(
        baseUrl,
        "/annotate/load-roi-frame-annotation",
        {
          workspacePath,
          request,
        },
      );
    },
    saveRoiFrameAnnotation(
      workspacePath: string,
      request: RoiFrameRequest,
      annotation: RoiFrameAnnotationPayload,
    ) {
      return postJson<RoiFrameAnnotation>(baseUrl, "/annotate/save-roi-frame-annotation", {
        workspacePath,
        request,
        annotation,
      });
    },
  };
}

export function annotatorBaseUrl() {
  const port = import.meta.env.VITE_HTTP_PORT ?? import.meta.env.VITE_WS_PORT ?? "8766";
  return `http://127.0.0.1:${port}`;
}

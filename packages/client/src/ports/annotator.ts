import {
  AnnotationLabelArraySchema,
  FramePayloadSchema,
  LoadedRoiFrameAnnotationSchema,
  RoiFrameAnnotationSchema,
  RoiWorkspaceScanSchema,
  type AnnotationLabel,
  type ContrastWindow,
  type RoiFrameAnnotationPayload,
  type RoiFrameRequest,
} from "@lisca/contracts";

import { createJsonFetch } from "../fetch.ts";
import { createHostPort, type HostPortDeps } from "./studio-host.ts";
import type { AnnotatorDataPort } from "./types.ts";

export type { AnnotatorDataPort } from "./types.ts";

export type AnnotatorPortDeps = HostPortDeps;

export function createAnnotatorPort(deps: AnnotatorPortDeps): AnnotatorDataPort {
  const json = createJsonFetch(deps.baseUrl, deps.fetch);
  const host = createHostPort(deps);

  return {
    listDirectory: host.listDirectory,
    userHomeDirectory: host.userHomeDirectory,
    scanRoiWorkspace(workspacePath: string, signal?: AbortSignal) {
      return json.postJson(
        "/annotate/scan-roi-workspace",
        { workspacePath },
        RoiWorkspaceScanSchema,
        signal,
      );
    },
    loadLabels(workspacePath: string, signal?: AbortSignal) {
      return json.postJson(
        "/annotate/load-labels",
        { workspacePath },
        AnnotationLabelArraySchema,
        signal,
      );
    },
    saveLabels(workspacePath: string, labels: AnnotationLabel[], signal?: AbortSignal) {
      return json.postJson(
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
      return json.postJson(
        "/annotate/load-roi-frame",
        { workspacePath, request, contrast },
        FramePayloadSchema,
        signal,
      );
    },
    loadRoiFrameAnnotation(workspacePath: string, request: RoiFrameRequest, signal?: AbortSignal) {
      return json.postJson(
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
      return json.postJson(
        "/annotate/save-roi-frame-annotation",
        { workspacePath, request, annotation },
        RoiFrameAnnotationSchema,
        signal,
      );
    },
  };
}

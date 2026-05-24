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
import { decodeFramePayload } from "@lisca/utils";
import { Effect } from "effect";

import { createJsonFetch } from "../fetch.ts";
import { createHostPort, type HostPortDeps } from "./host.ts";
import type { AnnotatorDataPort } from "./types.ts";

export type { AnnotatorDataPort } from "./types.ts";

export type AnnotatorPortDeps = HostPortDeps;

export function createAnnotatorPort(deps: AnnotatorPortDeps): AnnotatorDataPort {
  const json = createJsonFetch(deps.baseUrl, deps.fetch);
  const host = createHostPort(deps);

  return {
    ...host,
    scanRoiWorkspace(workspacePath, signal) {
      return json.postJson(
        "/annotate/scan-roi-workspace",
        { workspacePath },
        RoiWorkspaceScanSchema,
        signal,
      );
    },
    loadLabels(workspacePath, signal) {
      return json.postJson(
        "/annotate/load-labels",
        { workspacePath },
        AnnotationLabelArraySchema,
        signal,
      );
    },
    saveLabels(workspacePath, labels, signal) {
      return json.postJson(
        "/annotate/save-labels",
        { workspacePath, labels },
        AnnotationLabelArraySchema,
        signal,
      );
    },
    loadRoiFrame(workspacePath, request, contrast, signal) {
      return json
        .postJson(
          "/annotate/load-roi-frame",
          { workspacePath, request, contrast },
          FramePayloadSchema,
          signal,
        )
        .pipe(Effect.map(decodeFramePayload));
    },
    loadRoiFrameAnnotation(workspacePath, request, signal) {
      return json.postJson(
        "/annotate/load-roi-frame-annotation",
        { workspacePath, request },
        LoadedRoiFrameAnnotationSchema,
        signal,
      );
    },
    saveRoiFrameAnnotation(workspacePath, request, annotation, signal) {
      return json.postJson(
        "/annotate/save-roi-frame-annotation",
        { workspacePath, request, annotation },
        RoiFrameAnnotationSchema,
        signal,
      );
    },
  };
}

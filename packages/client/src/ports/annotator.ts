import { decodeFramePayload } from "@lisca/utils";
import { Effect } from "effect";

import { createApiClient, toClientEffect } from "../api-client.ts";
import { createHostPort, type HostPortDeps } from "./host.ts";
import type { AnnotatorDataPort } from "./types.ts";

export type { AnnotatorDataPort } from "./types.ts";

export type AnnotatorPortDeps = HostPortDeps;

export function createAnnotatorPort(deps: AnnotatorPortDeps): AnnotatorDataPort {
  const client = createApiClient(deps);
  const host = createHostPort(deps);

  return {
    ...host,
    scanRoiWorkspace(workspacePath) {
      return toClientEffect(client.annotate.scanRoiWorkspace({ payload: { workspacePath } }));
    },
    loadLabels(workspacePath) {
      return toClientEffect(client.annotate.loadLabels({ payload: { workspacePath } }));
    },
    saveLabels(workspacePath, labels) {
      return toClientEffect(client.annotate.saveLabels({ payload: { workspacePath, labels } }));
    },
    loadRoiFrame(workspacePath, request, contrast) {
      return toClientEffect(
        client.annotate
          .loadRoiFrame({ payload: { workspacePath, request, contrast: contrast ?? null } })
          .pipe(Effect.map(decodeFramePayload)),
      );
    },
    loadRoiFrameAnnotation(workspacePath, request) {
      return toClientEffect(
        client.annotate.loadRoiFrameAnnotation({ payload: { workspacePath, request } }),
      );
    },
    saveRoiFrameAnnotation(workspacePath, request, annotation) {
      return toClientEffect(
        client.annotate.saveRoiFrameAnnotation({
          payload: { workspacePath, request, annotation },
        }),
      );
    },
  };
}

import { decodeFramePayload } from "@lisca/utils";
import { Effect } from "effect";

import { createApiClient, type LiscaApiClient } from "../infra/api-client";
import { withClientEffect } from "../infra/with-client-effect";
import { createHostPort, type HostPortDeps } from "./host";
import { createTaskPort } from "./tasks";
import type { AnnotatorDataPort } from "./types";

export type { AnnotatorDataPort } from "./types";

export type AnnotatorPortDeps = HostPortDeps;

export function createAnnotatorPort(
  deps: AnnotatorPortDeps,
  client: LiscaApiClient = createApiClient(deps),
): AnnotatorDataPort {
  const host = createHostPort(deps, client);
  const tasks = createTaskPort(deps, client);

  return {
    ...host,
    ...tasks,
    scanRoiWorkspace(workspacePath, signal) {
      return withClientEffect(client, signal, (c) =>
        c.annotate.scanRoiWorkspace({ payload: { workspacePath } }),
      );
    },
    loadLabels(workspacePath, signal) {
      return withClientEffect(client, signal, (c) =>
        c.annotate.loadLabels({ payload: { workspacePath } }),
      );
    },
    saveLabels(workspacePath, labels, signal) {
      return withClientEffect(client, signal, (c) =>
        c.annotate.saveLabels({ payload: { workspacePath, labels } }),
      );
    },
    loadRoiFrame(workspacePath, request, contrast, signal) {
      return withClientEffect(client, signal, (c) =>
        c.annotate
          .loadRoiFrame({ payload: { workspacePath, request, contrast: contrast ?? null } })
          .pipe(Effect.map(decodeFramePayload)),
      );
    },
    loadRoiFrameAnnotation(workspacePath, request, signal) {
      return withClientEffect(client, signal, (c) =>
        c.annotate.loadRoiFrameAnnotation({ payload: { workspacePath, request } }),
      );
    },
    saveRoiFrameAnnotation(workspacePath, request, annotation, signal) {
      return withClientEffect(client, signal, (c) =>
        c.annotate.saveRoiFrameAnnotation({
          payload: { workspacePath, request, annotation },
        }),
      );
    },
    smartSegment(request, signal) {
      return withClientEffect(client, signal, (c) => c.annotate.smartSegment({ payload: request }));
    },
  };
}

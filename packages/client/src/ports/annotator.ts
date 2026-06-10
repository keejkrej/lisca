import { decodeFramePayload } from "@lisca/utils";
import { Effect } from "effect";

import { createApiClient, toClientEffect, type LiscaApiClient } from "../infra/api-client";
import { withOptionalAbortSignal } from "../infra/with-abort-signal";
import { createHostPort, type HostPortDeps } from "./host";
import type { AnnotatorDataPort } from "./types";

export type { AnnotatorDataPort } from "./types";

export type AnnotatorPortDeps = HostPortDeps;

function withClientEffect<A, E>(
  client: LiscaApiClient,
  signal: AbortSignal | undefined,
  run: (client: LiscaApiClient) => Effect.Effect<A, E>,
) {
  return withOptionalAbortSignal(toClientEffect(run(client)), signal);
}

export function createAnnotatorPort(
  deps: AnnotatorPortDeps,
  client: LiscaApiClient = createApiClient(deps),
): AnnotatorDataPort {
  const host = createHostPort(deps, client);

  return {
    ...host,
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
  };
}

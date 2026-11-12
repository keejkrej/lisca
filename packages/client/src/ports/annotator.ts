import { decodeFramePayload } from "@lisca/utils";
import { Effect } from "effect";

import { createApiClient, toClientEffect, type LiscaApiClient } from "../infra/api-client";
import { createHostPort, type HostPortDeps } from "./host";
import { createTaskPort } from "./tasks";
import type { AnnotatorDataPort } from "./types";

export type { AnnotatorDataPort } from "./types";

export type AnnotatorPortDeps = HostPortDeps;

export function createAnnotatorPort(
  deps: AnnotatorPortDeps = {},
  client: LiscaApiClient = createApiClient(deps),
): AnnotatorDataPort {
  const host = createHostPort(deps, client);
  const tasks = createTaskPort(deps, client);

  return {
    ...host,
    ...tasks,
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
    smartSegment(request) {
      return toClientEffect(client.annotate.smartSegment({ payload: request }));
    },
    labelFreeHealth() {
      return toClientEffect(client.studio.labelFreeHealth());
    },
    saveLabelFreeKey(apiKey, provider) {
      return toClientEffect(client.studio.saveLabelFreeKey({ payload: { apiKey, provider } }));
    },
    listLabelFreeReferences(workspacePath) {
      return toClientEffect(client.studio.listLabelFreeReferences({ query: { workspacePath } }));
    },
    buildLabelFreeReferences(workspacePath, name) {
      return toClientEffect(
        client.studio.buildLabelFreeReferences({ payload: { workspacePath, name } }),
      );
    },
    classifyLabelFree(workspacePath, name, limit = 4096) {
      return toClientEffect(
        client.studio.classifyLabelFree({ payload: { workspacePath, name, limit } }),
      );
    },
  };
}

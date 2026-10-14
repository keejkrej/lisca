import { createApiClient, toClientEffect } from "../infra/api-client";
import { createAlignerPort, type AlignerPortDeps } from "./aligner";
import { createAnalysisPort } from "./analysis";
import { createAnnotatorPort } from "./annotator";
import type { StudioDataPort } from "./types";

export type { StudioDataPort, StudioHostPort } from "./types";
export type { AnalysisProgress } from "@lisca/contracts";

export type StudioPortDeps = AlignerPortDeps;

export function createStudioPort(deps: StudioPortDeps = {}): StudioDataPort {
  const client = createApiClient(deps);
  const aligner = createAlignerPort(deps, client);
  const annotator = createAnnotatorPort(deps, client);
  const analysis = createAnalysisPort(deps, client);

  return {
    ...aligner,
    ...annotator,
    ...analysis,
    saveAssayJson(saveTo, contents) {
      return toClientEffect(client.studio.saveAssayJson({ payload: { saveTo, contents } }));
    },
    getAnalysisResults(workspacePath) {
      return toClientEffect(client.studio.getAnalysisResults({ query: { workspacePath } }));
    },
    getLatestAnalysisProgress(workspacePath) {
      return toClientEffect(client.studio.getLatestAnalysisProgress({ query: { workspacePath } }));
    },
    labelFreeHealth() {
      return toClientEffect(client.studio.labelFreeHealth());
    },
    saveLabelFreeKey(apiKey) {
      return toClientEffect(client.studio.saveLabelFreeKey({ payload: { apiKey } }));
    },
    listLabelFreeReferences(workspacePath) {
      return toClientEffect(client.studio.listLabelFreeReferences({ query: { workspacePath } }));
    },
    buildLabelFreeReferences(workspacePath, name) {
      return toClientEffect(
        client.studio.buildLabelFreeReferences({ payload: { workspacePath, name } }),
      );
    },
    classifyLabelFree(workspacePath, name, limit = 32) {
      return toClientEffect(
        client.studio.classifyLabelFree({ payload: { workspacePath, name, limit } }),
      );
    },
  };
}

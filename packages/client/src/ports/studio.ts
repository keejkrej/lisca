import { Effect } from "effect";

import { createApiClient, toClientEffect } from "../infra/api-client";
import { createAlignerPort, type AlignerPortDeps } from "./aligner";
import { createAnalysisPort } from "./analysis";
import { createAnnotatorPort } from "./annotator";
import type { StudioDataPort } from "./types";

export type { StudioDataPort, StudioHostPort } from "./types";
export type { AnalysisProgress } from "@lisca/contracts";

export type StudioPortDeps = AlignerPortDeps;

export function createStudioPort(deps: StudioPortDeps): StudioDataPort {
  const client = createApiClient(deps);
  const aligner = createAlignerPort(deps, client);
  const annotator = createAnnotatorPort(deps, client);
  const analysis = createAnalysisPort(deps, client);

  return {
    ...aligner,
    ...annotator,
    ...analysis,
    readTextFile(path) {
      return toClientEffect(
        client.fs.readTextFile({ query: { path } }).pipe(Effect.map((r) => r.contents)),
      );
    },
    saveAssayJson(saveTo, contents) {
      return toClientEffect(client.studio.saveAssayJson({ payload: { saveTo, contents } }));
    },
    saveResultPdf(request) {
      return toClientEffect(client.studio.saveResultPdf({ payload: request }));
    },
    getAnalysisResults(workspacePath) {
      return toClientEffect(client.studio.getAnalysisResults({ query: { workspacePath } }));
    },
    getLatestAnalysisProgress(workspacePath) {
      return toClientEffect(client.studio.getLatestAnalysisProgress({ query: { workspacePath } }));
    },
  };
}

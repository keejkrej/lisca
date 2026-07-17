import { Effect } from "effect";

import { createApiClient } from "../infra/api-client";
import { withClientEffect } from "../infra/with-client-effect";
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
    readTextFile(path, signal) {
      return withClientEffect(client, signal, (c) =>
        c.fs.readTextFile({ urlParams: { path } }).pipe(Effect.map((r) => r.contents)),
      );
    },
    saveAssayJson(saveTo, contents) {
      return withClientEffect(client, undefined, (c) =>
        c.studio.saveAssayJson({ payload: { saveTo, contents } }),
      );
    },
    saveResultPdf(request) {
      return withClientEffect(client, undefined, (c) =>
        c.studio.saveResultPdf({ payload: request }),
      );
    },
    getAnalysisResults(workspacePath) {
      return withClientEffect(client, undefined, (c) =>
        c.studio.getAnalysisResults({ urlParams: { workspacePath } }),
      );
    },
    getLatestAnalysisProgress(workspacePath) {
      return withClientEffect(client, undefined, (c) =>
        c.studio.getLatestAnalysisProgress({ urlParams: { workspacePath } }),
      );
    },
  };
}

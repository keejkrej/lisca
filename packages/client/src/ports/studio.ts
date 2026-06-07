import { decodeFramePayload } from "@lisca/utils";
import { Effect } from "effect";

import { createApiClient, toClientEffect } from "../api-client.ts";
import { createAlignerPort, type AlignerPortDeps } from "./aligner.ts";
import { createAnalysisPort } from "./analysis.ts";
import type { StudioDataPort } from "./types.ts";

export type { StudioDataPort, StudioHostPort } from "./types.ts";
export type { AnalysisProgress } from "@lisca/contracts";

export type StudioPortDeps = AlignerPortDeps;

export function createStudioPort(deps: StudioPortDeps): StudioDataPort {
  const client = createApiClient(deps);
  const aligner = createAlignerPort(deps);
  const analysis = createAnalysisPort(deps);

  return {
    ...aligner,
    ...analysis,
    readTextFile(path) {
      return toClientEffect(
        client.fs.readTextFile({ urlParams: { path } }).pipe(Effect.map((r) => r.contents)),
      );
    },
    saveAssayJson(saveTo, contents) {
      return toClientEffect(client.studio.saveAssayJson({ payload: { saveTo, contents } }));
    },
    saveResultPdf(request) {
      return toClientEffect(client.studio.saveResultPdf({ payload: request }));
    },
    getAnalysisResults(workspacePath) {
      return toClientEffect(client.studio.getAnalysisResults({ urlParams: { workspacePath } }));
    },
    getLatestAnalysisProgress(workspacePath) {
      return toClientEffect(
        client.studio.getLatestAnalysisProgress({ urlParams: { workspacePath } }),
      );
    },
    scanRoiWorkspace(workspacePath) {
      return toClientEffect(client.annotate.scanRoiWorkspace({ payload: { workspacePath } }));
    },
    loadRoiFrame(workspacePath, request, contrast) {
      return toClientEffect(
        client.annotate
          .loadRoiFrame({ payload: { workspacePath, request, contrast: contrast ?? null } })
          .pipe(Effect.map(decodeFramePayload)),
      );
    },
  };
}

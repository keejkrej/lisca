import { decodeFramePayload } from "@lisca/utils";
import { Effect } from "effect";

import { createApiClient, toClientEffect, type LiscaApiClient } from "../api-client.ts";
import { createAlignerPort, type AlignerPortDeps } from "./aligner.ts";
import { createAnalysisPort } from "./analysis.ts";
import { withOptionalAbortSignal } from "../with-abort-signal.ts";
import type { StudioDataPort } from "./types.ts";

export type { StudioDataPort, StudioHostPort } from "./types.ts";
export type { AnalysisProgress } from "@lisca/contracts";

export type StudioPortDeps = AlignerPortDeps;

function withClientEffect<A, E>(
  client: LiscaApiClient,
  signal: AbortSignal | undefined,
  run: (client: LiscaApiClient) => Effect.Effect<A, E>,
) {
  return withOptionalAbortSignal(toClientEffect(run(client)), signal);
}

export function createStudioPort(deps: StudioPortDeps): StudioDataPort {
  const client = createApiClient(deps);
  const aligner = createAlignerPort(deps, client);
  const analysis = createAnalysisPort(deps, client);

  return {
    ...aligner,
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
    scanRoiWorkspace(workspacePath, signal) {
      return withClientEffect(client, signal, (c) =>
        c.annotate.scanRoiWorkspace({ payload: { workspacePath } }),
      );
    },
    loadRoiFrame(workspacePath, request, contrast, signal) {
      return withClientEffect(client, signal, (c) =>
        c.annotate
          .loadRoiFrame({ payload: { workspacePath, request, contrast: contrast ?? null } })
          .pipe(Effect.map(decodeFramePayload)),
      );
    },
  };
}

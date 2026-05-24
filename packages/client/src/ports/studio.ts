import {
  FramePayloadSchema,
  NullableAnalysisProgressSchema,
  ReadTextFileResponseSchema,
  RoiWorkspaceScanSchema,
  SaveAssayJsonResponseSchema,
  SaveResultPdfResponseSchema,
  type ContrastWindow,
  type RoiFrameRequest,
  type SaveResultPdfRequest,
} from "@lisca/contracts";
import { decodeFramePayload } from "@lisca/utils";
import { Effect } from "effect";

import { createJsonFetch } from "../fetch.ts";
import { createAlignerPort, type AlignerPortDeps } from "./aligner.ts";
import { createAnalysisPort } from "./analysis.ts";
import type { StudioDataPort } from "./types.ts";

export type { StudioDataPort, StudioHostPort } from "./types.ts";
export type { AnalysisProgress } from "@lisca/contracts";

export type StudioPortDeps = AlignerPortDeps;

export function createStudioPort(deps: StudioPortDeps): StudioDataPort {
  const json = createJsonFetch(deps.baseUrl, deps.fetch);
  const aligner = createAlignerPort(deps);
  const analysis = createAnalysisPort(deps);

  return {
    ...aligner,
    ...analysis,
    readTextFile(path, signal) {
      return json
        .getJson("/fs/read-text", ReadTextFileResponseSchema, { path }, signal)
        .pipe(Effect.map((result) => result.contents));
    },
    saveAssayJson(saveTo, contents) {
      return json.postJson(
        "/studio/save-assay-json",
        { saveTo, contents },
        SaveAssayJsonResponseSchema,
      );
    },
    saveResultPdf(request: SaveResultPdfRequest) {
      return json.postJson("/studio/save-result-pdf", request, SaveResultPdfResponseSchema);
    },
    getAnalysisResults(workspacePath) {
      return json.getJson("/studio/analysis-results", NullableAnalysisProgressSchema, {
        workspacePath,
      });
    },
    getLatestAnalysisProgress(workspacePath) {
      return json.getJson("/studio/latest-analysis", NullableAnalysisProgressSchema, {
        workspacePath,
      });
    },
    scanRoiWorkspace(workspacePath, signal) {
      return json.postJson(
        "/annotate/scan-roi-workspace",
        { workspacePath },
        RoiWorkspaceScanSchema,
        signal,
      );
    },
    loadRoiFrame(workspacePath, request, contrast, signal) {
      return json
        .postJson(
          "/annotate/load-roi-frame",
          { workspacePath, request, contrast: contrast ?? null },
          FramePayloadSchema,
          signal,
        )
        .pipe(Effect.map(decodeFramePayload));
    },
  };
}

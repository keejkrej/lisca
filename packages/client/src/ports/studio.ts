import {
  FramePayloadSchema,
  NullableAnalysisProgressSchema,
  RoiWorkspaceScanSchema,
  type AnalysisProgress,
  type ContrastWindow,
  type FrameResult,
  type RoiFrameRequest,
  type RoiWorkspaceScan,
  type StudioDataPort,
} from "@lisca/contracts";
import { decodeFramePayload } from "@lisca/utils";

import { createJsonFetch } from "../fetch.js";
import { createAlignerPort, type AlignerPortDeps } from "./aligner.js";
import { createAnalysisPort } from "./analysis.js";
import { createStudioHostPort } from "./studio-host.js";

export type StudioPortDeps = AlignerPortDeps;

export function createStudioPort(deps: StudioPortDeps): StudioDataPort {
  const json = createJsonFetch(deps.baseUrl, deps.fetch);
  const aligner = createAlignerPort(deps);
  const analysis = createAnalysisPort(deps);
  const host = createStudioHostPort(deps);

  return {
    ...aligner,
    ...analysis,
    ...host,
    getAnalysisResults(workspacePath: string) {
      return json.getJson("/studio/analysis-results", NullableAnalysisProgressSchema, {
        workspacePath,
      });
    },
    getLatestAnalysisProgress(workspacePath: string) {
      return json.getJson("/studio/latest-analysis", NullableAnalysisProgressSchema, {
        workspacePath,
      });
    },
    scanRoiWorkspace(workspacePath: string, signal?: AbortSignal): Promise<RoiWorkspaceScan> {
      return json.postJson(
        "/annotate/scan-roi-workspace",
        { workspacePath },
        RoiWorkspaceScanSchema,
        signal,
      );
    },
    async loadRoiFrame(
      workspacePath: string,
      request: RoiFrameRequest,
      contrast?: ContrastWindow | null,
      signal?: AbortSignal,
    ): Promise<FrameResult> {
      const payload = await json.postJson(
        "/annotate/load-roi-frame",
        { workspacePath, request, contrast: contrast ?? null },
        FramePayloadSchema,
        signal,
      );
      return decodeFramePayload(payload);
    },
  };
}

export type { AnalysisProgress };

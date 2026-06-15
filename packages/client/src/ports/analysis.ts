import { type AnalysisProgress, type AnalysisStartRequest } from "@lisca/contracts";
import { createApiClient, toClientEffect, type LiscaApiClient } from "../infra/api-client";
import { pollProgressLoop } from "../session/progress-poll";
import type { AnalysisDataPort } from "./types";

export type { AnalysisDataPort } from "./types";

const ANALYSIS_TERMINAL_STATUSES = new Set(["completed", "error"]);

export type AnalysisPortDeps = {
  baseUrl: () => string;
  fetch?: typeof fetch;
};

export function createAnalysisPort(
  deps: AnalysisPortDeps,
  client: LiscaApiClient = createApiClient(deps),
): AnalysisDataPort {
  return {
    startAnalysis(request: AnalysisStartRequest) {
      return toClientEffect(client.studio.startAnalysis({ payload: request }));
    },
    getAnalysisProgress(requestId: string) {
      return toClientEffect(client.studio.getAnalysisProgress({ urlParams: { requestId } }));
    },
    onAnalysisProgress(requestId: string, onProgress: (progress: AnalysisProgress) => void) {
      return createAnalysisProgressSubscription(client, requestId, onProgress);
    },
  };
}

export function createAnalysisProgressSubscription(
  client: LiscaApiClient,
  requestId: string,
  onProgress: (progress: AnalysisProgress) => void,
) {
  return pollProgressLoop({
    onProgress,
    pollProgress: () =>
      toClientEffect(client.studio.getAnalysisProgress({ urlParams: { requestId } })),
    isTerminal: (progress) => ANALYSIS_TERMINAL_STATUSES.has(progress.status),
    createErrorProgress: (cause) => ({
      requestId,
      status: "error" as const,
      stage: "queued" as const,
      progress: 0,
      message: cause instanceof Error ? cause.message : String(cause),
      resultFiles: [],
      error: cause instanceof Error ? cause.message : String(cause),
    }),
  });
}

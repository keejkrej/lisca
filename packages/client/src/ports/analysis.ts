import { AnalysisProgressMessageSchema, schemaDecoderEither, type AnalysisProgress, type AnalysisStartRequest } from "@lisca/contracts";
import { createApiClient, toClientEffect, type LiscaApiClient } from "../infra/api-client";
import { subscribeProgress } from "../session/progress-subscribe";
import type { AnalysisDataPort } from "./types";

export type { AnalysisDataPort } from "./types";

const decodeAnalysisProgressMessage = schemaDecoderEither(AnalysisProgressMessageSchema);

const ANALYSIS_TERMINAL_STATUSES = new Set(["completed", "error"]);

export type AnalysisPortDeps = {
  baseUrl: () => string;
  wsUrl: () => string;
  fetch?: typeof fetch;
  isDev?: boolean;
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
      return createAnalysisProgressSubscription(client, deps, requestId, onProgress);
    },
  };
}

export function createAnalysisProgressSubscription(
  client: LiscaApiClient,
  deps: Pick<AnalysisPortDeps, "wsUrl" | "isDev">,
  requestId: string,
  onProgress: (progress: AnalysisProgress) => void,
) {
  return subscribeProgress({
    wsUrl: deps.wsUrl(),
    requestId,
    onProgress,
    pollProgress: () =>
      toClientEffect(client.studio.getAnalysisProgress({ urlParams: { requestId } })),
    decodeMessage: decodeAnalysisProgressMessage,
    extractProgress: (message) => message.progress,
    matchRequestId: (message, id) => message.progress.requestId === id,
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
    debugLabel: "studio-ws-analysis",
    isDev: deps.isDev,
  });
}

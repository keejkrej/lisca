import {
  AnalysisProgressMessageSchema,
  AnalysisProgressSchema,
  schemaDecoderEither,
  type AnalysisProgress,
  type AnalysisStartRequest,
} from "@lisca/contracts";

import { createJsonFetch, type JsonFetch } from "../fetch.ts";
import { subscribeProgress } from "../progress-subscribe.ts";
import type { AnalysisDataPort } from "./types.ts";

export type { AnalysisDataPort } from "./types.ts";

const decodeAnalysisProgressMessage = schemaDecoderEither(AnalysisProgressMessageSchema);

const ANALYSIS_TERMINAL_STATUSES = new Set(["completed", "error"]);

export type AnalysisPortDeps = {
  baseUrl: () => string;
  wsUrl: () => string;
  fetch?: typeof fetch;
  isDev?: boolean;
};

export function createAnalysisPort(deps: AnalysisPortDeps): AnalysisDataPort {
  const json = createJsonFetch(deps.baseUrl, deps.fetch);

  return {
    startAnalysis(request: AnalysisStartRequest) {
      return json.postJson("/studio/start-analysis", request, AnalysisProgressSchema);
    },
    getAnalysisProgress(requestId: string) {
      return json.getJson("/studio/analysis-progress", AnalysisProgressSchema, { requestId });
    },
    onAnalysisProgress(requestId: string, onProgress: (progress: AnalysisProgress) => void) {
      return createAnalysisProgressSubscription(json, deps, requestId, onProgress);
    },
  };
}

export function createAnalysisProgressSubscription(
  json: JsonFetch,
  deps: Pick<AnalysisPortDeps, "wsUrl" | "isDev">,
  requestId: string,
  onProgress: (progress: AnalysisProgress) => void,
) {
  return subscribeProgress({
    wsUrl: deps.wsUrl(),
    requestId,
    onProgress,
    pollProgress: () =>
      json.getJson("/studio/analysis-progress", AnalysisProgressSchema, { requestId }),
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

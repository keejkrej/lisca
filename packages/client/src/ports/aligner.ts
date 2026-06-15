import { CropRoiProgressMessageSchema, schemaDecoderEither, type CropRoiProgress } from "@lisca/contracts";
import { decodeFramePayload } from "@lisca/utils";
import { Effect } from "effect";

import { createApiClient, toClientEffect, type LiscaApiClient } from "../infra/api-client";
import { withOptionalAbortSignal } from "../infra/with-abort-signal";
import { pollProgressLoop, subscribeProgress } from "../session/progress-subscribe";
import { createHostPort, type HostPortDeps } from "./host";
import type { AlignerDataPort } from "./types";

export type { AlignerDataPort } from "./types";

const decodeCropRoiProgressMessage = schemaDecoderEither(CropRoiProgressMessageSchema);

const CROP_ROI_TERMINAL_STATUSES = new Set(["completed", "cancelled", "error"]);

export type AlignerPortDeps = HostPortDeps & {
  wsUrl: () => string;
  isDev?: boolean;
};

function withClientEffect<A, E>(
  client: LiscaApiClient,
  signal: AbortSignal | undefined,
  run: (client: LiscaApiClient) => Effect.Effect<A, E>,
) {
  return withOptionalAbortSignal(toClientEffect(run(client)), signal);
}

export function createAlignerPort(
  deps: AlignerPortDeps,
  client: LiscaApiClient = createApiClient(deps),
): AlignerDataPort {
  const host = createHostPort(deps, client);

  return {
    ...host,
    scanSource(source) {
      return withClientEffect(client, undefined, (c) =>
        c.align.scanSource({ payload: { source } }),
      );
    },
    loadFrame(source, request, contrast, signal) {
      return withClientEffect(client, signal, (c) =>
        c.align
          .loadFrame({ payload: { source, request, contrast: contrast ?? null } })
          .pipe(Effect.map(decodeFramePayload)),
      );
    },
    loadAlignState(workspacePath, pos) {
      return withClientEffect(client, undefined, (c) =>
        c.align.loadAlignState({ urlParams: { workspacePath, pos } }),
      );
    },
    saveBbox(workspacePath, pos, csv, alignState) {
      return withClientEffect(client, undefined, (c) =>
        c.align.saveBbox({ payload: { workspacePath, pos, csv, alignState } }),
      );
    },
    autoExcludePreview(request) {
      return withClientEffect(client, undefined, (c) =>
        c.align.autoExcludePreview({ payload: request }),
      );
    },
    listSavedBboxPositions(workspacePath) {
      return withClientEffect(client, undefined, (c) =>
        c.align.listSavedBboxPositions({ urlParams: { workspacePath } }),
      );
    },
    cropRoi(request) {
      return withClientEffect(client, undefined, (c) => c.align.cropRoi({ payload: request }));
    },
    getLatestCropProgress(workspacePath) {
      return withClientEffect(client, undefined, (c) =>
        c.align.getLatestCropProgress({ urlParams: { workspacePath } }),
      );
    },
    cancelCropRoi(requestId) {
      return withClientEffect(client, undefined, (c) =>
        c.align.cancelCropRoi({ payload: { requestId } }),
      );
    },
    onCropRoiProgress(requestId, onProgress) {
      return createCropRoiProgressSubscription(client, deps, requestId, onProgress);
    },
    roiPosExists(workspacePath, pos) {
      return withClientEffect(client, undefined, (c) =>
        c.align
          .roiPosExists({ urlParams: { workspacePath, pos } })
          .pipe(Effect.map((result) => result.exists)),
      );
    },
  };
}

export function createCropRoiProgressSubscription(
  client: LiscaApiClient,
  deps: Pick<AlignerPortDeps, "wsUrl" | "isDev">,
  requestId: string,
  onProgress: (progress: CropRoiProgress) => void,
) {
  return subscribeProgress({
    wsUrl: deps.wsUrl(),
    requestId,
    onProgress,
    pollProgress: () => toClientEffect(client.align.cropRoiProgress({ urlParams: { requestId } })),
    decodeMessage: decodeCropRoiProgressMessage,
    extractProgress: (message) => message.progress,
    matchRequestId: (message, id) => message.progress.requestId === id,
    isTerminal: (progress) => CROP_ROI_TERMINAL_STATUSES.has(progress.status),
    createErrorProgress: (cause) => ({
      requestId,
      status: "error" as const,
      position: null,
      completedPositions: 0,
      totalPositions: 0,
      completedRois: 0,
      totalRois: 0,
      message: null,
      error: cause instanceof Error ? cause.message : String(cause),
    }),
    debugLabel: "aligner-ws",
    isDev: deps.isDev,
  });
}

export { pollProgressLoop as pollCropRoiProgressLoop };

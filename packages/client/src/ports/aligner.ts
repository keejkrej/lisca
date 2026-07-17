import type { CropRoiProgress } from "@lisca/contracts";
import { decodeFramePayload } from "@lisca/utils";
import { Effect } from "effect";

import { createApiClient, toClientEffect, type LiscaApiClient } from "../infra/api-client";
import { withClientEffect } from "../infra/with-client-effect";
import { pollProgressLoop } from "../session/progress-poll";
import { createHostPort, type HostPortDeps } from "./host";
import { createTaskPort } from "./tasks";
import type { AlignerDataPort } from "./types";

export type { AlignerDataPort } from "./types";

const CROP_ROI_TERMINAL_STATUSES = new Set(["completed", "cancelled", "error"]);

export type AlignerPortDeps = HostPortDeps;

export function createAlignerPort(
  deps: AlignerPortDeps,
  client: LiscaApiClient = createApiClient(deps),
): AlignerDataPort {
  const host = createHostPort(deps, client);
  const tasks = createTaskPort(deps, client);

  return {
    ...host,
    ...tasks,
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
      return createCropRoiProgressSubscription(client, requestId, onProgress);
    },
    roiPosExists(workspacePath, pos) {
      return withClientEffect(client, undefined, (c) =>
        c.align
          .roiPosExists({ urlParams: { workspacePath, pos } })
          .pipe(Effect.map((result) => result.exists)),
      );
    },
    smartExclude(request, signal) {
      return withClientEffect(client, signal, (c) => c.align.smartExclude({ payload: request }));
    },
  };
}

export function createCropRoiProgressSubscription(
  client: LiscaApiClient,
  requestId: string,
  onProgress: (progress: CropRoiProgress) => void,
) {
  return pollProgressLoop({
    onProgress,
    pollProgress: () => toClientEffect(client.align.cropRoiProgress({ urlParams: { requestId } })),
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
  });
}

export { pollProgressLoop as pollCropRoiProgressLoop };

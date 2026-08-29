import type { CropRoiProgress } from "@lisca/contracts";
import { decodeFramePayload } from "@lisca/utils";
import { Effect } from "effect";

import { createApiClient, toClientEffect, type LiscaApiClient } from "../infra/api-client";
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
      return toClientEffect(client.align.scanSource({ payload: { source } }));
    },
    loadFrame(source, request, contrast) {
      return toClientEffect(
        client.align
          .loadFrame({ payload: { source, request, contrast: contrast ?? null } })
          .pipe(Effect.map(decodeFramePayload)),
      );
    },
    loadAlignState(workspacePath, pos) {
      return toClientEffect(client.align.loadAlignState({ urlParams: { workspacePath, pos } }));
    },
    saveBbox(workspacePath, pos, csv, alignState) {
      return toClientEffect(
        client.align.saveBbox({ payload: { workspacePath, pos, csv, alignState } }),
      );
    },
    listSavedBboxPositions(workspacePath) {
      return toClientEffect(client.align.listSavedBboxPositions({ urlParams: { workspacePath } }));
    },
    cropRoi(request) {
      return toClientEffect(client.align.cropRoi({ payload: request }));
    },
    getLatestCropProgress(workspacePath) {
      return toClientEffect(client.align.getLatestCropProgress({ urlParams: { workspacePath } }));
    },
    cancelCropRoi(requestId) {
      return toClientEffect(client.align.cancelCropRoi({ payload: { requestId } }));
    },
    onCropRoiProgress(requestId, onProgress) {
      return createCropRoiProgressSubscription(client, requestId, onProgress);
    },
    roiPosExists(workspacePath, pos) {
      return toClientEffect(
        client.align
          .roiPosExists({ urlParams: { workspacePath, pos } })
          .pipe(Effect.map((result) => result.exists)),
      );
    },
    smartExclude(request) {
      return toClientEffect(client.align.smartExclude({ payload: request }));
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

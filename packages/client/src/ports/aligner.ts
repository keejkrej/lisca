import {
  AutoExcludePreviewResponseSchema,
  CropRoiProgressMessageSchema,
  CropRoiProgressSchema,
  CropRoiResponseSchema,
  FramePayloadSchema,
  NullableSavedAlignStateSchema,
  RoiPosExistsResponseSchema,
  SaveBboxResponseSchema,
  UIntArraySchema,
  WorkspaceScanSchema,
  schemaDecoderEither,
  type AlignerSource,
  type AutoExcludePreviewRequest,
  type ContrastWindow,
  type CropRoiProgress,
  type CropRoiRequest,
  type FrameRequest,
  type SavedAlignState,
} from "@lisca/contracts";
import { decodeFramePayload } from "@lisca/utils";
import { Effect } from "effect";

import { createJsonFetch, type JsonFetch } from "../fetch.ts";
import { pollProgressLoop, subscribeProgress } from "../progress-subscribe.ts";
import { createHostPort, type HostPortDeps } from "./host.ts";
import type { AlignerDataPort } from "./types.ts";

export type { AlignerDataPort } from "./types.ts";

const decodeCropRoiProgressMessage = schemaDecoderEither(CropRoiProgressMessageSchema);

const CROP_ROI_TERMINAL_STATUSES = new Set(["completed", "cancelled", "error"]);

export type AlignerPortDeps = HostPortDeps & {
  wsUrl: () => string;
  isDev?: boolean;
};

export function createAlignerPort(deps: AlignerPortDeps): AlignerDataPort {
  const json = createJsonFetch(deps.baseUrl, deps.fetch);
  const host = createHostPort(deps);

  return {
    ...host,
    scanSource(source) {
      return json.postJson("/align/scan-source", { source }, WorkspaceScanSchema);
    },
    loadFrame(source, request, contrast, signal) {
      return json
        .postJson(
          "/align/load-frame",
          { source, request, contrast: contrast ?? null },
          FramePayloadSchema,
          signal,
        )
        .pipe(Effect.map(decodeFramePayload));
    },
    loadAlignState(workspacePath, pos) {
      return json.getJson("/align/align-state", NullableSavedAlignStateSchema, {
        workspacePath,
        pos,
      });
    },
    saveBbox(workspacePath, pos, csv, alignState) {
      return json.postJson(
        "/align/save-bbox",
        { workspacePath, pos, csv, alignState },
        SaveBboxResponseSchema,
      );
    },
    autoExcludePreview(request) {
      return json.postJson(
        "/align/auto-exclude-preview",
        request,
        AutoExcludePreviewResponseSchema,
      );
    },
    listSavedBboxPositions(workspacePath) {
      return json.getJson("/align/saved-bbox-positions", UIntArraySchema, { workspacePath });
    },
    cropRoi(request) {
      return json.postJson("/align/crop-roi", request, CropRoiResponseSchema);
    },
    cancelCropRoi(requestId) {
      return json.postJson("/align/cancel-crop-roi", { requestId }, CropRoiProgressSchema);
    },
    onCropRoiProgress(requestId, onProgress) {
      return createCropRoiProgressSubscription(json, deps, requestId, onProgress);
    },
    roiPosExists(workspacePath, pos) {
      return json
        .getJson("/align/roi-pos-exists", RoiPosExistsResponseSchema, { workspacePath, pos })
        .pipe(Effect.map((result) => result.exists));
    },
  };
}

export function createCropRoiProgressSubscription(
  json: JsonFetch,
  deps: Pick<AlignerPortDeps, "baseUrl" | "wsUrl" | "isDev">,
  requestId: string,
  onProgress: (progress: CropRoiProgress) => void,
) {
  return subscribeProgress({
    wsUrl: deps.wsUrl(),
    requestId,
    onProgress,
    pollProgress: () =>
      json.getJson("/align/crop-roi-progress", CropRoiProgressSchema, { requestId }),
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

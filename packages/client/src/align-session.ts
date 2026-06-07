import type { CropRoiProgress, CropRoiRequest } from "@lisca/contracts";
import { isDoneCropStatus } from "@lisca/contracts";

import type { AlignerDataPort } from "./ports/types.ts";
import { runClientEffect } from "./runtime.ts";

/** Initial `queued` progress for a freshly-submitted crop job. */
export function makeQueuedCropProgress(requestId: string, totalPositions: number): CropRoiProgress {
  return {
    requestId,
    status: "queued",
    position: null,
    completedPositions: 0,
    totalPositions,
    completedRois: 0,
    totalRois: 0,
    message: "Queued crop",
  };
}

/** Terminal `error` progress for a crop job that failed before/while running. */
export function makeErrorCropProgress(
  requestId: string,
  totalPositions: number,
  message: string,
): CropRoiProgress {
  return {
    requestId,
    status: "error",
    position: null,
    completedPositions: 0,
    totalPositions,
    completedRois: 0,
    totalRois: 0,
    message,
    error: message,
  };
}

export type RunCropRoiOptions = {
  client: Pick<AlignerDataPort, "cropRoi" | "onCropRoiProgress">;
  request: CropRoiRequest;
  /** Called with the queued progress, every progress update, and any error progress. */
  onProgress: (progress: CropRoiProgress) => void;
  /** Called with a human-readable message when the job fails. */
  onError: (message: string) => void;
  /** Called once with the terminal progress when the job completes. */
  onCompleted: (progress: CropRoiProgress) => void;
  /** Format a thrown cause into a user-facing message. */
  toErrorMessage: (cause: unknown, fallback: string) => string;
};

/**
 * Submit a crop ROI job and drive its progress subscription to a terminal
 * state. Shared by the aligner and studio align sessions; callers supply the
 * request and the side effects (progress/status/navigation) they care about.
 */
export async function runCropRoi(options: RunCropRoiOptions): Promise<void> {
  const { client, request, onProgress, onError, onCompleted, toErrorMessage } = options;
  const totalPositions = request.positions.length;

  onProgress(makeQueuedCropProgress(request.requestId, totalPositions));

  let stop = () => {};
  try {
    await runClientEffect(client.cropRoi(request));
    stop = client.onCropRoiProgress(request.requestId, (progress) => {
      onProgress(progress);
      if (!isDoneCropStatus(progress.status)) return;
      if (progress.status === "error") {
        onError(progress.error ?? "Crop failed");
      } else if (progress.status === "completed") {
        onCompleted(progress);
      }
      stop();
    });
  } catch (cause) {
    stop();
    const message = toErrorMessage(cause, "Crop failed");
    onError(message);
    onProgress(makeErrorCropProgress(request.requestId, totalPositions, message));
  }
}

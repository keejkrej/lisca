import type { CropRoiProgress } from "@lisca/contracts";
import { logClientEvent } from "@lisca/client/client-log";

import { studioClient } from "../api/studio-port";

type RefreshRoi = (workspacePath: string) => void;

let refreshRoi: RefreshRoi = () => {};
const cropStops = new Map<string, () => void>();

/** The work-session gate registers this so a finished crop reloads the ROI scan. */
export function bindStudioCropRefresh(refresh: RefreshRoi): () => void {
  refreshRoi = refresh;
  return () => {
    if (refreshRoi === refresh) refreshRoi = () => {};
  };
}

export function refreshStudioRoi(workspacePath: string): void {
  refreshRoi(workspacePath);
}

function isTerminal(status: CropRoiProgress["status"]): boolean {
  return status === "completed" || status === "error";
}

/**
 * Follow a crop after Align unmounts. The align session's own subscription
 * stops on cleanup; this one stays until the task finishes and then reloads ROI.
 */
export function watchStudioCrop(requestId: string, workspacePath: string): void {
  const key = `${workspacePath}\0${requestId}`;
  if (cropStops.has(key)) return;
  logClientEvent(`crop started ${requestId}`);
  const stop = studioClient.onCropRoiProgress(requestId, (progress) => {
    if (!isTerminal(progress.status)) return;
    const finish = cropStops.get(key);
    cropStops.delete(key);
    finish?.();
    if (progress.status === "completed") refreshStudioRoi(workspacePath);
  });
  cropStops.set(key, stop);
}

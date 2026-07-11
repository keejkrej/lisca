import type { AnalysisProgress, CropRoiProgress } from "@lisca/contracts";
import { isDoneCropStatus } from "@lisca/client/crop-status";
import type { AlignerDataPort } from "../ports/types";
import { runClientEffect, type ClientEffect } from "../infra/runtime";
import { acknowledgeCropRecovery, readCropRecovery, rememberCropRecovery } from "./crop-recovery";

const ANALYSIS_TERMINAL_STATUSES = new Set(["completed", "error"]);

function isActiveAnalysisProgress(progress: AnalysisProgress): boolean {
  return !ANALYSIS_TERMINAL_STATUSES.has(progress.status);
}

export type ResumeCropPendingRunsOptions = {
  client: Pick<AlignerDataPort, "getLatestCropProgress" | "onCropRoiProgress">;
  workspacePath: string;
  serverIdentity: string;
  onProgress: (progress: CropRoiProgress) => void;
  onTerminal?: (progress: CropRoiProgress) => void;
};

export type ResumedCropRun =
  | { kind: "none" }
  | { kind: "active"; progress: CropRoiProgress; stop: () => void }
  | { kind: "terminal"; progress: CropRoiProgress; acknowledged: boolean };

export async function resumeCropPendingRun(
  options: ResumeCropPendingRunsOptions,
): Promise<ResumedCropRun> {
  const { client, serverIdentity, workspacePath, onProgress, onTerminal } = options;
  const latest = await runClientEffect(client.getLatestCropProgress(workspacePath));
  if (!latest) return { kind: "none" };
  if (isDoneCropStatus(latest.status)) {
    const recovery = readCropRecovery(serverIdentity, workspacePath);
    if (recovery?.requestId !== latest.requestId) return { kind: "none" };
    return {
      kind: "terminal",
      progress: latest,
      acknowledged: recovery.terminalAcknowledged,
    };
  }
  rememberCropRecovery(serverIdentity, workspacePath, latest.requestId);
  onProgress(latest);
  const handleProgress = (progress: CropRoiProgress) => {
    onProgress(progress);
    if (!isDoneCropStatus(progress.status)) return;
    onTerminal?.(progress);
    acknowledgeCropRecovery(serverIdentity, workspacePath, progress.requestId);
  };
  return {
    kind: "active",
    progress: latest,
    stop: client.onCropRoiProgress(latest.requestId, handleProgress),
  };
}

export type ResumeAnalysisPendingRunsOptions = {
  getLatestAnalysisProgress: (workspacePath: string) => Promise<AnalysisProgress | null>;
  onAnalysisProgress: (
    requestId: string,
    onProgress: (progress: AnalysisProgress) => void,
  ) => () => void;
  workspacePath: string;
  onProgress: (progress: AnalysisProgress) => void;
};

export async function resumeAnalysisPendingRun(
  options: ResumeAnalysisPendingRunsOptions,
): Promise<(() => void) | null> {
  const { workspacePath, onProgress, getLatestAnalysisProgress, onAnalysisProgress } = options;
  const latest = await getLatestAnalysisProgress(workspacePath);
  if (!latest || !isActiveAnalysisProgress(latest)) return null;
  onProgress(latest);
  return onAnalysisProgress(latest.requestId, onProgress);
}

export type ResumeStudioPendingRunsOptions = {
  client: Pick<AlignerDataPort, "getLatestCropProgress" | "onCropRoiProgress"> & {
    getLatestAnalysisProgress(workspacePath: string): ClientEffect<AnalysisProgress | null>;
    onAnalysisProgress(
      requestId: string,
      onProgress: (progress: AnalysisProgress) => void,
    ): () => void;
  };
  workspacePath: string;
  serverIdentity: string;
  onCropProgress: (progress: CropRoiProgress) => void;
  onRestoredCropTerminal?: (progress: CropRoiProgress) => void;
  onAnalysisProgress: (progress: AnalysisProgress) => void;
};

export async function resumeStudioPendingRuns(
  options: ResumeStudioPendingRunsOptions,
): Promise<() => void> {
  const stops: Array<(() => void) | null> = [];
  const crop = await resumeCropPendingRun({
    client: options.client,
    serverIdentity: options.serverIdentity,
    workspacePath: options.workspacePath,
    onProgress: options.onCropProgress,
    onTerminal: options.onRestoredCropTerminal,
  });
  if (crop.kind === "active") stops.push(crop.stop);
  if (crop.kind === "terminal" && !crop.acknowledged) {
    options.onCropProgress(crop.progress);
    options.onRestoredCropTerminal?.(crop.progress);
    acknowledgeCropRecovery(options.serverIdentity, options.workspacePath, crop.progress.requestId);
  }
  stops.push(
    await resumeAnalysisPendingRun({
      workspacePath: options.workspacePath,
      getLatestAnalysisProgress: (path) =>
        runClientEffect(options.client.getLatestAnalysisProgress(path)),
      onAnalysisProgress: options.client.onAnalysisProgress,
      onProgress: options.onAnalysisProgress,
    }),
  );
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    for (const stop of stops) stop?.();
  };
}

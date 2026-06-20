import type { AnalysisProgress, CropRoiProgress } from "@lisca/contracts";
import { isDoneCropStatus } from "@lisca/client/crop-status";
import type { AlignerDataPort } from "../ports/types";
import { runClientEffect, type ClientEffect } from "../infra/runtime";

const ANALYSIS_TERMINAL_STATUSES = new Set(["completed", "error"]);

function isActiveAnalysisProgress(progress: AnalysisProgress): boolean {
  return !ANALYSIS_TERMINAL_STATUSES.has(progress.status);
}

export type ResumeCropPendingRunsOptions = {
  client: Pick<AlignerDataPort, "getLatestCropProgress" | "onCropRoiProgress">;
  workspacePath: string;
  onProgress: (progress: CropRoiProgress) => void;
};

export async function resumeCropPendingRun(
  options: ResumeCropPendingRunsOptions,
): Promise<(() => void) | null> {
  const { client, workspacePath, onProgress } = options;
  const latest = await runClientEffect(client.getLatestCropProgress(workspacePath));
  if (!latest || isDoneCropStatus(latest.status)) return null;
  onProgress(latest);
  return client.onCropRoiProgress(latest.requestId, onProgress);
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
  onCropProgress: (progress: CropRoiProgress) => void;
  onAnalysisProgress: (progress: AnalysisProgress) => void;
};

export async function resumeStudioPendingRuns(
  options: ResumeStudioPendingRunsOptions,
): Promise<() => void> {
  const stops: Array<(() => void) | null> = [];
  stops.push(
    await resumeCropPendingRun({
      client: options.client,
      workspacePath: options.workspacePath,
      onProgress: options.onCropProgress,
    }),
  );
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

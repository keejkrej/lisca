import type {
  AlignDrift,
  AlignGridPatternCoord,
  AlignGridState,
  VariationExcludePreviewResponse,
  CropRoiProgress,
  CropRoiRequest,
  FrameRequest,
} from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { isDoneCropStatus } from "@lisca/client/crop-status";
import {
  collectAlignGridEdgePatterns,
  countVisibleAlignGridPatterns,
  mergeExcludedAlignGridPatterns,
  normalizeAlignDrift,
} from "@lisca/utils";

import type { AlignerDataPort } from "../ports/types";
import { runClientEffect } from "../infra/runtime";
import { acknowledgeCropRecovery, rememberCropRecovery } from "./crop-recovery";

/** Initial `queued` progress for a freshly-submitted crop task. */
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

/** Terminal `error` progress for a crop task that failed before/while running. */
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
  /** Called with a human-readable message when the task fails. */
  onError: (message: string) => void;
  /** Called once with the terminal progress when the task completes. */
  onCompleted: (progress: CropRoiProgress) => void;
  /** Called with the server request id once the crop has been accepted. */
  onStarted?: (requestId: string) => void;
  /** Format a thrown cause into a user-facing message. */
  toErrorMessage: (cause: unknown, fallback: string) => string;
};

/**
 * Submit a crop ROI task and drive its progress subscription to a terminal
 * state. Shared by the aligner and studio align sessions; callers supply the
 * request and the side effects (progress/status/navigation) they care about.
 */
export type ExcludedByPosition = Record<number, AlignGridPatternCoord[]>;

const emptyExcludedPatterns: AlignGridPatternCoord[] = [];

export function deriveCurrentExcludedPatterns(
  excludedPatternsByPosition: ExcludedByPosition,
  position: number,
): AlignGridPatternCoord[] {
  return excludedPatternsByPosition[position] ?? emptyExcludedPatterns;
}

export function deriveDisplayedExcludedPatterns(
  excludedPatternsByPosition: ExcludedByPosition,
  loadedFramePosition: number | undefined,
  selectionPosition: number,
): AlignGridPatternCoord[] {
  return (
    excludedPatternsByPosition[loadedFramePosition ?? selectionPosition] ?? emptyExcludedPatterns
  );
}

export function deriveVisibleCounts(
  frame: FrameResult | null,
  grid: AlignGridState,
  displayedExcludedPatterns: Iterable<AlignGridPatternCoord>,
): { included: number; excluded: number } {
  return frame
    ? countVisibleAlignGridPatterns(frame, grid, displayedExcludedPatterns)
    : { included: 0, excluded: 0 };
}

export function isCropping(cropProgress: CropRoiProgress | null): boolean {
  return cropProgress != null && !isDoneCropStatus(cropProgress.status);
}

export function cropRequestIdForCancellation(progress: CropRoiProgress | null): string | null {
  return progress && !isDoneCropStatus(progress.status) ? progress.requestId : null;
}

export function patternsBelowVariationThreshold(
  preview: VariationExcludePreviewResponse,
  threshold: number,
): AlignGridPatternCoord[] {
  return preview.patternScores
    .filter((pattern) => pattern.score <= threshold)
    .map(({ i, j }) => ({ i, j }));
}

export type VariationExcludePreview = {
  preview: VariationExcludePreviewResponse;
  threshold: number;
};

export function updateVariationExcludeThreshold(
  current: VariationExcludePreview | null,
  threshold: number,
): VariationExcludePreview | null {
  return current ? { ...current, threshold } : null;
}

/** Var-exclude apply paired with edge exclude (same merge as excludeEdgeAndVariation). */
export function applyVariationExcludeWithEdge(
  currentExcludedPatterns: AlignGridPatternCoord[],
  frame: FrameResult,
  grid: AlignGridState,
  preview: VariationExcludePreview,
): {
  patterns: AlignGridPatternCoord[];
  variationPatterns: AlignGridPatternCoord[];
  eligiblePatternCount: number;
} {
  const variationPatterns = patternsBelowVariationThreshold(preview.preview, preview.threshold);
  return {
    patterns: mergeEdgeAndVariationExcludedPatterns(
      currentExcludedPatterns,
      frame,
      grid,
      preview.preview,
      preview.threshold,
    ),
    variationPatterns,
    eligiblePatternCount: preview.preview.eligiblePatternCount,
  };
}

export function mergeAlignGridEdgeExclusion(
  currentExcludedPatterns: AlignGridPatternCoord[],
  frame: FrameResult,
  grid: AlignGridState,
): AlignGridPatternCoord[] {
  return mergeExcludedAlignGridPatterns(
    currentExcludedPatterns,
    collectAlignGridEdgePatterns(frame, grid),
  );
}

/** Dock exclude: replace prior exclusions with edge + var (non-additive). */
export function applyDockVariationExcludeWithEdge(
  frame: FrameResult,
  grid: AlignGridState,
  preview: VariationExcludePreview,
): ReturnType<typeof applyVariationExcludeWithEdge> {
  return applyVariationExcludeWithEdge([], frame, grid, preview);
}

export function mergeEdgeAndVariationExcludedPatterns(
  currentExcludedPatterns: AlignGridPatternCoord[],
  frame: FrameResult,
  grid: AlignGridState,
  variationPreview: VariationExcludePreviewResponse | null,
  variationThreshold?: number,
): AlignGridPatternCoord[] {
  const edgePatterns = collectAlignGridEdgePatterns(frame, grid);
  const variationPatterns =
    variationPreview != null && variationThreshold != null
      ? patternsBelowVariationThreshold(variationPreview, variationThreshold)
      : [];
  return mergeExcludedAlignGridPatterns(currentExcludedPatterns, [
    ...edgePatterns,
    ...variationPatterns,
  ]);
}

export type CropConfirmState = {
  kind: "single" | "batch";
  positions: number[];
  existingPositions: number[];
};

export function cropPositionsAfterSkip(positions: number[], existingPositions: number[]): number[] {
  const existing = new Set(existingPositions);
  return positions.filter((pos) => !existing.has(pos));
}

/** Studio jump policy: first unsaved assay position, or the final position when all are saved. */
export function resolveFirstUnalignedTarget(
  positions: number[],
  savedPositions: ReadonlySet<number>,
): number | null {
  return positions.find((position) => !savedPositions.has(position)) ?? positions.at(-1) ?? null;
}

/**
 * Studio Continue policy: the next unsaved position after `currentPosition`, wrapping to the start.
 * Returns `currentPosition` when it is the only unsaved one, and null when every position is saved.
 */
export function nextUnsavedAlignPosition(
  positions: number[],
  currentPosition: number,
  savedPositions: ReadonlySet<number>,
): number | null {
  const start = positions.indexOf(currentPosition);
  for (let offset = 1; offset <= positions.length; offset += 1) {
    const position = positions[(start + offset) % positions.length]!;
    if (!savedPositions.has(position)) return position;
  }
  return null;
}

/** Order-independent key for a position's grid, exclusions, and drift. */
export function alignSnapshotKey(
  grid: AlignGridState,
  excludedPatterns: AlignGridPatternCoord[],
  drift: AlignDrift | null,
): string {
  const patterns = excludedPatterns
    .map((pattern) => [pattern.i, pattern.j] as const)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return JSON.stringify({
    grid,
    patterns,
    drift: drift == null ? null : normalizeAlignDrift(drift),
  });
}

export function nextAlignPosition(positions: number[], currentPosition: number): number | null {
  const currentIndex = positions.indexOf(currentPosition);
  return currentIndex >= 0 ? (positions[currentIndex + 1] ?? null) : null;
}

export function allAlignPositionsSaved(
  positions: number[],
  savedPositions: ReadonlySet<number>,
): boolean {
  return positions.length > 0 && positions.every((position) => savedPositions.has(position));
}

export function shouldApplySourceScan(
  scanSourceKey: string | null,
  activeSourceKey: string,
): boolean {
  return scanSourceKey !== activeSourceKey;
}

export function frameLoadSelectionKey(selection: FrameRequest): string {
  return JSON.stringify(selection);
}

const noop = () => {};

export async function runCropRoi(options: RunCropRoiOptions): Promise<() => void> {
  const { client, request, onProgress, onError, onCompleted, toErrorMessage } = options;
  const totalPositions = request.positions.length;

  onProgress(makeQueuedCropProgress(request.requestId, totalPositions));

  let stop: () => void = noop;
  try {
    const response = await runClientEffect(client.cropRoi(request));
    const authoritativeId = response.requestId;
    rememberCropRecovery(request.workspacePath, authoritativeId);
    onProgress({
      ...makeQueuedCropProgress(authoritativeId, totalPositions),
      status: response.status,
      message: response.disposition === "attached" ? "Attached to active crop" : "Queued crop",
    });
    options.onStarted?.(authoritativeId);
    stop = client.onCropRoiProgress(authoritativeId, (progress) => {
      onProgress(progress);
      if (!isDoneCropStatus(progress.status)) return;
      if (progress.status === "error") {
        onError(progress.error ?? "Crop failed");
      } else if (progress.status === "completed") {
        onCompleted(progress);
      }
      acknowledgeCropRecovery(request.workspacePath, progress.requestId);
      stop();
    });
    return () => stop();
  } catch (cause) {
    stop();
    const message = toErrorMessage(cause, "Crop failed");
    onError(message);
    onProgress(makeErrorCropProgress(request.requestId, totalPositions, message));
    return noop;
  }
}

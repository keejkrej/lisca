import type {
  AlignGridCellCoord,
  AlignGridState,
  AutoExcludePreviewResponse,
  CropRoiProgress,
  CropRoiRequest,
  FrameRequest,
} from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { isDoneCropStatus } from "@lisca/client/crop-status";
import {
  collectAlignGridEdgeCells,
  countVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
} from "@lisca/utils";

import type { AlignerDataPort } from "../ports/types";
import { runClientEffect } from "../infra/runtime";
import { acknowledgeCropRecovery, rememberCropRecovery } from "./crop-recovery";

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
  /** Stable identity for the server owning the in-memory crop job. */
  serverIdentity: string;
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
export type ExcludedByPosition = Record<number, AlignGridCellCoord[]>;

const emptyExcludedCells: AlignGridCellCoord[] = [];

export function deriveCurrentExcludedCells(
  excludedCellsByPosition: ExcludedByPosition,
  position: number,
): AlignGridCellCoord[] {
  return excludedCellsByPosition[position] ?? emptyExcludedCells;
}

export function deriveDisplayedExcludedCells(
  excludedCellsByPosition: ExcludedByPosition,
  loadedFramePosition: number | undefined,
  selectionPosition: number,
): AlignGridCellCoord[] {
  return excludedCellsByPosition[loadedFramePosition ?? selectionPosition] ?? emptyExcludedCells;
}

export function deriveVisibleCounts(
  frame: FrameResult | null,
  grid: AlignGridState,
  displayedExcludedCells: Iterable<AlignGridCellCoord>,
): { included: number; excluded: number } {
  return frame
    ? countVisibleAlignGridCells(frame, grid, displayedExcludedCells)
    : { included: 0, excluded: 0 };
}

export function isCropping(cropProgress: CropRoiProgress | null): boolean {
  return cropProgress != null && !isDoneCropStatus(cropProgress.status);
}

export function cropRequestIdForCancellation(progress: CropRoiProgress | null): string | null {
  return progress && !isDoneCropStatus(progress.status) ? progress.requestId : null;
}

export function cellsBelowVariationThreshold(
  preview: AutoExcludePreviewResponse,
  threshold: number,
): AlignGridCellCoord[] {
  return preview.cellScores.filter((cell) => cell.score <= threshold).map(({ i, j }) => ({ i, j }));
}

export type VariationExcludePreview = {
  preview: AutoExcludePreviewResponse;
  threshold: number;
};

export function updateVariationExcludeThreshold(
  current: VariationExcludePreview | null,
  threshold: number,
): VariationExcludePreview | null {
  return current ? { ...current, threshold } : null;
}

export function applyVariationExcludePreview(
  currentExcludedCells: AlignGridCellCoord[],
  preview: VariationExcludePreview,
): {
  cells: AlignGridCellCoord[];
  variationCells: AlignGridCellCoord[];
  eligibleCellCount: number;
} {
  const variationCells = cellsBelowVariationThreshold(preview.preview, preview.threshold);
  return {
    cells: mergeExcludedAlignGridCells(currentExcludedCells, variationCells),
    variationCells,
    eligibleCellCount: preview.preview.eligibleCellCount,
  };
}

/** Var-exclude apply paired with edge exclude (same merge as auto-exclude). */
export function applyVariationExcludeWithEdge(
  currentExcludedCells: AlignGridCellCoord[],
  frame: FrameResult,
  grid: AlignGridState,
  preview: VariationExcludePreview,
): {
  cells: AlignGridCellCoord[];
  variationCells: AlignGridCellCoord[];
  eligibleCellCount: number;
} {
  const variationCells = cellsBelowVariationThreshold(preview.preview, preview.threshold);
  return {
    cells: mergeAutoExcludedAlignCells(
      currentExcludedCells,
      frame,
      grid,
      preview.preview,
      preview.threshold,
    ),
    variationCells,
    eligibleCellCount: preview.preview.eligibleCellCount,
  };
}

export function mergeAlignGridEdgeExclusion(
  currentExcludedCells: AlignGridCellCoord[],
  frame: FrameResult,
  grid: AlignGridState,
): AlignGridCellCoord[] {
  return mergeExcludedAlignGridCells(currentExcludedCells, collectAlignGridEdgeCells(frame, grid));
}

/** Dock exclude: replace prior exclusions with edge + var (non-additive). */
export function applyDockVariationExcludeWithEdge(
  frame: FrameResult,
  grid: AlignGridState,
  preview: VariationExcludePreview,
): ReturnType<typeof applyVariationExcludeWithEdge> {
  return applyVariationExcludeWithEdge([], frame, grid, preview);
}

export function mergeAutoExcludedAlignCells(
  currentExcludedCells: AlignGridCellCoord[],
  frame: FrameResult,
  grid: AlignGridState,
  variationPreview: AutoExcludePreviewResponse | null,
  variationThreshold?: number,
): AlignGridCellCoord[] {
  const edgeCells = collectAlignGridEdgeCells(frame, grid);
  const variationCells =
    variationPreview != null && variationThreshold != null
      ? cellsBelowVariationThreshold(variationPreview, variationThreshold)
      : [];
  return mergeExcludedAlignGridCells(currentExcludedCells, [...edgeCells, ...variationCells]);
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
  const { client, request, serverIdentity, onProgress, onError, onCompleted, toErrorMessage } =
    options;
  const totalPositions = request.positions.length;

  onProgress(makeQueuedCropProgress(request.requestId, totalPositions));

  let stop: () => void = noop;
  try {
    const response = await runClientEffect(client.cropRoi(request));
    const authoritativeId = response.requestId;
    rememberCropRecovery(serverIdentity, request.workspacePath, authoritativeId);
    onProgress({
      ...makeQueuedCropProgress(authoritativeId, totalPositions),
      status: response.status,
      message: response.disposition === "attached" ? "Attached to active crop" : "Queued crop",
    });
    stop = client.onCropRoiProgress(authoritativeId, (progress) => {
      onProgress(progress);
      if (!isDoneCropStatus(progress.status)) return;
      if (progress.status === "error") {
        onError(progress.error ?? "Crop failed");
      } else if (progress.status === "completed") {
        onCompleted(progress);
      }
      acknowledgeCropRecovery(serverIdentity, request.workspacePath, progress.requestId);
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

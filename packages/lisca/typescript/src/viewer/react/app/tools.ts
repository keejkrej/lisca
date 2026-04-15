import type { CropRoiResponse, GridState } from "lisca/shared/contracts";

export const Q20_PRESET = {
  shape: "square",
  spacingA: 168,
  spacingB: 168,
  cellWidth: 128,
  cellHeight: 128,
} satisfies Pick<GridState, "shape" | "spacingA" | "spacingB" | "cellWidth" | "cellHeight">;

export interface BatchCropFailure {
  pos: number;
  error: string;
}

export interface BatchCropRunResult {
  total: number;
  processed: number;
  succeeded: number;
  failures: BatchCropFailure[];
  cancelledAtPos: number | null;
}

export function applyQ20Preset(grid: GridState): GridState {
  return {
    ...grid,
    ...Q20_PRESET,
  };
}

export function computeBatchCropOverallProgress(
  positionIndex: number,
  total: number,
  positionProgress: number,
): number {
  if (total <= 0) return 0;
  const clampedPositionProgress = Math.min(1, Math.max(0, positionProgress));
  return Math.min(1, Math.max(0, (positionIndex + clampedPositionProgress) / total));
}

export async function runBatchCropSequence(
  positions: number[],
  cropPosition: (pos: number, index: number) => Promise<Pick<CropRoiResponse, "status" | "error">>,
): Promise<BatchCropRunResult> {
  let processed = 0;
  let succeeded = 0;
  let cancelledAtPos: number | null = null;
  const failures: BatchCropFailure[] = [];

  for (const [index, pos] of positions.entries()) {
    const result = await cropPosition(pos, index);
    processed += 1;

    if (result.status === "success") {
      succeeded += 1;
      continue;
    }

    if (result.status === "cancelled") {
      cancelledAtPos = pos;
      break;
    }

    failures.push({
      pos,
      error: result.error ?? `Failed to crop Pos${pos}`,
    });
  }

  return {
    total: positions.length,
    processed,
    succeeded,
    failures,
    cancelledAtPos,
  };
}

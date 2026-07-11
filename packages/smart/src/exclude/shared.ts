import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import type { AutoExcludePreviewCell } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { alignGridCellCoordKey, enumerateVisibleAlignGridCells } from "@lisca/utils";

export function getSmartExcludeCandidateCells(
  frame: FrameResult,
  grid: AlignGridState,
  currentExcludedCells: readonly AlignGridCellCoord[],
): AutoExcludePreviewCell[] {
  const excludedKeys = new Set(currentExcludedCells.map(alignGridCellCoordKey));
  return enumerateVisibleAlignGridCells(frame, grid).filter(
    (cell) => !excludedKeys.has(alignGridCellCoordKey(cell)),
  );
}
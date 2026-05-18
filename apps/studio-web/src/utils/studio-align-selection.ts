import type { AlignGridCellCoord } from "@lisca/contracts";
import { mergeExcludedAlignGridCells } from "@lisca/utils";

export function mergeStudioExcludedCells(
  currentCells: readonly AlignGridCellCoord[],
  nextCells: readonly AlignGridCellCoord[],
): AlignGridCellCoord[] {
  return mergeExcludedAlignGridCells(currentCells, nextCells);
}

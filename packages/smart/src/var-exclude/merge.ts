import type {
  AlignGridCellCoord,
  AlignGridState,
  AutoExcludePreviewResponse,
} from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import {
  collectAlignGridEdgeCells,
  mergeExcludedAlignGridCells,
} from "@lisca/utils";

export function cellsBelowVariationThreshold(
  preview: AutoExcludePreviewResponse,
  threshold: number,
): AlignGridCellCoord[] {
  return preview.cellScores.filter((cell) => cell.score <= threshold).map(({ i, j }) => ({ i, j }));
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
import type {
  AlignGridCellCoord,
  AlignGridState,
  FrameResult,
  SavedAlignState,
} from "@lisca/contracts";
import { enumerateVisibleAlignGridCells } from "@lisca/utils";

export function buildBboxCsv(
  frame: FrameResult,
  grid: AlignGridState,
  excludedCells: readonly AlignGridCellCoord[],
): string {
  const excluded = new Set(excludedCells.map((cell) => `${cell.i}:${cell.j}`));
  const rows = enumerateVisibleAlignGridCells(frame, grid)
    .filter((cell) => !excluded.has(`${cell.i}:${cell.j}`))
    .map((cell, roi) => [roi, cell.x, cell.y, cell.w, cell.h, cell.i, cell.j].join(","));
  return ["roi,x,y,w,h,i,j", ...rows].join("\n");
}

export function alignStateFromCurrent(
  grid: AlignGridState,
  currentExcludedCells: AlignGridCellCoord[],
): SavedAlignState {
  return {
    grid,
    excludedCells: currentExcludedCells,
  };
}

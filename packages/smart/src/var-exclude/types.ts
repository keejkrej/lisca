import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";

export type VarExcludeInput = {
  frame: FrameResult;
  grid: AlignGridState;
  currentExcludedCells: AlignGridCellCoord[];
};

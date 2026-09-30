import type { AlignGridPatternCoord, AlignGridState } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";

export type VarExcludeInput = {
  frame: FrameResult;
  grid: AlignGridState;
  currentExcludedPatterns: AlignGridPatternCoord[];
};

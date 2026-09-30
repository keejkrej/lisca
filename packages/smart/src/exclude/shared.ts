import type { AlignGridPatternCoord, AlignGridState } from "@lisca/contracts";
import type { AlignGridPatternBox } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { alignGridPatternCoordKey, enumerateVisibleAlignGridPatterns } from "@lisca/utils";

export function getSmartExcludeCandidatePatterns(
  frame: FrameResult,
  grid: AlignGridState,
  currentExcludedPatterns: readonly AlignGridPatternCoord[],
): AlignGridPatternBox[] {
  const excludedKeys = new Set(currentExcludedPatterns.map(alignGridPatternCoordKey));
  return enumerateVisibleAlignGridPatterns(frame, grid).filter(
    (pattern) => !excludedKeys.has(alignGridPatternCoordKey(pattern)),
  );
}

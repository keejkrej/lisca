import type {
  AlignGridPatternCoord,
  AlignGridState,
  VariationExcludePreviewResponse,
} from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { collectAlignGridEdgePatterns, mergeExcludedAlignGridPatterns } from "@lisca/utils";

export function patternsBelowVariationThreshold(
  preview: VariationExcludePreviewResponse,
  threshold: number,
): AlignGridPatternCoord[] {
  return preview.patternScores
    .filter((pattern) => pattern.score <= threshold)
    .map(({ i, j }) => ({ i, j }));
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

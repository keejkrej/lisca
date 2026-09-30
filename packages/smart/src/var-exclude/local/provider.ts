import { computeVariationExcludePreview, enumerateVisibleAlignGridPatterns } from "@lisca/utils";

import { mergeEdgeAndVariationExcludedPatterns } from "../merge";
import type { VarExcludeProvider } from "../provider";

export function createLocalVarExcludeProvider(): VarExcludeProvider {
  return {
    async preview(input) {
      const patterns = enumerateVisibleAlignGridPatterns(input.frame, input.grid);
      if (patterns.length === 0) return null;
      return computeVariationExcludePreview(input.frame, patterns);
    },
    async excludeEdgeAndVariation(input) {
      const preview = await this.preview(input);
      return mergeEdgeAndVariationExcludedPatterns(
        input.currentExcludedPatterns,
        input.frame,
        input.grid,
        preview,
        preview?.threshold,
      );
    },
  };
}

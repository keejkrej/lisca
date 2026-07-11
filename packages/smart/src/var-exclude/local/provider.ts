import {
  computeAutoExcludePreview,
  enumerateVisibleAlignGridCells,
} from "@lisca/utils";

import { mergeAutoExcludedAlignCells } from "../merge";
import type { VarExcludeProvider } from "../provider";

export function createLocalVarExcludeProvider(): VarExcludeProvider {
  return {
    async preview(input) {
      const cells = enumerateVisibleAlignGridCells(input.frame, input.grid);
      if (cells.length === 0) return null;
      return computeAutoExcludePreview(input.frame, cells);
    },
    async autoExclude(input) {
      const preview = await this.preview(input);
      return mergeAutoExcludedAlignCells(
        input.currentExcludedCells,
        input.frame,
        input.grid,
        preview,
        preview?.threshold,
      );
    },
  };
}
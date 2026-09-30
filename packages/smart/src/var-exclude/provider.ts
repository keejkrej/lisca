import type { AlignGridPatternCoord, VariationExcludePreviewResponse } from "@lisca/contracts";

import type { VarExcludeInput } from "./types";

export type VarExcludeProvider = {
  preview(input: VarExcludeInput): Promise<VariationExcludePreviewResponse | null>;
  excludeEdgeAndVariation(input: VarExcludeInput): Promise<AlignGridPatternCoord[]>;
};

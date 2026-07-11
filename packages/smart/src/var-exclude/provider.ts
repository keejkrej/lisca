import type { AlignGridCellCoord, AutoExcludePreviewResponse } from "@lisca/contracts";

import type { VarExcludeInput } from "./types";

export type VarExcludeProvider = {
  preview(input: VarExcludeInput): Promise<AutoExcludePreviewResponse | null>;
  autoExclude(input: VarExcludeInput): Promise<AlignGridCellCoord[]>;
};
import type { AlignGridCellCoord } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";

import type { ClassifyExclusionCandidatesOptions, ClassifyExclusionInput } from "./types";

export type SmartExcludeProvider = {
  classify(
    input: ClassifyExclusionInput,
    options?: ClassifyExclusionCandidatesOptions,
  ): Promise<AlignGridCellCoord[]>;
};

export type SmartExcludeProviderFrameInput = {
  frame: FrameResult | null;
};
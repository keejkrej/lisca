import type { AlignGridPatternCoord } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";

import type { ClassifyExclusionCandidatesOptions, ClassifyExclusionInput } from "./types";

export type SmartExcludeProvider = {
  classify(
    input: ClassifyExclusionInput,
    options?: ClassifyExclusionCandidatesOptions,
  ): Promise<AlignGridPatternCoord[]>;
};

export type SmartExcludeProviderFrameInput = {
  frame: FrameResult | null;
};

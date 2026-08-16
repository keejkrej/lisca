import type { SmartExcludeProvider } from "../provider";
import { classifyExclusionCandidates } from "./classify-cells";

export function createBrowserSmartExcludeProvider(): SmartExcludeProvider {
  return {
    classify: (input, options) => classifyExclusionCandidates(input.frame, input.cells, options),
  };
}

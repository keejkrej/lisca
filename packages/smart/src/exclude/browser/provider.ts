import type { SmartExcludeProvider } from "../provider";
import { classifyExclusionCandidates } from "./classify-patterns";

export function createBrowserSmartExcludeProvider(): SmartExcludeProvider {
  return {
    classify: (input, options) => classifyExclusionCandidates(input.frame, input.patterns, options),
  };
}

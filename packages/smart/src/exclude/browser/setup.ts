import type { SmartModelGate } from "../../shared/model-gate";
import type { SmartExcludeProvider } from "../provider";
import { createBrowserSmartExcludeProvider } from "./provider";
import { isSmartExcludeClassifierLoaded } from "./exclude-engine";
import { isSmartExcludeModelCached } from "./exclude-model-cache";

export type BrowserSmartExcludeSetup = {
  provider: SmartExcludeProvider;
  model: SmartModelGate;
};

export function createBrowserSmartExcludeSetup(): BrowserSmartExcludeSetup {
  return {
    provider: createBrowserSmartExcludeProvider(),
    model: {
      isLoaded: isSmartExcludeClassifierLoaded,
      isCached: isSmartExcludeModelCached,
    },
  };
}
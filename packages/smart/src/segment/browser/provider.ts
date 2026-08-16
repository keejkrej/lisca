import type { SmartModelGate } from "../../shared/model-gate";
import type { SmartSegmentProvider } from "../provider";
import { getBrowserSamEngine } from "./sam-engine";
import { isSamModelCached } from "./sam-model-cache";

export type BrowserSmartSegmentSetup = {
  provider: SmartSegmentProvider;
  model: SmartModelGate;
};

export function createBrowserSmartSegmentSetup(): BrowserSmartSegmentSetup {
  const engine = getBrowserSamEngine();
  return {
    provider: {
      prepareFrame: (frame, options) => engine.prepareFrame(frame, options?.onProgress),
      segment: (points) => engine.segment(points),
      dispose: () => engine.dispose(),
    },
    model: {
      isLoaded: () => engine.isModelLoaded(),
      isCached: isSamModelCached,
    },
  };
}

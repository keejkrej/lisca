import { createDefaultAlignGrid, type FrameResult } from "@lisca/utils";
import { createRoot } from "solid-js";
import { describe, expect, it, vi } from "vitest";

import type { SmartExcludeProvider } from "./provider";
import type { SmartModelGate } from "../shared/model-gate";
import { useSmartExclude } from "./use-smart-exclude";

const frame = (pixels: number[]): FrameResult => ({
  width: pixels.length,
  height: 1,
  pixels: new Uint8Array(pixels),
});
const visibleGrid = () => ({
  ...createDefaultAlignGrid(),
  enabled: true,
  spacingA: 1,
  spacingB: 1,
  cellWidth: 1,
  cellHeight: 1,
});

describe("Smart Exclude cancel", () => {
  it("does not report an error when the user cancels the model download consent", async () => {
    const model: SmartModelGate = { isLoaded: () => false, isCached: async () => false };
    const onComplete = vi.fn();
    const onError = vi.fn();
    const onStatus = vi.fn();
    let request!: () => Promise<void>;
    let cancelDownload!: () => void;
    let downloadState!: ReturnType<typeof useSmartExclude>["downloadState"];
    createRoot((dispose) => {
      const smart = useSmartExclude({
        provider: { classify: vi.fn(async () => []) } as unknown as SmartExcludeProvider,
        model,
        frame: () => frame([1, 2, 3, 4]),
        grid: visibleGrid,
        currentExcludedCells: () => [],
        enabled: () => true,
        onComplete,
        onError,
        onStatus,
      });
      request = smart.request;
      cancelDownload = smart.cancelDownload;
      downloadState = smart.downloadState;
      return dispose;
    });

    void request();
    await vi.waitFor(() => expect(downloadState().requiresDownload).toBe(true));
    cancelDownload();
    await vi.waitFor(() => expect(onStatus).toHaveBeenCalledWith("Smart exclude cancelled"));

    // Cancelling is a user action, not an error.
    expect(onError).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("still reports real classification errors via onError", async () => {
    const classify = vi.fn(async () => {
      throw new Error("boom");
    });
    const onComplete = vi.fn();
    const onError = vi.fn();
    const onStatus = vi.fn();
    let request!: () => Promise<void>;
    createRoot((dispose) => {
      const smart = useSmartExclude({
        provider: { classify } as unknown as SmartExcludeProvider,
        frame: () => frame([1, 2, 3, 4]),
        grid: visibleGrid,
        currentExcludedCells: () => [],
        enabled: () => true,
        onComplete,
        onError,
        onStatus,
      });
      request = smart.request;
      return dispose;
    });

    await request();

    expect(onError).toHaveBeenCalledWith("boom");
    expect(onStatus).toHaveBeenCalledWith(null);
    expect(onComplete).not.toHaveBeenCalled();
  });
});

import {
  createDefaultAlignGrid,
  enumerateVisibleAlignGridCells,
  type FrameResult,
} from "@lisca/utils";
import { createRoot } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SmartExcludeProvider } from "./provider";
import type { ClassifyExclusionInput } from "./types";
import { useSmartExclude } from "./use-smart-exclude";

afterEach(() => {
  vi.useRealTimers();
});

function occupancyFrame(): FrameResult {
  return { width: 32, height: 32, pixels: new Uint8Array(32 * 32) };
}

function occupancyGrid() {
  return {
    ...createDefaultAlignGrid(),
    enabled: true,
    spacingA: 8,
    spacingB: 8,
    cellWidth: 8,
    cellHeight: 8,
  };
}

describe("occupancy correction recording", () => {
  it("persists canvas include/exclude edits and re-scores remaining sites when the pack is ready", async () => {
    vi.useFakeTimers();
    const visible = enumerateVisibleAlignGridCells(occupancyFrame(), occupancyGrid());
    expect(visible.length).toBeGreaterThan(1);
    const marked = visible[0]!;

    const calls: ClassifyExclusionInput[] = [];
    const provider: SmartExcludeProvider = {
      classify: async (input, options) => {
        calls.push(input);
        if ((input.promptExamples?.length ?? 0) > 0) {
          options?.onOccupancy?.({
            packReady: true,
            occupiedCount: 2,
            emptyCount: 2,
            engine: "promptPack",
            message: "Prompt pack ready (2 occupied, 2 empty).",
          });
          return [];
        }
        return [{ i: 1, j: 0 }];
      },
    };
    const onOccupancyRescore = vi.fn();
    let recordExclusionChange!: ReturnType<typeof useSmartExclude>["recordExclusionChange"];
    createRoot((dispose) => {
      const smart = useSmartExclude({
        provider,
        frame: occupancyFrame,
        grid: occupancyGrid,
        currentExcludedCells: () => [],
        enabled: () => true,
        workspacePath: () => "/tmp/assay",
        occupancyRescore: () => "onRecord",
        occupancyRecordDebounceMs: 0,
        onComplete: vi.fn(),
        onOccupancyRescore,
      });
      recordExclusionChange = smart.recordExclusionChange;
      return dispose;
    });

    recordExclusionChange([], [{ i: marked.i, j: marked.j }]);
    await vi.runAllTimersAsync();

    const persist = calls.find((input) => (input.promptExamples?.length ?? 0) > 0);
    expect(persist?.persistPromptPack).toBe(true);
    expect(persist?.appendPromptExamples).toBe(true);
    expect(persist?.promptExamples?.some((example) => example.label === "empty")).toBe(true);
    expect(onOccupancyRescore).toHaveBeenCalledWith([{ i: 1, j: 0 }]);
  });

  it("does not re-score on edit when occupancyRescore is onRequest", async () => {
    vi.useFakeTimers();
    const visible = enumerateVisibleAlignGridCells(occupancyFrame(), occupancyGrid());
    expect(visible.length).toBeGreaterThan(0);
    const marked = visible[0]!;

    const classify = vi.fn(
      async (_input: ClassifyExclusionInput) => [] as { i: number; j: number }[],
    );
    const provider: SmartExcludeProvider = {
      classify: async (input, options) => {
        classify(input);
        options?.onOccupancy?.({ packReady: true, occupiedCount: 2, emptyCount: 2 });
        return [];
      },
    };
    const onOccupancyRescore = vi.fn();
    let recordExclusionChange!: ReturnType<typeof useSmartExclude>["recordExclusionChange"];
    createRoot((dispose) => {
      const smart = useSmartExclude({
        provider,
        frame: occupancyFrame,
        grid: occupancyGrid,
        currentExcludedCells: () => [],
        enabled: () => true,
        workspacePath: () => "/tmp/assay",
        occupancyRescore: () => "onRequest",
        occupancyRecordDebounceMs: 0,
        onComplete: vi.fn(),
        onOccupancyRescore,
      });
      recordExclusionChange = smart.recordExclusionChange;
      return dispose;
    });

    recordExclusionChange([], [{ i: marked.i, j: marked.j }]);
    await vi.runAllTimersAsync();

    expect(classify).toHaveBeenCalledTimes(1);
    expect(onOccupancyRescore).not.toHaveBeenCalled();
  });
});

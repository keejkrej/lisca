import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import { createDefaultAlignGrid, type FrameResult } from "@lisca/utils";
import { createRoot, createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";

import { useSmartExclude } from "./exclude/use-smart-exclude";
import type { SmartExcludeProvider } from "./exclude/provider";
import type { SmartModelGate } from "./shared/model-gate";
import { useSmartSegment } from "./segment/use-smart-segment";
import type { SmartSegmentProvider } from "./segment/provider";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (cause?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

const frame = (pixels: number[]): FrameResult => ({
  width: pixels.length,
  height: 1,
  pixels: new Uint8Array(pixels),
});

const visibleGrid = (): AlignGridState => ({
  ...createDefaultAlignGrid(),
  enabled: true,
  spacingA: 1,
  spacingB: 1,
  cellWidth: 1,
  cellHeight: 1,
});

describe("Solid smart-hook lifecycle", () => {
  it("keeps Smart Exclude inputs live after the owner is created", async () => {
    const [currentFrame, setCurrentFrame] = createSignal<FrameResult | null>(null);
    const [excluded, setExcluded] = createSignal<AlignGridCellCoord[]>([]);
    const classify = vi.fn<SmartExcludeProvider["classify"]>(async ({ cells }) =>
      cells.slice(0, 1),
    );
    const onComplete = vi.fn();

    let request!: () => Promise<void>;
    const dispose = createRoot((ownerDispose) => {
      const smart = useSmartExclude({
        provider: { classify },
        frame: currentFrame,
        grid: createSignal(visibleGrid())[0],
        currentExcludedCells: excluded,
        enabled: () => currentFrame() !== null,
        onComplete,
      });
      request = smart.request;
      return ownerDispose;
    });

    setCurrentFrame(frame([1, 2, 3, 4]));
    setExcluded([{ i: 99, j: 99 }]);
    await request();

    expect(classify).toHaveBeenCalledOnce();
    expect(classify.mock.calls[0]?.[0].frame).toBe(currentFrame());
    expect(onComplete).toHaveBeenCalledOnce();
    dispose();
  });

  it("invalidates an in-flight segment when the frame changes", async () => {
    const prepared = deferred<void>();
    const firstFrame = frame([1, 2]);
    const secondFrame = frame([3, 4]);
    const [currentFrame, setCurrentFrame] = createSignal<FrameResult | null>(firstFrame);
    const onCommit = vi.fn();
    const provider: SmartSegmentProvider = {
      prepareFrame: vi.fn(() => prepared.promise),
      segment: vi.fn(async () => new Uint8Array([1, 1])),
      dispose: vi.fn(),
    };

    let handleClick!: ReturnType<typeof useSmartSegment>["handleClick"];
    let busy!: ReturnType<typeof useSmartSegment>["busy"];
    const dispose = createRoot((ownerDispose) => {
      const smart = useSmartSegment({
        provider,
        frame: currentFrame,
        tool: () => "smart",
        activeLabelValue: () => 1,
        mask: () => new Uint8Array([0, 0]),
        enabled: () => true,
        onCommit,
      });
      handleClick = smart.handleClick;
      busy = smart.busy;
      return ownerDispose;
    });
    await Promise.resolve();
    vi.mocked(provider.dispose).mockClear();

    const pending = handleClick({ x: 0, y: 0, negative: false });
    setCurrentFrame(secondFrame);
    prepared.resolve();
    await pending;

    expect(onCommit).not.toHaveBeenCalled();
    expect(busy()).toBe(false);
    expect(provider.dispose).toHaveBeenCalledOnce();
    dispose();
  });

  it("settles pending Smart Exclude consent when its owner is disposed", async () => {
    const model: SmartModelGate = {
      isLoaded: () => false,
      isCached: async () => false,
    };
    const onComplete = vi.fn();

    let ensureAndClassify!: () => Promise<AlignGridCellCoord[]>;
    let downloadState!: ReturnType<typeof useSmartExclude>["downloadState"];
    const dispose = createRoot((ownerDispose) => {
      const smart = useSmartExclude({
        provider: { classify: vi.fn(async () => []) },
        model,
        frame: () => frame([1, 2, 3, 4]),
        grid: visibleGrid,
        currentExcludedCells: () => [],
        enabled: () => true,
        onComplete,
      });
      ensureAndClassify = smart.ensureAndClassify;
      downloadState = smart.downloadState;
      return ownerDispose;
    });

    const pending = ensureAndClassify();
    await vi.waitFor(() => expect(downloadState().requiresDownload).toBe(true));
    dispose();

    await expect(pending).resolves.toEqual([]);
    expect(onComplete).not.toHaveBeenCalled();
  });
});

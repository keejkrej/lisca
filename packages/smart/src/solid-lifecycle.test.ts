import type { FrameResult } from "@lisca/utils";
import { createRoot, createSignal } from "solid-js";
import { describe, expect, it, vi } from "vite-plus/test";

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

describe("Solid smart-hook lifecycle", () => {
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

  it("preserves Smart Segment prompts across contrast updates on the same frameKey", async () => {
    const firstFrame = frame([10, 20]);
    const contrastAdjustedFrame = frame([30, 200]);
    const nextPlaneFrame = frame([5, 6]);
    const [currentFrame, setCurrentFrame] = createSignal<FrameResult | null>(firstFrame);
    const [planeKey, setPlaneKey] = createSignal<string | null>("0:0:0:0:0");
    const provider: SmartSegmentProvider = {
      prepareFrame: vi.fn(async () => undefined),
      segment: vi.fn(async () => new Uint8Array([1, 0])),
      dispose: vi.fn(),
    };

    let smart!: ReturnType<typeof useSmartSegment>;
    const dispose = createRoot((ownerDispose) => {
      smart = useSmartSegment({
        provider,
        frame: currentFrame,
        frameKey: planeKey,
        tool: () => "smart",
        activeLabelValue: () => 1,
        mask: () => new Uint8Array([0, 0]),
        enabled: () => true,
        onCommit: vi.fn(),
      });
      return ownerDispose;
    });

    await smart.handleClick({ x: 1, y: 0, negative: false });
    expect(smart.prompts()).toHaveLength(1);

    // Display-only contrast change keeps the same planeKey -> prompts stay intact.
    setCurrentFrame(contrastAdjustedFrame);
    await Promise.resolve();
    expect(smart.prompts()).toHaveLength(1);

    // Stepping to another ROI plane clears prompts.
    setPlaneKey("0:0:0:1:0");
    setCurrentFrame(nextPlaneFrame);
    await Promise.resolve();
    expect(smart.prompts()).toHaveLength(0);
    dispose();
  });
});

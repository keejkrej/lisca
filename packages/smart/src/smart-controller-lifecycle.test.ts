import type { FrameResult } from "@lisca/utils";
import { describe, expect, it, vi } from "vite-plus/test";

import { createSmartSegmentController } from "./segment/smart-segment-controller";
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

describe("Smart segment controller lifecycle", () => {
  it("invalidates an in-flight segment when the frame changes", async () => {
    const prepared = deferred<void>();
    const firstFrame = frame([1, 2]);
    const secondFrame = frame([3, 4]);
    const onCommit = vi.fn();
    const provider: SmartSegmentProvider = {
      prepareFrame: vi.fn(() => prepared.promise),
      segment: vi.fn(async () => new Uint8Array([1, 1])),
      dispose: vi.fn(),
    };

    const base = {
      tool: "smart",
      activeLabelValue: 1,
      mask: new Uint8Array([0, 0]),
      enabled: true,
    };

    const controller = createSmartSegmentController({
      provider,
      initialContext: { ...base, frame: firstFrame },
      onCommit,
    });

    const pending = controller.handleClick({ x: 0, y: 0, negative: false });
    controller.sync({ ...base, frame: secondFrame });
    prepared.resolve();
    await pending;

    expect(onCommit).not.toHaveBeenCalled();
    expect(controller.getState().busy).toBe(false);
    expect(provider.dispose).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it("preserves Smart Segment prompts across contrast updates on the same frameKey", async () => {
    const firstFrame = frame([10, 20]);
    const contrastAdjustedFrame = frame([30, 200]);
    const nextPlaneFrame = frame([5, 6]);
    const provider: SmartSegmentProvider = {
      prepareFrame: vi.fn(async () => undefined),
      segment: vi.fn(async () => new Uint8Array([1, 0])),
      dispose: vi.fn(),
    };

    const base = {
      tool: "smart",
      activeLabelValue: 1,
      mask: new Uint8Array([0, 0]),
      enabled: true,
    };

    const controller = createSmartSegmentController({
      provider,
      initialContext: { ...base, frame: firstFrame, frameKey: "0:0:0:0:0" },
      onCommit: vi.fn(),
    });

    await controller.handleClick({ x: 1, y: 0, negative: false });
    expect(controller.getState().prompts).toHaveLength(1);

    // Display-only contrast change keeps the same planeKey -> prompts stay intact.
    controller.sync({ ...base, frame: contrastAdjustedFrame, frameKey: "0:0:0:0:0" });
    expect(controller.getState().prompts).toHaveLength(1);

    // Stepping to another ROI plane clears prompts.
    controller.sync({ ...base, frame: nextPlaneFrame, frameKey: "0:0:0:1:0" });
    expect(controller.getState().prompts).toHaveLength(0);
    controller.dispose();
  });
});

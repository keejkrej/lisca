import { describe, expect, it, vi } from "vite-plus/test";

import { createCanvasResourceTransaction } from "../src/canvas-resource-transaction";

describe("createCanvasResourceTransaction", () => {
  it("runs start synchronously, then commits and settles on resolve", async () => {
    const transact = createCanvasResourceTransaction();
    const order: string[] = [];
    let receivedSignal: AbortSignal | undefined;

    transact({
      start: () => order.push("start"),
      load: async (signal) => {
        receivedSignal = signal;
        order.push("load");
        return "frame-1";
      },
      commit: (value) => order.push(`commit:${value}`),
      reject: () => order.push("reject"),
      settle: () => order.push("settle"),
    });

    expect(order).toEqual(["start", "load"]);
    expect(receivedSignal?.aborted).toBe(false);

    await vi.waitFor(() => {
      expect(order).toEqual(["start", "load", "commit:frame-1", "settle"]);
    });
  });

  it("calls reject and settle when load fails", async () => {
    const transact = createCanvasResourceTransaction();
    const commit = vi.fn();
    const reject = vi.fn();
    const settle = vi.fn();
    const boom = new Error("load failed");

    transact({
      load: async () => {
        throw boom;
      },
      commit,
      reject,
      settle,
    });

    await vi.waitFor(() => {
      expect(settle).toHaveBeenCalledOnce();
    });

    expect(commit).not.toHaveBeenCalled();
    expect(reject).toHaveBeenCalledWith(boom);
  });

  it("aborts the signal and ignores stale callbacks when cancelled", async () => {
    const transact = createCanvasResourceTransaction();
    let resolveLoad!: (value: string) => void;
    let signalRef!: AbortSignal;
    const commit = vi.fn();
    const reject = vi.fn();
    const settle = vi.fn();

    const cancel = transact({
      load: (signal) => {
        signalRef = signal;
        return new Promise<string>((resolve) => {
          resolveLoad = resolve;
        });
      },
      commit,
      reject,
      settle,
    });

    expect(signalRef.aborted).toBe(false);
    cancel();
    expect(signalRef.aborted).toBe(true);

    resolveLoad("stale");
    await Promise.resolve();
    await Promise.resolve();

    expect(commit).not.toHaveBeenCalled();
    expect(reject).not.toHaveBeenCalled();
    expect(settle).not.toHaveBeenCalled();
  });

  it("supersedes earlier in-flight transactions when a new one starts", async () => {
    const transact = createCanvasResourceTransaction();
    let resolveFirst!: (value: string) => void;
    let resolveSecond!: (value: string) => void;
    const commit = vi.fn();
    const settle = vi.fn();

    transact({
      load: () =>
        new Promise<string>((resolve) => {
          resolveFirst = resolve;
        }),
      commit,
      reject: vi.fn(),
      settle,
    });

    transact({
      load: () =>
        new Promise<string>((resolve) => {
          resolveSecond = resolve;
        }),
      commit,
      reject: vi.fn(),
      settle,
    });

    resolveFirst("stale");
    resolveSecond("fresh");

    await vi.waitFor(() => {
      expect(settle).toHaveBeenCalledOnce();
    });

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith("fresh");
  });
});

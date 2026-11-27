import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { createCanvasTransientStatus } from "../src/canvas-transient-status";

describe("createCanvasTransientStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears when status becomes null and notifies subscribers", () => {
    const controller = createCanvasTransientStatus({ initialStatus: "Loading" });
    const listener = vi.fn();
    controller.subscribe(listener);

    expect(controller.getVisibleStatus()).toBe("Loading");
    controller.setStatus(null);
    expect(controller.getVisibleStatus()).toBeNull();
    expect(listener).toHaveBeenCalledWith(null);

    controller.dispose();
  });

  it("hides transient status after timeout", () => {
    const controller = createCanvasTransientStatus({ initialStatus: "Saved" });
    const listener = vi.fn();
    controller.subscribe(listener);

    expect(controller.getVisibleStatus()).toBe("Saved");
    vi.advanceTimersByTime(2500);
    expect(controller.getVisibleStatus()).toBeNull();
    expect(listener).toHaveBeenCalledWith(null);

    controller.dispose();
  });

  it("keeps persistent statuses visible", () => {
    const controller = createCanvasTransientStatus({
      hideAfterMs: 1000,
      persistentStatuses: ["Pinned"],
      initialStatus: "Pinned",
    });

    vi.advanceTimersByTime(2000);
    expect(controller.getVisibleStatus()).toBe("Pinned");

    controller.dispose();
  });

  it("cancels pending auto-hide timers on dispose", () => {
    const controller = createCanvasTransientStatus({ hideAfterMs: 500 });
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.setStatus("Saved");
    expect(listener).toHaveBeenCalledWith("Saved");
    listener.mockClear();

    controller.dispose();
    vi.advanceTimersByTime(1000);
    expect(listener).not.toHaveBeenCalled();
  });
});

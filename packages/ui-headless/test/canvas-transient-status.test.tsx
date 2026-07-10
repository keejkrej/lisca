import { createSignal } from "solid-js";
import { render } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCanvasTransientStatus } from "../src/canvas-transient-status";

function mountTransientStatus(initialStatus: string | null) {
  const [status, setStatus] = createSignal(initialStatus);
  let visible: (() => string | null) | undefined;
  render(() => {
    visible = useCanvasTransientStatus(status);
    return null;
  });
  return { visible: () => visible!(), setStatus };
}

describe("useCanvasTransientStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears when status becomes null", () => {
    const harness = mountTransientStatus("Loading");
    expect(harness.visible()).toBe("Loading");
    harness.setStatus(null);
    expect(harness.visible()).toBeNull();
  });

  it("hides transient status after timeout", () => {
    const harness = mountTransientStatus("Saved");
    expect(harness.visible()).toBe("Saved");
    vi.advanceTimersByTime(2500);
    expect(harness.visible()).toBeNull();
  });

  it("keeps persistent statuses visible", () => {
    const [status] = createSignal("Pinned");
    let visible: (() => string | null) | undefined;
    render(() => {
      visible = useCanvasTransientStatus(status, {
        hideAfterMs: 1000,
        persistentStatuses: ["Pinned"],
      });
      return null;
    });
    vi.advanceTimersByTime(2000);
    expect(visible!()).toBe("Pinned");
  });
});
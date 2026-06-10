import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCanvasTransientStatus } from "../src/canvas-transient-status";

describe("useCanvasTransientStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears when status becomes null", () => {
    const { result, rerender } = renderHook(({ status }) => useCanvasTransientStatus(status), {
      initialProps: { status: "Loading" as string | null },
    });
    rerender({ status: null });
    expect(result.current).toBeNull();
  });

  it("hides transient status after timeout", () => {
    const { result } = renderHook(() => useCanvasTransientStatus("Saved", { hideAfterMs: 1000 }));
    expect(result.current).toBe("Saved");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBeNull();
  });

  it("keeps persistent statuses visible", () => {
    const { result } = renderHook(() =>
      useCanvasTransientStatus("Pinned", {
        hideAfterMs: 1000,
        persistentStatuses: ["Pinned"],
      }),
    );
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe("Pinned");
  });
});

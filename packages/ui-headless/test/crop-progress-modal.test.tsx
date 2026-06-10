import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useCropProgressModal } from "../src/crop-progress-modal";

describe("useCropProgressModal", () => {
  it("returns null when progress is done", () => {
    const { result } = renderHook(() =>
      useCropProgressModal({
        status: "completed",
        message: "Finished",
        completedPositions: 3,
        totalPositions: 3,
        completedRois: 0,
        totalRois: 0,
      }),
    );
    expect(result.current).toBeNull();
  });

  it("derives progress state from roi counts", () => {
    const { result } = renderHook(() =>
      useCropProgressModal({
        status: "running",
        message: "Cropping",
        completedPositions: 0,
        totalPositions: 0,
        completedRois: 2,
        totalRois: 4,
      }),
    );
    expect(result.current).toEqual({
      visible: true,
      done: 2,
      total: 4,
      pct: 50,
      message: "Cropping",
    });
  });
});

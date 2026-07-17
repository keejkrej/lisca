import type { CropRoiProgress } from "@lisca/contracts";
import { Effect } from "effect";
import { describe, expect, test, vi } from "vitest";

import { pollProgressLoop } from "../src/session/progress-poll";

describe("pollProgressLoop", () => {
  test("stops polling after teardown", async () => {
    vi.useFakeTimers();
    const runningProgress: CropRoiProgress = {
      requestId: "req-3",
      status: "running",
      position: 1,
      completedPositions: 0,
      totalPositions: 1,
      completedRois: 0,
      totalRois: 0,
      message: null,
      error: null,
    };
    const pollProgress = vi.fn(() => Effect.succeed(runningProgress));

    const stop = pollProgressLoop({
      pollProgress,
      onProgress: () => {},
      isTerminal: () => false,
      createErrorProgress: (): CropRoiProgress => ({
        requestId: "req-3",
        status: "error",
        position: null,
        completedPositions: 0,
        totalPositions: 0,
        completedRois: 0,
        totalRois: 0,
        message: null,
        error: "failed",
      }),
      pollIntervalMs: 100,
      schedule: (callback, delayMs) => setTimeout(callback, delayMs) as unknown as number,
      clearSchedule: (handle) => clearTimeout(handle),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(pollProgress).toHaveBeenCalledTimes(1);
    stop();
    await vi.advanceTimersByTimeAsync(300);
    expect(pollProgress).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

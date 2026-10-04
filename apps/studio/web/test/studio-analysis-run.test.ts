import type { AnalysisProgress } from "@lisca/contracts";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  claimStudioAnalysisRun,
  releaseStudioAnalysisRun,
  resetStudioAnalysisRunForTests,
  runStudioAnalysis,
  scheduleStudioAnalysis,
  studioAnalysisRunActive,
  type StudioAnalysisRunDeps,
} from "../src/state/studio-analysis-run";

function stageFor(status: AnalysisProgress["status"]): AnalysisProgress["stage"] {
  if (status === "running") return "preparing";
  if (status === "error") return "queued";
  return status;
}

function progress(
  requestId: string,
  status: AnalysisProgress["status"],
): AnalysisProgress {
  return {
    requestId,
    status,
    stage: stageFor(status),
    progress: status === "completed" ? 1 : 0,
    message: status,
    resultFiles: [],
    error: status === "error" ? "failed" : null,
  };
}

function deps(overrides: Partial<StudioAnalysisRunDeps> = {}): StudioAnalysisRunDeps {
  return {
    token: 1,
    workspacePath: "/data/ws",
    assayJson: { name: "TF84" } as StudioAnalysisRunDeps["assayJson"],
    saveAssayJson: vi.fn(async () => undefined),
    startAnalysis: vi.fn(async (input) => progress(input.requestId, "running")),
    subscribe: vi.fn(() => () => undefined),
    setAnalysisProgress: vi.fn(),
    setAnalysisRequestId: vi.fn(),
    setAnalysisResultFiles: vi.fn(),
    setStatus: vi.fn(),
    markAssaySaved: vi.fn(),
    toErrorMessage: (cause, fallback) => (cause instanceof Error ? cause.message : fallback),
    now: () => 1,
    random: () => "id",
    ...overrides,
  };
}

describe("studio analysis run", () => {
  beforeEach(() => resetStudioAnalysisRunForTests());

  it("navigates before the run starts", async () => {
    const order: string[] = [];
    const scheduled = scheduleStudioAnalysis({
      navigate: () => {
        order.push("navigate");
        return Promise.resolve();
      },
      start: () => order.push("start"),
      onNavigateError: () => order.push("error"),
    });
    expect(scheduled).toBe(true);
    expect(order).toEqual(["navigate"]);
    await Promise.resolve();
    expect(order).toEqual(["navigate", "start"]);
  });

  it("starts analysis after a slow save without a caller cancel", async () => {
    const token = claimStudioAnalysisRun();
    expect(token).not.toBeNull();
    let resolveSave: () => void = () => {};
    const saveAssayJson = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const startAnalysis = vi.fn(async (input: { requestId: string }) =>
      progress(input.requestId, "completed"),
    );
    const run = runStudioAnalysis(
      deps({
        token: token!,
        saveAssayJson,
        startAnalysis,
      }),
    );
    await Promise.resolve();
    expect(startAnalysis).not.toHaveBeenCalled();
    expect(studioAnalysisRunActive()).toBe(true);
    resolveSave();
    await run;
    expect(startAnalysis).toHaveBeenCalledOnce();
    expect(studioAnalysisRunActive()).toBe(false);
  });

  it("keeps the subscription after the caller would have unmounted", async () => {
    const token = claimStudioAnalysisRun();
    let emit: (progress: AnalysisProgress) => void = () => {};
    const stop = vi.fn();
    const run = runStudioAnalysis(
      deps({
        token: token!,
        subscribe: (_requestId, onProgress) => {
          emit = onProgress;
          return stop;
        },
      }),
    );
    await run;
    expect(studioAnalysisRunActive()).toBe(true);
    emit(progress("studio-analysis-1-id", "completed"));
    expect(stop).toHaveBeenCalledOnce();
    expect(studioAnalysisRunActive()).toBe(false);
  });

  it("releases a claim when navigation throws before the run", () => {
    const token = claimStudioAnalysisRun();
    expect(token).not.toBeNull();
    const scheduled = scheduleStudioAnalysis({
      navigate: () => {
        throw new Error("router down");
      },
      start: () => {
        throw new Error("should not start");
      },
      onNavigateError: () => undefined,
    });
    expect(scheduled).toBe(false);
    releaseStudioAnalysisRun(token!);
    expect(studioAnalysisRunActive()).toBe(false);
  });
});

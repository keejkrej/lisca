import type { CropRoiProgress } from "@lisca/contracts";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  onCropRoiProgress: vi.fn(),
}));

vi.mock("../src/api/studio-port", () => ({
  studioClient: {
    onCropRoiProgress: mocks.onCropRoiProgress,
  },
}));

import {
  bindStudioCropRefresh,
  bindStudioCropSettled,
  watchStudioCrop,
} from "../src/state/studio-crop-watch";

function progress(status: CropRoiProgress["status"]): CropRoiProgress {
  return {
    requestId: "crop-9",
    status,
    position: null,
    completedPositions: status === "completed" ? 1 : 0,
    totalPositions: 1,
    completedRois: status === "completed" ? 1 : 0,
    totalRois: 1,
    message: status,
  };
}

describe("watchStudioCrop", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("publishes a finished crop after Align has unmounted", () => {
    let listener: ((progress: CropRoiProgress) => void) | undefined;
    mocks.onCropRoiProgress.mockImplementation(
      (_requestId: string, onProgress: typeof listener) => {
        listener = onProgress;
        return () => {};
      },
    );
    const settled: Array<{ status: CropRoiProgress["status"]; workspacePath: string }> = [];
    const release = bindStudioCropSettled((next, workspacePath) =>
      settled.push({ status: next.status, workspacePath }),
    );

    watchStudioCrop("crop-9", "/data/second-assay");
    listener?.(progress("running"));
    listener?.(progress("completed"));

    expect(settled).toEqual([{ status: "completed", workspacePath: "/data/second-assay" }]);
    release();
  });

  it("reloads ROI after a failed crop so successful positions stay usable", () => {
    let listener: ((progress: CropRoiProgress) => void) | undefined;
    mocks.onCropRoiProgress.mockImplementation(
      (_requestId: string, onProgress: typeof listener) => {
        listener = onProgress;
        return () => {};
      },
    );
    const refreshed: string[] = [];
    const releaseRefresh = bindStudioCropRefresh((workspacePath) => refreshed.push(workspacePath));
    const releaseSettled = bindStudioCropSettled(() => {});

    watchStudioCrop("crop-9", "/data/second-assay");
    listener?.({
      ...progress("error"),
      completedPositions: 5,
      totalPositions: 6,
      error: "Zugriff verweigert (os error 5)",
    });

    expect(refreshed).toEqual(["/data/second-assay"]);
    releaseRefresh();
    releaseSettled();
  });
});

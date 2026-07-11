import type { CropRoiProgress, CropRoiRequest } from "@lisca/contracts";
import { configureLiscaStorage, type LiscaStorageAdapter } from "@lisca/storage";
import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { cropRequestIdForCancellation, runCropRoi } from "../src/session/align-session";
import {
  acknowledgeCropRecovery,
  readCropRecovery,
  rememberCropRecovery,
} from "../src/session/crop-recovery";
import { resumeCropPendingRun } from "../src/session/resume-pending-runs";
import { createSubscriptionOwner } from "../src/session/subscription-owner";

function memoryStorage(): LiscaStorageAdapter {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: (key) => items.delete(key),
  };
}

const request: CropRoiRequest = {
  requestId: "provisional",
  workspacePath: "/data/workspace",
  source: { kind: "folder", path: "/data/source" },
  positions: [1],
  overwrite: false,
  outputFormat: "tiff",
};

function progress(
  requestId: string,
  status: CropRoiProgress["status"] = "running",
): CropRoiProgress {
  return {
    requestId,
    status,
    position: 1,
    completedPositions: status === "completed" ? 1 : 0,
    totalPositions: 1,
    completedRois: status === "completed" ? 10 : 2,
    totalRois: 10,
    message: status,
  };
}

describe("crop recovery", () => {
  beforeEach(() => configureLiscaStorage({ local: memoryStorage() }));

  it("polls the authoritative existing request when submission attaches", async () => {
    let subscribedRequestId: string | null = null;
    const onProgress = vi.fn();

    await runCropRoi({
      client: {
        cropRoi: () =>
          Effect.succeed({
            requestId: "existing",
            status: "running" as const,
            disposition: "attached" as const,
          }),
        onCropRoiProgress: (requestId) => {
          subscribedRequestId = requestId;
          return () => {};
        },
      },
      request,
      serverIdentity: "http://server:8767",
      onProgress,
      onError: vi.fn(),
      onCompleted: vi.fn(),
      toErrorMessage: String,
    });

    expect(subscribedRequestId).toBe("existing");
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ requestId: "existing" }));
    expect(readCropRecovery("http://server:8767", request.workspacePath)).toEqual({
      requestId: "existing",
      terminalAcknowledged: false,
    });
  });

  it("keeps live completion callbacks and acknowledges their terminal result", async () => {
    let emitProgress!: (progress: CropRoiProgress) => void;
    const onCompleted = vi.fn();
    const stop = await runCropRoi({
      client: {
        cropRoi: () =>
          Effect.succeed({
            requestId: "live-job",
            status: "queued" as const,
            disposition: "started" as const,
          }),
        onCropRoiProgress: (_requestId, listener) => {
          emitProgress = listener;
          return vi.fn();
        },
      },
      request,
      serverIdentity: "local",
      onProgress: vi.fn(),
      onError: vi.fn(),
      onCompleted,
      toErrorMessage: String,
    });

    const completed = progress("live-job", "completed");
    emitProgress(completed);
    expect(onCompleted).toHaveBeenCalledWith(completed);
    expect(readCropRecovery("local", request.workspacePath)).toEqual({
      requestId: "live-job",
      terminalAcknowledged: true,
    });
    stop();
  });

  it("restores active jobs even without prior local metadata", async () => {
    const stop = vi.fn();
    const latest = progress("server-job");
    const onProgress = vi.fn();
    const result = await resumeCropPendingRun({
      client: {
        getLatestCropProgress: () => Effect.succeed(latest),
        onCropRoiProgress: (requestId) => {
          expect(requestId).toBe("server-job");
          return stop;
        },
      },
      serverIdentity: "local",
      workspacePath: request.workspacePath,
      onProgress,
    });

    expect(result).toEqual({ kind: "active", progress: latest, stop });
    expect(onProgress).toHaveBeenCalledWith(latest);
    expect(readCropRecovery("local", request.workspacePath)?.requestId).toBe("server-job");
  });

  it("acknowledges an active restored job when its subscription reaches terminal", async () => {
    let emitProgress!: (progress: CropRoiProgress) => void;
    const onTerminal = vi.fn();
    await resumeCropPendingRun({
      client: {
        getLatestCropProgress: () => Effect.succeed(progress("restored-job")),
        onCropRoiProgress: (_requestId, listener) => {
          emitProgress = listener;
          return () => {};
        },
      },
      serverIdentity: "local",
      workspacePath: request.workspacePath,
      onProgress: vi.fn(),
      onTerminal,
    });

    const completed = progress("restored-job", "completed");
    emitProgress(completed);
    expect(onTerminal).toHaveBeenCalledWith(completed);
    expect(readCropRecovery("local", request.workspacePath)?.terminalAcknowledged).toBe(true);
  });

  it("cancels by the active progress request ID, including restored jobs", () => {
    expect(cropRequestIdForCancellation(progress("restored-job"))).toBe("restored-job");
    expect(cropRequestIdForCancellation(progress("finished-job", "completed"))).toBeNull();
    expect(cropRequestIdForCancellation(null)).toBeNull();
  });

  it("returns known terminal jobs once without subscribing", async () => {
    rememberCropRecovery("local", request.workspacePath, "finished-job");
    const latest = progress("finished-job", "completed");
    const subscribe = vi.fn();
    const options = {
      client: {
        getLatestCropProgress: () => Effect.succeed(latest),
        onCropRoiProgress: subscribe,
      },
      serverIdentity: "local",
      workspacePath: request.workspacePath,
      onProgress: vi.fn(),
    };

    expect(await resumeCropPendingRun(options)).toEqual({
      kind: "terminal",
      progress: latest,
      acknowledged: false,
    });
    acknowledgeCropRecovery("local", request.workspacePath, "finished-job");
    expect(await resumeCropPendingRun(options)).toEqual({
      kind: "terminal",
      progress: latest,
      acknowledged: true,
    });
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("stops the previous subscription and closes a stale async attachment", async () => {
    const owner = createSubscriptionOwner();
    const firstStop = vi.fn();
    await owner.replace(async () => firstStop);

    let resolveLate!: (stop: () => void) => void;
    const lateStop = vi.fn();
    const late = owner.replace(() => new Promise<() => void>((resolve) => (resolveLate = resolve)));
    const currentStop = vi.fn();
    await owner.replace(async () => currentStop);
    resolveLate(lateStop);
    await late;

    expect(firstStop).toHaveBeenCalledOnce();
    expect(lateStop).toHaveBeenCalledOnce();
    expect(currentStop).not.toHaveBeenCalled();
    owner.clear();
    expect(currentStop).toHaveBeenCalledOnce();
  });
});

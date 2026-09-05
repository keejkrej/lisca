import type { AnalysisProgress, CropRoiProgress } from "@lisca/contracts";
import { configureLiscaStorage, type LiscaStorageAdapter } from "@lisca/utils";
import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientError } from "../src/infra/client-error";
import { resumeStudioPendingRuns } from "../src/session/resume-pending-runs";
import { createSubscriptionOwner } from "../src/session/subscription-owner";

function createMemoryStorage(): LiscaStorageAdapter {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

function cropProgress(
  requestId: string,
  status: CropRoiProgress["status"] = "running",
): CropRoiProgress {
  return {
    requestId,
    status,
    position: 1,
    completedPositions: 0,
    totalPositions: 1,
    completedRois: 0,
    totalRois: 1,
    message: status,
  };
}

function analysisProgress(requestId: string): AnalysisProgress {
  return {
    requestId,
    status: "running",
    stage: "queued",
    progress: 0,
    message: null,
    error: null,
  };
}

type StudioClient = Parameters<typeof resumeStudioPendingRuns>[0]["client"];

function createClient(overrides: Partial<StudioClient> = {}): StudioClient {
  return {
    getLatestCropProgress: () => Effect.succeed(cropProgress("active-crop")),
    onCropRoiProgress: () => () => {},
    getLatestAnalysisProgress: () => Effect.succeed(analysisProgress("active-analysis")),
    onAnalysisProgress: () => () => {},
    ...overrides,
  };
}

describe("resumeStudioPendingRuns - partial-failure cleanup", () => {
  beforeEach(() => {
    configureLiscaStorage({
      local: createMemoryStorage(),
      session: createMemoryStorage(),
    });
  });

  it("tears down the already-started crop subscription when analysis resume rejects", async () => {
    const cropStop = vi.fn();

    await resumeStudioPendingRuns({
      client: createClient({
        onCropRoiProgress: () => cropStop,
        getLatestAnalysisProgress: () => Effect.fail(new ClientError({ message: "boom" })),
      }),
      serverIdentity: "local",
      workspacePath: "/data/workspace",
      onCropProgress: vi.fn(),
      onRestoredCropTerminal: vi.fn(),
      onAnalysisProgress: vi.fn(),
    }).then(
      () => {},
      () => {},
    );

    expect(cropStop).toHaveBeenCalledOnce();
  });

  it("re-throws the analysis resume error after cleaning up partial subscriptions", async () => {
    const cropStop = vi.fn();
    const error = new ClientError({ message: "boom" });

    const result = resumeStudioPendingRuns({
      client: createClient({
        onCropRoiProgress: () => cropStop,
        getLatestAnalysisProgress: () => Effect.fail(error),
      }),
      serverIdentity: "local",
      workspacePath: "/data/workspace",
      onCropProgress: vi.fn(),
      onRestoredCropTerminal: vi.fn(),
      onAnalysisProgress: vi.fn(),
    });

    await expect(result).rejects.toBe(error);
    expect(cropStop).toHaveBeenCalledOnce();
  });

  it("lets the subscription owner cancel the crop poll after a failed analysis resume", async () => {
    const cropStop = vi.fn();
    const owner = createSubscriptionOwner();

    await owner
      .replace(() =>
        resumeStudioPendingRuns({
          client: createClient({
            onCropRoiProgress: () => cropStop,
            getLatestAnalysisProgress: () => Effect.fail(new ClientError({ message: "boom" })),
          }),
          serverIdentity: "local",
          workspacePath: "/data/workspace",
          onCropProgress: vi.fn(),
          onRestoredCropTerminal: vi.fn(),
          onAnalysisProgress: vi.fn(),
        }),
      )
      .then(
        () => {},
        () => {},
      );

    await owner.replace(async () => () => {});

    expect(cropStop).toHaveBeenCalledOnce();
  });

  it("control: tears down both crop and analysis stops on a subsequent replace", async () => {
    const cropStop = vi.fn();
    const analysisStop = vi.fn();
    const owner = createSubscriptionOwner();

    await owner.replace(() =>
      resumeStudioPendingRuns({
        client: createClient({
          onCropRoiProgress: () => cropStop,
          onAnalysisProgress: () => analysisStop,
        }),
        serverIdentity: "local",
        workspacePath: "/data/workspace",
        onCropProgress: vi.fn(),
        onRestoredCropTerminal: vi.fn(),
        onAnalysisProgress: vi.fn(),
      }),
    );

    await owner.replace(async () => () => {});

    expect(cropStop).toHaveBeenCalledOnce();
    expect(analysisStop).toHaveBeenCalledOnce();
  });
});

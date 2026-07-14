import type { OperationSummary } from "@lisca/contracts";
import type { TaskCenterGateway } from "@lisca/ui-headless/task-center";
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createTaskCenterGateway,
  subscribeTaskCenterOperations,
} from "../src/session/task-center";
import type { TaskDataPort } from "../src/ports/types";

const operation: OperationSummary = {
  operationId: "operation-1",
  kind: "crop-roi",
  workspaceId: "workspace-1",
  workspacePath: "/workspace",
  mutating: true,
  status: "running",
  attention: "none",
  progress: {
    total: 1,
    queued: 0,
    blocked: 0,
    running: 1,
    completed: 0,
    failed: 0,
    cancelled: 0,
    cancellationRequested: 0,
  },
  createdAtMs: 1,
  updatedAtMs: 2,
};

afterEach(() => {
  vi.useRealTimers();
});

describe("Task Center client IO", () => {
  it("adapts the Effect task port without bypassing typed client IO", async () => {
    const detail = { operation, tasks: [] };
    const port: TaskDataPort = {
      listOperations: () => Effect.succeed([operation]),
      getOperation: () => Effect.succeed(detail),
      getTask: () => Effect.die("not used"),
      cancelOperation: () => Effect.succeed(detail),
      cancelTask: () => Effect.succeed(detail),
      retryTask: () => Effect.succeed(detail),
    };

    const gateway = createTaskCenterGateway(port);
    await expect(gateway.listOperations()).resolves.toEqual([operation]);
    await expect(gateway.cancelOperation("operation-1")).resolves.toEqual(detail);
  });

  it("keeps the last good view through a poll error and recovers on the next snapshot", async () => {
    vi.useFakeTimers();
    const listOperations = vi
      .fn<TaskCenterGateway["listOperations"]>()
      .mockResolvedValueOnce([operation])
      .mockRejectedValueOnce(new Error("server restarting"))
      .mockResolvedValueOnce([{ ...operation, status: "completed" }]);
    const snapshots: readonly OperationSummary[][] = [];
    const errors: unknown[] = [];

    const stop = subscribeTaskCenterOperations({
      gateway: { listOperations },
      onSnapshot: (snapshot) => snapshots.push(snapshot),
      onError: (error) => errors.push(error),
      pollIntervalMs: 100,
    });

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);

    expect(snapshots).toEqual([[operation], [{ ...operation, status: "completed" }]]);
    expect(errors).toHaveLength(1);
    stop();
    await vi.advanceTimersByTimeAsync(500);
    expect(listOperations).toHaveBeenCalledTimes(3);
  });
});

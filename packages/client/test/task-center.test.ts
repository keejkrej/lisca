import type { TaskSummary } from "@lisca/contracts";
import type { TaskCenterGateway } from "@lisca/utils";
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createTaskCenterGateway, subscribeTaskCenterTasks } from "../src/session/task-center";
import type { TaskDataPort } from "../src/ports/types";

const task: TaskSummary = {
  taskId: "task-1",
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
  it("adapts the Effect step port without bypassing typed client IO", async () => {
    const detail = { task, steps: [] };
    const port: TaskDataPort = {
      listTasks: () => Effect.succeed([task]),
      getTask: () => Effect.succeed(detail),
      getStep: () => Effect.die("not used"),
      cancelTask: () => Effect.succeed(detail),
      cancelStep: () => Effect.succeed(detail),
      retryStep: () => Effect.succeed(detail),
    };

    const gateway = createTaskCenterGateway(port);
    await expect(gateway.listTasks()).resolves.toEqual([task]);
    await expect(gateway.cancelTask("task-1")).resolves.toEqual(detail);
  });

  it("keeps the last good view through a poll error and recovers on the next snapshot", async () => {
    vi.useFakeTimers();
    const listTasks = vi
      .fn<TaskCenterGateway["listTasks"]>()
      .mockResolvedValueOnce([task])
      .mockRejectedValueOnce(new Error("server restarting"))
      .mockResolvedValueOnce([{ ...task, status: "completed" }]);
    const snapshots: (readonly TaskSummary[])[] = [];
    const errors: unknown[] = [];

    const stop = subscribeTaskCenterTasks({
      gateway: { listTasks },
      onSnapshot: (snapshot) => snapshots.push(snapshot),
      onError: (error) => errors.push(error),
      pollIntervalMs: 100,
    });

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);

    expect(snapshots).toEqual([[task], [{ ...task, status: "completed" }]]);
    expect(errors).toHaveLength(1);
    stop();
    await vi.advanceTimersByTimeAsync(500);
    expect(listTasks).toHaveBeenCalledTimes(3);
  });
});

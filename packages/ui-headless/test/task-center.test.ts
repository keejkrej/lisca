import type { OperationDetail, OperationSummary, TaskDetail } from "@lisca/contracts";
import { describe, expect, it } from "vitest";

import {
  canCancelOperation,
  canCancelTask,
  canRetryTask,
  deriveOperationProgress,
  deriveTaskCenterIndicator,
  initialTaskCenterState,
  reconcileTaskCenterDetail,
  reconcileTaskCenterSnapshot,
} from "../src/task-center";

function summary(
  operationId: string,
  status: OperationSummary["status"],
  updatedAtMs: number,
  progress: Partial<OperationSummary["progress"]> = {},
): OperationSummary {
  return {
    operationId,
    kind: "crop-roi",
    workspaceId: "workspace-1",
    workspacePath: "/data/experiment-one",
    mutating: true,
    status,
    attention: progress.failed ? "error" : "none",
    progress: {
      total: 4,
      queued: 0,
      blocked: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      cancellationRequested: 0,
      ...progress,
    },
    createdAtMs: 1,
    updatedAtMs,
  };
}

function task(status: TaskDetail["status"], blocked = false): TaskDetail {
  return {
    taskId: "task-1",
    operationId: "operation-1",
    taskKind: "crop-position-1",
    workspaceId: "workspace-1",
    status,
    weight: 1,
    enqueueOrder: 0,
    dependencies: blocked ? ["task-0"] : [],
    blockedBy: blocked
      ? [{ taskId: "task-0", taskKind: "crop-position-0", status: "failed", error: null }]
      : [],
    attempts: [],
  };
}

describe("Task Center headless state", () => {
  it("orders active work before newest terminal history and derives attention", () => {
    const state = reconcileTaskCenterSnapshot(initialTaskCenterState, [
      summary("completed-new", "completed", 40, { completed: 4 }),
      summary("running-old", "running", 10, { running: 1, completed: 2 }),
      summary("failed-newest", "failed", 50, { failed: 1, blocked: 3 }),
      summary("queued-new", "queued", 30, { queued: 4 }),
    ]);

    expect(state.operations.map((operation) => operation.operationId)).toEqual([
      "queued-new",
      "running-old",
      "failed-newest",
      "completed-new",
    ]);
    expect(deriveTaskCenterIndicator(state.operations)).toEqual({
      activeCount: 2,
      attentionCount: 1,
      tone: "attention",
    });
  });

  it.each([
    ["queued", true],
    ["running", true],
    ["cancellation-requested", false],
    ["partially-complete", false],
    ["completed", false],
    ["failed", false],
    ["cancelled", false],
  ] as const)("derives operation cancel for %s", (status, expected) => {
    expect(canCancelOperation(summary("operation-1", status, 1))).toBe(expected);
  });

  it("derives task cancel and dependency-safe retry actions", () => {
    expect(canCancelTask(task("running"))).toBe(true);
    expect(canCancelTask(task("blocked"))).toBe(true);
    expect(canCancelTask(task("completed"))).toBe(false);
    expect(canRetryTask(task("failed"))).toBe(true);
    expect(canRetryTask(task("cancelled"))).toBe(true);
    expect(canRetryTask(task("failed", true))).toBe(false);
  });

  it("derives bounded progress without counting attempts as logical tasks", () => {
    const operation = summary("operation-1", "partially-complete", 1, {
      completed: 2,
      running: 1,
      failed: 1,
    });
    expect(deriveOperationProgress(operation)).toEqual({
      completed: 2,
      settled: 3,
      total: 4,
      completedPercent: 50,
      runningPercent: 25,
      failedPercent: 25,
      cancelledPercent: 0,
    });
  });

  it("reconciles command/detail updates immediately and later snapshots canonically", () => {
    const before = reconcileTaskCenterSnapshot(initialTaskCenterState, [
      summary("operation-1", "running", 1, { running: 1, queued: 3 }),
    ]);
    const detail: OperationDetail = {
      operation: summary("operation-1", "cancellation-requested", 2, {
        cancellationRequested: 1,
        cancelled: 3,
      }),
      tasks: [task("cancellation-requested")],
    };
    const commanded = reconcileTaskCenterDetail(before, detail);
    expect(commanded.operations[0]?.status).toBe("cancellation-requested");
    expect(commanded.details["operation-1"]).toEqual(detail);

    const settled = reconcileTaskCenterSnapshot(commanded, [
      summary("operation-1", "cancelled", 3, { cancelled: 4 }),
    ]);
    expect(settled.operations[0]?.status).toBe("cancelled");
    expect(settled.details["operation-1"]?.operation.status).toBe("cancellation-requested");
    expect(settled.details["operation-1"]?.operation.updatedAtMs).toBe(2);
  });

  it("keeps a newer list summary separate from cached task detail until detail refreshes", () => {
    const loaded = reconcileTaskCenterDetail(initialTaskCenterState, {
      operation: summary("operation-1", "running", 1, { running: 1, queued: 3 }),
      tasks: [task("running")],
    });

    const snapshotUpdated = reconcileTaskCenterSnapshot(loaded, [
      summary("operation-1", "failed", 2, { failed: 1, blocked: 3 }),
    ]);

    expect(snapshotUpdated.operations[0]?.status).toBe("failed");
    expect(snapshotUpdated.operations[0]?.updatedAtMs).toBe(2);
    expect(snapshotUpdated.details["operation-1"]?.operation.status).toBe("running");
    expect(snapshotUpdated.details["operation-1"]?.operation.updatedAtMs).toBe(1);
    expect(snapshotUpdated.details["operation-1"]?.tasks[0]?.status).toBe("running");

    const refreshed = reconcileTaskCenterDetail(snapshotUpdated, {
      operation: summary("operation-1", "failed", 2, { failed: 1, blocked: 3 }),
      tasks: [task("failed")],
    });
    expect(refreshed.details["operation-1"]?.operation.updatedAtMs).toBe(2);
    expect(refreshed.details["operation-1"]?.tasks[0]?.status).toBe("failed");
  });

  it("does not let an in-flight stale snapshot undo a newer command response", () => {
    const stale = summary("operation-1", "running", 1, { running: 1, queued: 3 });
    const commanded = reconcileTaskCenterDetail(initialTaskCenterState, {
      operation: summary("operation-1", "cancellation-requested", 2, {
        cancellationRequested: 1,
        cancelled: 3,
      }),
      tasks: [task("cancellation-requested")],
    });

    const reconciled = reconcileTaskCenterSnapshot(commanded, [stale]);
    expect(reconciled.operations[0]?.status).toBe("cancellation-requested");
    expect(reconciled.details["operation-1"]?.operation.updatedAtMs).toBe(2);
  });

  it("rejects a stale GET or command detail after a newer canonical update", () => {
    const current = reconcileTaskCenterDetail(initialTaskCenterState, {
      operation: summary("operation-1", "completed", 3, { completed: 4 }),
      tasks: [task("completed")],
    });
    const stale = reconcileTaskCenterDetail(current, {
      operation: summary("operation-1", "running", 2, { running: 1, completed: 3 }),
      tasks: [task("running")],
    });

    expect(stale.operations[0]?.status).toBe("completed");
    expect(stale.details["operation-1"]?.tasks[0]?.status).toBe("completed");
  });

  it("drops cached detail when bounded backend history evicts an operation", () => {
    const withDetail = reconcileTaskCenterDetail(initialTaskCenterState, {
      operation: summary("old", "completed", 1, { completed: 4 }),
      tasks: [],
    });
    const evicted = reconcileTaskCenterSnapshot(withDetail, []);
    expect(evicted).toEqual(initialTaskCenterState);
  });
});

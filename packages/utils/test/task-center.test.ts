import type { TaskDetail, TaskSummary, StepDetail } from "@lisca/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  canCancelTask,
  canCancelStep,
  canRetryStep,
  deriveTaskProgress,
  deriveTaskCenterIndicator,
  initialTaskCenterState,
  reconcileTaskCenterDetail,
  reconcileTaskCenterSnapshot,
  stepKindLabel,
  taskProgressNoun,
} from "../src/task-center";

function summary(
  taskId: string,
  status: TaskSummary["status"],
  updatedAtMs: number,
  progress: Partial<TaskSummary["progress"]> = {},
): TaskSummary {
  return {
    taskId,
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

function step(status: StepDetail["status"], blocked = false): StepDetail {
  return {
    stepId: "step-1",
    taskId: "task-1",
    stepKind: "crop-position-1",
    workspaceId: "workspace-1",
    status,
    weight: 1,
    enqueueOrder: 0,
    dependencies: blocked ? ["step-0"] : [],
    blockedBy: blocked
      ? [{ stepId: "step-0", stepKind: "crop-position-0", status: "failed", error: null }]
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

    expect(state.tasks.map((task) => task.taskId)).toEqual([
      "queued-new",
      "running-old",
      "failed-newest",
      "completed-new",
    ]);
    expect(deriveTaskCenterIndicator(state.tasks)).toEqual({
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
  ] as const)("derives task cancel for %s", (status, expected) => {
    expect(canCancelTask(summary("task-1", status, 1))).toBe(expected);
  });

  it("labels killing stages by name and position steps as PosN", () => {
    expect(stepKindLabel("analysis/killing/prepare")).toBe("Prepare");
    expect(stepKindLabel("analysis/killing/predict/Pos26")).toBe("Pos26");
    expect(stepKindLabel("analysis/killing/merge-predictions")).toBe("Merge Predictions");
    expect(stepKindLabel("analysis/killing/plot-death-times")).toBe("Plot Death Times");
    expect(stepKindLabel("crop-roi/Pos4")).toBe("Pos4");
    expect(stepKindLabel("crop-position-7")).toBe("Crop Position 7");
    expect(taskProgressNoun("crop-roi")).toBe("Positions");
    expect(taskProgressNoun("analysis/killing")).toBe("Steps");
  });

  it("derives step cancel and dependency-safe retry actions", () => {
    expect(canCancelStep(step("running"))).toBe(true);
    expect(canCancelStep(step("blocked"))).toBe(true);
    expect(canCancelStep(step("completed"))).toBe(false);
    expect(canRetryStep(step("failed"))).toBe(true);
    expect(canRetryStep(step("cancelled"))).toBe(true);
    expect(canRetryStep(step("failed", true))).toBe(false);
  });

  it("derives bounded progress without counting attempts as logical steps", () => {
    const task = summary("task-1", "partially-complete", 1, {
      completed: 2,
      running: 1,
      failed: 1,
    });
    expect(deriveTaskProgress(task)).toEqual({
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
      summary("task-1", "running", 1, { running: 1, queued: 3 }),
    ]);
    const detail: TaskDetail = {
      task: summary("task-1", "cancellation-requested", 2, {
        cancellationRequested: 1,
        cancelled: 3,
      }),
      steps: [step("cancellation-requested")],
    };
    const commanded = reconcileTaskCenterDetail(before, detail);
    expect(commanded.tasks[0]?.status).toBe("cancellation-requested");
    expect(commanded.details["task-1"]).toEqual(detail);

    const settled = reconcileTaskCenterSnapshot(commanded, [
      summary("task-1", "cancelled", 3, { cancelled: 4 }),
    ]);
    expect(settled.tasks[0]?.status).toBe("cancelled");
    expect(settled.details["task-1"]?.task.status).toBe("cancellation-requested");
    expect(settled.details["task-1"]?.task.updatedAtMs).toBe(2);
  });

  it("keeps a newer list summary separate from cached step detail until detail refreshes", () => {
    const loaded = reconcileTaskCenterDetail(initialTaskCenterState, {
      task: summary("task-1", "running", 1, { running: 1, queued: 3 }),
      steps: [step("running")],
    });

    const snapshotUpdated = reconcileTaskCenterSnapshot(loaded, [
      summary("task-1", "failed", 2, { failed: 1, blocked: 3 }),
    ]);

    expect(snapshotUpdated.tasks[0]?.status).toBe("failed");
    expect(snapshotUpdated.tasks[0]?.updatedAtMs).toBe(2);
    expect(snapshotUpdated.details["task-1"]?.task.status).toBe("running");
    expect(snapshotUpdated.details["task-1"]?.task.updatedAtMs).toBe(1);
    expect(snapshotUpdated.details["task-1"]?.steps[0]?.status).toBe("running");

    const refreshed = reconcileTaskCenterDetail(snapshotUpdated, {
      task: summary("task-1", "failed", 2, { failed: 1, blocked: 3 }),
      steps: [step("failed")],
    });
    expect(refreshed.details["task-1"]?.task.updatedAtMs).toBe(2);
    expect(refreshed.details["task-1"]?.steps[0]?.status).toBe("failed");
  });

  it("does not let an in-flight stale snapshot undo a newer command response", () => {
    const stale = summary("task-1", "running", 1, { running: 1, queued: 3 });
    const commanded = reconcileTaskCenterDetail(initialTaskCenterState, {
      task: summary("task-1", "cancellation-requested", 2, {
        cancellationRequested: 1,
        cancelled: 3,
      }),
      steps: [step("cancellation-requested")],
    });

    const reconciled = reconcileTaskCenterSnapshot(commanded, [stale]);
    expect(reconciled.tasks[0]?.status).toBe("cancellation-requested");
    expect(reconciled.details["task-1"]?.task.updatedAtMs).toBe(2);
  });

  it("rejects a stale GET or command detail after a newer canonical update", () => {
    const current = reconcileTaskCenterDetail(initialTaskCenterState, {
      task: summary("task-1", "completed", 3, { completed: 4 }),
      steps: [step("completed")],
    });
    const stale = reconcileTaskCenterDetail(current, {
      task: summary("task-1", "running", 2, { running: 1, completed: 3 }),
      steps: [step("running")],
    });

    expect(stale.tasks[0]?.status).toBe("completed");
    expect(stale.details["task-1"]?.steps[0]?.status).toBe("completed");
  });

  it("drops cached detail when bounded backend history evicts a task", () => {
    const withDetail = reconcileTaskCenterDetail(initialTaskCenterState, {
      task: summary("old", "completed", 1, { completed: 4 }),
      steps: [],
    });
    const evicted = reconcileTaskCenterSnapshot(withDetail, []);
    expect(evicted).toEqual(initialTaskCenterState);
  });
});

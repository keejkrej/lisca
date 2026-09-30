import type { TaskDetail, TaskStatus, TaskSummary, StepDetail, StepStatus } from "@lisca/contracts";

export type TaskCenterGateway = {
  listTasks(signal?: AbortSignal): Promise<readonly TaskSummary[]>;
  getTask(taskId: string, signal?: AbortSignal): Promise<TaskDetail>;
  getStep(stepId: string, signal?: AbortSignal): Promise<StepDetail>;
  cancelTask(taskId: string, signal?: AbortSignal): Promise<TaskDetail>;
  cancelStep(stepId: string, signal?: AbortSignal): Promise<TaskDetail>;
  retryStep(stepId: string, signal?: AbortSignal): Promise<TaskDetail>;
};

export type TaskCenterState = {
  readonly tasks: readonly TaskSummary[];
  readonly details: Readonly<Record<string, TaskDetail>>;
};

export type TaskCenterIndicator = {
  readonly activeCount: number;
  readonly attentionCount: number;
  readonly tone: "idle" | "active" | "attention";
};

export type TaskCenterProgress = {
  readonly completed: number;
  readonly settled: number;
  readonly total: number;
  readonly completedPercent: number;
  readonly runningPercent: number;
  readonly failedPercent: number;
  readonly cancelledPercent: number;
};

const activeTaskStatuses = new Set<TaskStatus>(["queued", "running", "cancellation-requested"]);

export const initialTaskCenterState: TaskCenterState = {
  tasks: [],
  details: {},
};

export function isActiveTask(task: TaskSummary): boolean {
  return activeTaskStatuses.has(task.status);
}

export function sortTaskCenterTasks(tasks: readonly TaskSummary[]): TaskSummary[] {
  return [...tasks].sort((left, right) => {
    const activityOrder = Number(isActiveTask(right)) - Number(isActiveTask(left));
    if (activityOrder !== 0) return activityOrder;
    if (right.updatedAtMs !== left.updatedAtMs) return right.updatedAtMs - left.updatedAtMs;
    return right.createdAtMs - left.createdAtMs;
  });
}

export function reconcileTaskCenterSnapshot(
  state: TaskCenterState,
  snapshot: readonly TaskSummary[],
): TaskCenterState {
  const tasks = sortTaskCenterTasks(
    snapshot.map((task) => {
      const current = state.tasks.find((candidate) => candidate.taskId === task.taskId);
      const cached = state.details[task.taskId]?.task;
      const newestKnown = [current, cached]
        .filter((candidate): candidate is TaskSummary => candidate !== undefined)
        .reduce<TaskSummary | undefined>(
          (newest, candidate) =>
            !newest || candidate.updatedAtMs > newest.updatedAtMs ? candidate : newest,
          undefined,
        );
      return newestKnown && newestKnown.updatedAtMs > task.updatedAtMs ? newestKnown : task;
    }),
  );
  const retainedIds = new Set(tasks.map((task) => task.taskId));
  const details: Record<string, TaskDetail> = {};

  for (const [taskId, detail] of Object.entries(state.details)) {
    if (!retainedIds.has(taskId)) continue;
    details[taskId] = detail;
  }

  return { tasks, details };
}

/** Reconcile a detail read or command response into the same canonical view model. */
export function reconcileTaskCenterDetail(
  state: TaskCenterState,
  detail: TaskDetail,
): TaskCenterState {
  const taskId = detail.task.taskId;
  const currentSummary = state.tasks.find((task) => task.taskId === taskId);
  const currentDetail = state.details[taskId];
  const currentUpdatedAtMs = Math.max(
    currentSummary?.updatedAtMs ?? Number.NEGATIVE_INFINITY,
    currentDetail?.task.updatedAtMs ?? Number.NEGATIVE_INFINITY,
  );
  if (detail.task.updatedAtMs < currentUpdatedAtMs) return state;

  const remaining = state.tasks.filter((task) => task.taskId !== taskId);
  return {
    tasks: sortTaskCenterTasks([...remaining, detail.task]),
    details: { ...state.details, [taskId]: detail },
  };
}

export function deriveTaskCenterIndicator(tasks: readonly TaskSummary[]): TaskCenterIndicator {
  const activeCount = tasks.filter(isActiveTask).length;
  const attentionCount = tasks.filter((task) => task.attention === "error").length;
  return {
    activeCount,
    attentionCount,
    tone: attentionCount > 0 ? "attention" : activeCount > 0 ? "active" : "idle",
  };
}

export function deriveTaskProgress(task: TaskSummary): TaskCenterProgress {
  const { progress } = task;
  const total = progress.total;
  const percent = (count: number) => (total === 0 ? 0 : (count / total) * 100);
  return {
    completed: progress.completed,
    settled: progress.completed + progress.failed + progress.cancelled,
    total,
    completedPercent: percent(progress.completed),
    runningPercent: percent(progress.running + progress.cancellationRequested),
    failedPercent: percent(progress.failed),
    cancelledPercent: percent(progress.cancelled),
  };
}

export function canCancelTask(task: TaskSummary): boolean {
  return task.status === "queued" || task.status === "running";
}

export function canCancelStep(step: StepDetail): boolean {
  return step.status === "queued" || step.status === "blocked" || step.status === "running";
}

export function canRetryStep(step: StepDetail): boolean {
  return (step.status === "failed" || step.status === "cancelled") && step.blockedBy.length === 0;
}

export function taskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case "partially-complete":
      return "Partially complete";
    case "cancellation-requested":
      return "Stopping";
    default:
      return sentenceCase(status);
  }
}

export function stepStatusLabel(status: StepStatus): string {
  switch (status) {
    case "cancellation-requested":
      return "Stopping";
    case "blocked":
      return "Blocked by dependency";
    default:
      return sentenceCase(status);
  }
}

export function taskKindLabel(kind: string): string {
  return kind
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((word) => (word.toLowerCase() === "roi" ? "ROI" : sentenceCase(word)))
    .join(" ");
}

function sentenceCase(value: string): string {
  return value.length === 0 ? value : `${value[0]!.toUpperCase()}${value.slice(1)}`;
}

import type {
  OperationDetail,
  OperationStatus,
  OperationSummary,
  TaskDetail,
  TaskStatus,
} from "@lisca/contracts";

export type TaskCenterGateway = {
  listOperations(signal?: AbortSignal): Promise<readonly OperationSummary[]>;
  getOperation(operationId: string, signal?: AbortSignal): Promise<OperationDetail>;
  getTask(taskId: string, signal?: AbortSignal): Promise<TaskDetail>;
  cancelOperation(operationId: string, signal?: AbortSignal): Promise<OperationDetail>;
  cancelTask(taskId: string, signal?: AbortSignal): Promise<OperationDetail>;
  retryTask(taskId: string, signal?: AbortSignal): Promise<OperationDetail>;
};

export type TaskCenterState = {
  readonly operations: readonly OperationSummary[];
  readonly details: Readonly<Record<string, OperationDetail>>;
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

const activeOperationStatuses = new Set<OperationStatus>([
  "queued",
  "running",
  "cancellation-requested",
]);

export const initialTaskCenterState: TaskCenterState = {
  operations: [],
  details: {},
};

export function isActiveOperation(operation: OperationSummary): boolean {
  return activeOperationStatuses.has(operation.status);
}

export function sortTaskCenterOperations(
  operations: readonly OperationSummary[],
): OperationSummary[] {
  return [...operations].sort((left, right) => {
    const activityOrder = Number(isActiveOperation(right)) - Number(isActiveOperation(left));
    if (activityOrder !== 0) return activityOrder;
    if (right.updatedAtMs !== left.updatedAtMs) return right.updatedAtMs - left.updatedAtMs;
    return right.createdAtMs - left.createdAtMs;
  });
}

export function reconcileTaskCenterSnapshot(
  state: TaskCenterState,
  snapshot: readonly OperationSummary[],
): TaskCenterState {
  const operations = sortTaskCenterOperations(
    snapshot.map((operation) => {
      const current = state.operations.find(
        (candidate) => candidate.operationId === operation.operationId,
      );
      const cached = state.details[operation.operationId]?.operation;
      const newestKnown = [current, cached]
        .filter((candidate): candidate is OperationSummary => candidate !== undefined)
        .reduce<OperationSummary | undefined>(
          (newest, candidate) =>
            !newest || candidate.updatedAtMs > newest.updatedAtMs ? candidate : newest,
          undefined,
        );
      return newestKnown && newestKnown.updatedAtMs > operation.updatedAtMs
        ? newestKnown
        : operation;
    }),
  );
  const retainedIds = new Set(operations.map((operation) => operation.operationId));
  const details: Record<string, OperationDetail> = {};

  for (const [operationId, detail] of Object.entries(state.details)) {
    if (!retainedIds.has(operationId)) continue;
    details[operationId] = detail;
  }

  return { operations, details };
}

/** Reconcile a detail read or command response into the same canonical view model. */
export function reconcileTaskCenterDetail(
  state: TaskCenterState,
  detail: OperationDetail,
): TaskCenterState {
  const operationId = detail.operation.operationId;
  const currentSummary = state.operations.find(
    (operation) => operation.operationId === operationId,
  );
  const currentDetail = state.details[operationId];
  const currentUpdatedAtMs = Math.max(
    currentSummary?.updatedAtMs ?? Number.NEGATIVE_INFINITY,
    currentDetail?.operation.updatedAtMs ?? Number.NEGATIVE_INFINITY,
  );
  if (detail.operation.updatedAtMs < currentUpdatedAtMs) return state;

  const remaining = state.operations.filter((operation) => operation.operationId !== operationId);
  return {
    operations: sortTaskCenterOperations([...remaining, detail.operation]),
    details: { ...state.details, [operationId]: detail },
  };
}

export function deriveTaskCenterIndicator(
  operations: readonly OperationSummary[],
): TaskCenterIndicator {
  const activeCount = operations.filter(isActiveOperation).length;
  const attentionCount = operations.filter((operation) => operation.attention === "error").length;
  return {
    activeCount,
    attentionCount,
    tone: attentionCount > 0 ? "attention" : activeCount > 0 ? "active" : "idle",
  };
}

export function deriveOperationProgress(operation: OperationSummary): TaskCenterProgress {
  const { progress } = operation;
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

export function canCancelOperation(operation: OperationSummary): boolean {
  return operation.status === "queued" || operation.status === "running";
}

export function canCancelTask(task: TaskDetail): boolean {
  return task.status === "queued" || task.status === "blocked" || task.status === "running";
}

export function canRetryTask(task: TaskDetail): boolean {
  return (task.status === "failed" || task.status === "cancelled") && task.blockedBy.length === 0;
}

export function operationStatusLabel(status: OperationStatus): string {
  switch (status) {
    case "partially-complete":
      return "Partially complete";
    case "cancellation-requested":
      return "Stopping";
    default:
      return sentenceCase(status);
  }
}

export function taskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case "cancellation-requested":
      return "Stopping";
    case "blocked":
      return "Blocked by dependency";
    default:
      return sentenceCase(status);
  }
}

export function operationKindLabel(kind: string): string {
  return kind
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((word) => (word.toLowerCase() === "roi" ? "ROI" : sentenceCase(word)))
    .join(" ");
}

function sentenceCase(value: string): string {
  return value.length === 0 ? value : `${value[0]!.toUpperCase()}${value.slice(1)}`;
}

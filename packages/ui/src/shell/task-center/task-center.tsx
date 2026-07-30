import type { OperationDetail, OperationSummary, TaskDetail } from "@lisca/contracts";
import * as Dialog from "@kobalte/core/dialog";
import {
  canCancelOperation,
  canCancelTask,
  canRetryTask,
  deriveOperationProgress,
  deriveTaskCenterIndicator,
  initialTaskCenterState,
  operationKindLabel,
  operationStatusLabel,
  reconcileTaskCenterDetail,
  reconcileTaskCenterSnapshot,
  taskStatusLabel,
  type TaskCenterGateway,
} from "@lisca/utils";
import IconArrowsClockwiseRegular from "phosphor-icons-solid/IconArrowsClockwiseRegular";
import IconCaretDownRegular from "phosphor-icons-solid/IconCaretDownRegular";
import IconCaretRightRegular from "phosphor-icons-solid/IconCaretRightRegular";
import IconQueueRegular from "phosphor-icons-solid/IconQueueRegular";
import IconWarningCircleRegular from "phosphor-icons-solid/IconWarningCircleRegular";
import IconXRegular from "phosphor-icons-solid/IconXRegular";
import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";

import { Button } from "../../components/ui/button";
import { Spinner } from "../../components/ui/spinner";
import { cn } from "../../lib/utils";

export type TaskCenterProps = {
  gateway: TaskCenterGateway;
  subscribe: (handlers: {
    onSnapshot: (snapshot: Awaited<ReturnType<TaskCenterGateway["listOperations"]>>) => void;
    onError: (error: unknown) => void;
  }) => () => void;
};

const terminalTaskStatuses = new Set<TaskDetail["status"]>(["completed", "failed", "cancelled"]);

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
}

function workspaceName(path: string): string {
  const normalized = path.replace(/[\\/]+$/, "");
  return normalized.split(/[\\/]/).at(-1) || path;
}

function formatTime(timestampMs: number | null): string {
  if (timestampMs === null) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestampMs));
}

function operationTone(operation: OperationSummary): string {
  if (operation.attention === "error") return "text-destructive";
  if (operation.status === "running" || operation.status === "cancellation-requested") {
    return "text-foreground";
  }
  return "text-muted-foreground";
}

function taskTone(status: TaskDetail["status"]): string {
  if (status === "failed" || status === "blocked") return "text-destructive";
  return terminalTaskStatuses.has(status) ? "text-muted-foreground" : "text-foreground";
}

function OperationProgressRail(props: { operation: OperationSummary }) {
  const progress = createMemo(() => deriveOperationProgress(props.operation));
  return (
    <div
      aria-label={`${progress().completed} of ${progress().total} tasks completed`}
      class="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuemax={progress().total}
      aria-valuemin={0}
      aria-valuenow={progress().completed}
    >
      <div class="bg-primary" style={{ width: `${progress().completedPercent}%` }} />
      <div
        class="bg-primary/35 motion-safe:animate-pulse"
        style={{ width: `${progress().runningPercent}%` }}
      />
      <div class="bg-destructive" style={{ width: `${progress().failedPercent}%` }} />
      <div class="bg-muted-foreground/35" style={{ width: `${progress().cancelledPercent}%` }} />
    </div>
  );
}

function WorkProgressRail(props: { operation: OperationSummary }) {
  const work = () => props.operation.workProgress;
  const percent = () => {
    const current = work();
    return current && current.total > 0 ? (current.completed / current.total) * 100 : 0;
  };
  const label = () => {
    const kind = props.operation.activeTaskKind;
    const position = kind?.match(/Pos\d+/)?.[0];
    return position ?? "Current task";
  };
  return (
    <Show when={work()}>
      {(current) => (
        <div class="space-y-1">
          <div class="flex justify-between gap-3 text-muted-foreground text-xs tabular-nums">
            <span>{label()}</span>
            <span>
              {current().completed}/{current().total} {current().unit}
            </span>
          </div>
          <div
            aria-label={`${label()} ${current().unit} progress`}
            aria-valuemax={current().total}
            aria-valuemin={0}
            aria-valuenow={current().completed}
            class="h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <div class="h-full bg-primary" style={{ width: `${percent()}%` }} />
          </div>
        </div>
      )}
    </Show>
  );
}

function TaskRow(props: {
  task: TaskDetail;
  busy: boolean;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const latestError = () => props.task.attempts.at(-1)?.error;
  return (
    <li class="border-t border-border/70 first:border-t-0">
      <div class="flex items-start gap-2 px-3 py-2.5">
        <div class="flex min-w-0 flex-1 items-start gap-2">
          <span class="min-w-0 flex-1">
            <span class="block truncate font-medium text-foreground text-sm">
              {operationKindLabel(props.task.taskKind)}
            </span>
            <span class="block truncate text-muted-foreground text-xs">
              {taskStatusLabel(props.task.status)}
              <Show when={latestError()}> · {latestError()?.message}</Show>
            </span>
          </span>
          <span class={cn("shrink-0 text-xs", taskTone(props.task.status))}>
            {taskStatusLabel(props.task.status)}
          </span>
        </div>

        <Show when={canCancelTask(props.task)}>
          <Button
            disabled={props.busy}
            size="xs"
            type="button"
            variant="outline"
            onClick={props.onCancel}
          >
            Stop
          </Button>
        </Show>
        <Show when={canRetryTask(props.task)}>
          <Button
            disabled={props.busy}
            size="xs"
            type="button"
            variant="outline"
            onClick={props.onRetry}
          >
            <IconArrowsClockwiseRegular />
            Retry
          </Button>
        </Show>
      </div>
    </li>
  );
}

export function TaskCenter(props: TaskCenterProps) {
  const [open, setOpen] = createSignal(false);
  const [state, setState] = createSignal(initialTaskCenterState);
  const [expandedOperationId, setExpandedOperationId] = createSignal<string | null>(null);
  const [loadingDetail, setLoadingDetail] = createSignal<string | null>(null);
  const [busyAction, setBusyAction] = createSignal<string | null>(null);
  const [refreshError, setRefreshError] = createSignal<string | null>(null);
  const [actionError, setActionError] = createSignal<string | null>(null);
  const indicator = createMemo(() => deriveTaskCenterIndicator(state().operations));
  const operationRequests = new Map<string, { generation: number; controller: AbortController }>();
  let nextRequestGeneration = 0;
  let closeButton: HTMLButtonElement | undefined;
  let triggerButton: HTMLButtonElement | undefined;

  const beginOperationRequest = (operationId: string) => {
    operationRequests.get(operationId)?.controller.abort();
    const request = {
      generation: ++nextRequestGeneration,
      controller: new AbortController(),
    };
    operationRequests.set(operationId, request);
    return request;
  };

  const isCurrentOperationRequest = (operationId: string, generation: number) =>
    operationRequests.get(operationId)?.generation === generation;

  const setDialogOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) queueMicrotask(() => triggerButton?.focus());
  };

  const refreshOperationDetail = async (operationId: string, showLoading: boolean) => {
    const request = beginOperationRequest(operationId);
    if (showLoading) setLoadingDetail(operationId);
    try {
      const detail = await props.gateway.getOperation(operationId, request.controller.signal);
      if (!isCurrentOperationRequest(operationId, request.generation)) return;
      setState((current) => reconcileTaskCenterDetail(current, detail));
    } catch (error) {
      if (
        !request.controller.signal.aborted &&
        isCurrentOperationRequest(operationId, request.generation)
      ) {
        setActionError(errorMessage(error));
      }
    } finally {
      if (isCurrentOperationRequest(operationId, request.generation)) {
        operationRequests.delete(operationId);
        setLoadingDetail((current) => (current === operationId ? null : current));
      }
    }
  };

  onMount(() => {
    const stop = props.subscribe({
      onSnapshot: (snapshot) => {
        const expandedId = expandedOperationId();
        let refreshExpanded = false;
        setState((current) => {
          const next = reconcileTaskCenterSnapshot(current, snapshot);
          if (expandedId) {
            const summary = next.operations.find(
              (operation) => operation.operationId === expandedId,
            );
            const detail = next.details[expandedId];
            refreshExpanded = Boolean(
              summary && (!detail || summary.updatedAtMs > detail.operation.updatedAtMs),
            );
          }
          return next;
        });
        if (expandedId && refreshExpanded) {
          void refreshOperationDetail(expandedId, false);
        }
        setRefreshError(null);
      },
      onError: (error) => setRefreshError(errorMessage(error)),
    });
    onCleanup(() => {
      stop();
      for (const request of operationRequests.values()) request.controller.abort();
      operationRequests.clear();
    });
  });

  const toggleOperation = async (operationId: string) => {
    if (expandedOperationId() === operationId) {
      setExpandedOperationId(null);
      return;
    }
    setExpandedOperationId(operationId);
    setActionError(null);
    await refreshOperationDetail(operationId, !state().details[operationId]);
  };

  const runAction = async (
    key: string,
    operationId: string,
    command: (signal: AbortSignal) => Promise<OperationDetail>,
  ) => {
    const request = beginOperationRequest(operationId);
    setBusyAction(key);
    setActionError(null);
    try {
      const detail = await command(request.controller.signal);
      if (!isCurrentOperationRequest(operationId, request.generation)) return;
      setState((current) => reconcileTaskCenterDetail(current, detail));
    } catch (error) {
      if (
        !request.controller.signal.aborted &&
        isCurrentOperationRequest(operationId, request.generation)
      ) {
        setActionError(errorMessage(error));
      }
    } finally {
      if (isCurrentOperationRequest(operationId, request.generation)) {
        operationRequests.delete(operationId);
      }
      setBusyAction((current) => (current === key ? null : current));
    }
  };

  return (
    <Dialog.Root modal open={open()} onOpenChange={setDialogOpen}>
      <Dialog.Trigger
        as={Button}
        ref={(element) => (triggerButton = element)}
        aria-label={
          indicator().tone === "attention"
            ? `Tasks, ${indicator().attentionCount} need attention`
            : `Tasks, ${indicator().activeCount} active`
        }
        class="relative"
        size="sm"
        type="button"
        variant="ghost"
      >
        <IconQueueRegular class="size-4" />
        <span class="hidden sm:inline">Tasks</span>
        <Show when={indicator().tone !== "idle"}>
          <span
            aria-hidden="true"
            class={cn(
              "flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4",
              indicator().tone === "attention"
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground",
            )}
          >
            {indicator().tone === "attention" ? "!" : indicator().activeCount}
          </span>
        </Show>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          class="fixed inset-0 z-50 bg-black/50"
          data-testid="task-center-overlay"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setDialogOpen(false);
          }}
        />
        <Dialog.Content
          class="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100%-2.5rem)] w-[calc(100%-3rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl sm:max-h-[calc(100%-4rem)]"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            closeButton?.focus();
          }}
        >
          <div class="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div class="space-y-1">
              <Dialog.Title class="font-semibold text-foreground text-lg">Task Center</Dialog.Title>
              <Dialog.Description class="text-muted-foreground text-sm">
                Background computations and recent results
              </Dialog.Description>
            </div>
            <Dialog.CloseButton
              as={Button}
              ref={(element) => (closeButton = element)}
              aria-label="Close Task Center"
              class=""
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <IconXRegular />
            </Dialog.CloseButton>
          </div>

          <Show when={refreshError()}>
            <div class="flex items-start gap-2 border-b border-destructive/30 bg-destructive/5 px-5 py-2.5 text-destructive text-sm">
              <IconWarningCircleRegular class="mt-0.5 size-4 shrink-0" />
              <span>Task updates are temporarily unavailable. Showing the last known state.</span>
            </div>
          </Show>
          <Show when={actionError()}>
            {(message) => (
              <div
                aria-live="assertive"
                class="flex items-start gap-2 border-b border-destructive/30 bg-destructive/5 px-5 py-2.5 text-destructive text-sm"
              >
                <IconWarningCircleRegular class="mt-0.5 size-4 shrink-0" />
                <span>{message()}</span>
              </div>
            )}
          </Show>

          <div class="min-h-52 flex-1 overflow-y-auto overscroll-contain">
            <Show
              when={state().operations.length > 0}
              fallback={
                <div class="flex min-h-52 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                  <IconQueueRegular class="size-7 text-muted-foreground" />
                  <p class="font-medium text-foreground text-sm">No tasks yet</p>
                  <p class="max-w-sm text-muted-foreground text-sm">
                    Long-running computations will appear here while you keep working.
                  </p>
                </div>
              }
            >
              <ul class="divide-y divide-border">
                <For each={state().operations}>
                  {(operation) => {
                    const expanded = () => expandedOperationId() === operation.operationId;
                    const detail = () => state().details[operation.operationId];
                    const progress = () => deriveOperationProgress(operation);
                    const operationBusy = () =>
                      busyAction() === `operation:${operation.operationId}`;
                    return (
                      <li class="px-5 py-4">
                        <div class="flex items-start gap-3">
                          <button
                            aria-expanded={expanded()}
                            class="flex min-w-0 flex-1 items-start gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            type="button"
                            onClick={() => void toggleOperation(operation.operationId)}
                          >
                            <span
                              class={cn(
                                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-background",
                                operationTone(operation),
                              )}
                            >
                              <Show
                                when={expanded()}
                                fallback={<IconCaretRightRegular class="size-3.5" />}
                              >
                                <IconCaretDownRegular class="size-3.5" />
                              </Show>
                            </span>
                            <span class="min-w-0 flex-1 space-y-2">
                              <span class="flex items-start justify-between gap-3">
                                <span class="min-w-0">
                                  <span class="block truncate font-medium text-foreground text-sm">
                                    {operationKindLabel(operation.kind)}
                                  </span>
                                  <span
                                    class="block truncate text-muted-foreground text-xs"
                                    title={operation.workspacePath}
                                  >
                                    {workspaceName(operation.workspacePath)} · updated{" "}
                                    {formatTime(operation.updatedAtMs)}
                                  </span>
                                </span>
                                <span
                                  class={cn(
                                    "shrink-0 font-medium text-xs",
                                    operationTone(operation),
                                  )}
                                >
                                  {operationStatusLabel(operation.status)}
                                </span>
                              </span>
                              <OperationProgressRail operation={operation} />
                              <span class="flex justify-between gap-3 text-muted-foreground text-xs tabular-nums">
                                <span>
                                  Positions {progress().completed}/{progress().total}
                                </span>
                                <Show when={operation.progress.failed > 0}>
                                  <span class="text-destructive">
                                    {operation.progress.failed} failed
                                  </span>
                                </Show>
                              </span>
                              <WorkProgressRail operation={operation} />
                            </span>
                          </button>
                          <Show when={canCancelOperation(operation)}>
                            <Button
                              disabled={operationBusy()}
                              size="xs"
                              type="button"
                              variant="outline"
                              onClick={() =>
                                void runAction(
                                  `operation:${operation.operationId}`,
                                  operation.operationId,
                                  (signal) =>
                                    props.gateway.cancelOperation(operation.operationId, signal),
                                )
                              }
                            >
                              <Show when={operationBusy()}>
                                <Spinner />
                              </Show>
                              Stop
                            </Button>
                          </Show>
                        </div>

                        <Show when={expanded()}>
                          <div class="ml-10 mt-3 overflow-hidden rounded-lg border border-border">
                            <Show
                              when={loadingDetail() !== operation.operationId}
                              fallback={
                                <div class="flex items-center gap-2 px-3 py-4 text-muted-foreground text-sm">
                                  <Spinner /> Loading task details…
                                </div>
                              }
                            >
                              <Show
                                when={detail()}
                                fallback={
                                  <p class="px-3 py-4 text-muted-foreground text-sm">
                                    Details could not be loaded. Close and reopen this operation to
                                    try again.
                                  </p>
                                }
                              >
                                {(operationDetail) => (
                                  <ul>
                                    <For each={operationDetail().tasks}>
                                      {(task) => (
                                        <TaskRow
                                          busy={busyAction() === `task:${task.taskId}`}
                                          task={task}
                                          onCancel={() =>
                                            void runAction(
                                              `task:${task.taskId}`,
                                              operation.operationId,
                                              (signal) =>
                                                props.gateway.cancelTask(task.taskId, signal),
                                            )
                                          }
                                          onRetry={() =>
                                            void runAction(
                                              `task:${task.taskId}`,
                                              operation.operationId,
                                              (signal) =>
                                                props.gateway.retryTask(task.taskId, signal),
                                            )
                                          }
                                        />
                                      )}
                                    </For>
                                  </ul>
                                )}
                              </Show>
                            </Show>
                          </div>
                        </Show>
                      </li>
                    );
                  }}
                </For>
              </ul>
            </Show>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

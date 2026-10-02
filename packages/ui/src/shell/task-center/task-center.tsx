import type { TaskDetail, TaskSummary, StepDetail } from "@lisca/contracts";
import * as Dialog from "@kobalte/core/dialog";
import {
  canCancelTask,
  canRetryStep,
  deriveTaskProgress,
  deriveTaskCenterIndicator,
  initialTaskCenterState,
  taskKindLabel,
  taskStatusLabel,
  reconcileTaskCenterDetail,
  reconcileTaskCenterSnapshot,
  type TaskCenterGateway,
} from "@lisca/utils";
import IconArrowsClockwiseRegular from "phosphor-icons-solid/IconArrowsClockwiseRegular";
import IconQueueRegular from "phosphor-icons-solid/IconQueueRegular";
import IconWarningCircleRegular from "phosphor-icons-solid/IconWarningCircleRegular";
import IconXRegular from "phosphor-icons-solid/IconXRegular";
import { For, Show, createMemo, createSignal, onCleanup, onMount, type JSX } from "solid-js";

import { Button, buttonVariants } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Spinner } from "../../components/ui/spinner";
import { cn } from "../../lib/utils";

export type TaskCenterProps = {
  /** Compact instrument-session trigger; the default keeps the existing shell button. */
  appearance?: "button" | "status-link";
  /** Dialog subtitle. Defaults to the shared task-center description. */
  description?: string;
  /** Shown under the empty title when the scoped list has no tasks. */
  emptyMessage?: string;
  /** Empty-list heading. */
  emptyTitle?: string;
  gateway: TaskCenterGateway;
  /** Status trigger text. Defaults to "Tasks". */
  label?: string;
  /** Dialog title. Defaults to "Task Center". */
  title?: string;
  /** When set, the dialog open state is controlled by the caller. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Accessible chord for the trigger, such as `Meta+T`. */
  shortcutKeys?: string;
  /** Visual chord hint rendered inside the trigger. */
  shortcutHint?: JSX.Element;
  subscribe: (handlers: {
    onSnapshot: (snapshot: Awaited<ReturnType<TaskCenterGateway["listTasks"]>>) => void;
    onError: (error: unknown) => void;
  }) => () => void;
};

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

function taskDotClass(task: TaskSummary): string {
  if (task.attention === "error" || task.status === "failed") {
    return "bg-destructive";
  }
  if (task.status === "running" || task.status === "cancellation-requested") {
    return "bg-primary motion-safe:animate-pulse";
  }
  if (task.status === "completed" || task.status === "partially-complete") {
    return "bg-primary";
  }
  return "bg-muted-foreground/50";
}

function TaskProgressRail(props: { task: TaskSummary }) {
  const progress = createMemo(() => deriveTaskProgress(props.task));
  return (
    <div
      aria-label={`${progress().completed} of ${progress().total} steps completed`}
      class="flex h-1.5 w-full overflow-hidden rounded-none bg-muted"
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

function positionLabel(stepKind: string | null | undefined): string {
  return stepKind?.match(/Pos\d+/)?.[0] ?? "Current step";
}

function WorkProgressRail(props: { label: string; work: NonNullable<StepDetail["workProgress"]> }) {
  const percent = () =>
    props.work.total > 0 ? (props.work.completed / props.work.total) * 100 : 0;
  return (
    <div class="space-y-1">
      <div class="flex justify-between gap-3 text-muted-foreground text-xs tabular-nums">
        <span>{props.label}</span>
        <span>
          {props.work.completed}/{props.work.total} {props.work.unit}
        </span>
      </div>
      <div
        aria-label={`${props.label} ${props.work.unit} progress`}
        aria-valuemax={props.work.total}
        aria-valuemin={0}
        aria-valuenow={props.work.completed}
        class="h-1.5 overflow-hidden rounded-none bg-muted"
        role="progressbar"
      >
        <div class="h-full bg-primary" style={{ width: `${percent()}%` }} />
      </div>
    </div>
  );
}

function StepRow(props: { step: StepDetail; busy: boolean; onRetry: () => void }) {
  const latestError = () => props.step.attempts.at(-1)?.error;
  const label = () => positionLabel(props.step.stepKind);
  return (
    <li>
      <div
        class={cn(
          buttonVariants({ variant: "ghost" }),
          "h-auto w-full justify-start gap-2 rounded-lg px-3 py-2.5 font-normal",
        )}
      >
        <div class="min-w-0 flex-1 space-y-1 text-left">
          <Show
            when={props.step.workProgress}
            fallback={<span class="block truncate text-muted-foreground text-xs">{label()}</span>}
          >
            {(work) => <WorkProgressRail label={label()} work={work()} />}
          </Show>
          <Show when={latestError()}>
            {(error) => (
              <span class="block truncate text-destructive text-xs">{error().message}</span>
            )}
          </Show>
        </div>
        <Show when={canRetryStep(props.step)}>
          <Button
            disabled={props.busy}
            size="xs"
            type="button"
            variant="ghost"
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
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(false);
  const open = () => props.open ?? uncontrolledOpen();
  const [state, setState] = createSignal(initialTaskCenterState);
  const [expandedTaskId, setExpandedTaskId] = createSignal<string | null>(null);
  const [loadingDetail, setLoadingDetail] = createSignal<string | null>(null);
  const [busyAction, setBusyAction] = createSignal<string | null>(null);
  const [refreshError, setRefreshError] = createSignal<string | null>(null);
  const [actionError, setActionError] = createSignal<string | null>(null);
  const indicator = createMemo(() => deriveTaskCenterIndicator(state().tasks));
  const statusLink = () => props.appearance === "status-link";
  const taskRequests = new Map<string, { generation: number; controller: AbortController }>();
  let nextRequestGeneration = 0;
  let closeButton: HTMLButtonElement | undefined;
  let triggerButton: HTMLButtonElement | undefined;

  const beginTaskRequest = (taskId: string) => {
    taskRequests.get(taskId)?.controller.abort();
    const request = {
      generation: ++nextRequestGeneration,
      controller: new AbortController(),
    };
    taskRequests.set(taskId, request);
    return request;
  };

  const isCurrentTaskRequest = (taskId: string, generation: number) =>
    taskRequests.get(taskId)?.generation === generation;

  const setDialogOpen = (nextOpen: boolean) => {
    if (props.open === undefined) setUncontrolledOpen(nextOpen);
    props.onOpenChange?.(nextOpen);
    if (!nextOpen) queueMicrotask(() => triggerButton?.focus());
  };

  const refreshTaskDetail = async (taskId: string, showLoading: boolean) => {
    const request = beginTaskRequest(taskId);
    if (showLoading) setLoadingDetail(taskId);
    try {
      const detail = await props.gateway.getTask(taskId, request.controller.signal);
      if (!isCurrentTaskRequest(taskId, request.generation)) return;
      setState((current) => reconcileTaskCenterDetail(current, detail));
    } catch (error) {
      if (!request.controller.signal.aborted && isCurrentTaskRequest(taskId, request.generation)) {
        setActionError(errorMessage(error));
      }
    } finally {
      if (isCurrentTaskRequest(taskId, request.generation)) {
        taskRequests.delete(taskId);
        setLoadingDetail((current) => (current === taskId ? null : current));
      }
    }
  };

  onMount(() => {
    const stop = props.subscribe({
      onSnapshot: (snapshot) => {
        const expandedId = expandedTaskId();
        let refreshExpanded = false;
        setState((current) => {
          const next = reconcileTaskCenterSnapshot(current, snapshot);
          if (expandedId) {
            const summary = next.tasks.find((task) => task.taskId === expandedId);
            const detail = next.details[expandedId];
            refreshExpanded = Boolean(
              summary && (!detail || summary.updatedAtMs > detail.task.updatedAtMs),
            );
          }
          return next;
        });
        if (expandedId && refreshExpanded) {
          void refreshTaskDetail(expandedId, false);
        }
        setRefreshError(null);
      },
      onError: (error) => setRefreshError(errorMessage(error)),
    });
    onCleanup(() => {
      stop();
      for (const request of taskRequests.values()) request.controller.abort();
      taskRequests.clear();
    });
  });

  const toggleTask = async (taskId: string) => {
    if (expandedTaskId() === taskId) {
      setExpandedTaskId(null);
      return;
    }
    setExpandedTaskId(taskId);
    setActionError(null);
    await refreshTaskDetail(taskId, !state().details[taskId]);
  };

  const runAction = async (
    key: string,
    taskId: string,
    command: (signal: AbortSignal) => Promise<TaskDetail>,
  ) => {
    const request = beginTaskRequest(taskId);
    setBusyAction(key);
    setActionError(null);
    try {
      const detail = await command(request.controller.signal);
      if (!isCurrentTaskRequest(taskId, request.generation)) return;
      setState((current) => reconcileTaskCenterDetail(current, detail));
    } catch (error) {
      if (!request.controller.signal.aborted && isCurrentTaskRequest(taskId, request.generation)) {
        setActionError(errorMessage(error));
      }
    } finally {
      if (isCurrentTaskRequest(taskId, request.generation)) {
        taskRequests.delete(taskId);
      }
      setBusyAction((current) => (current === key ? null : current));
    }
  };

  const label = () => props.label ?? "Tasks";
  const title = () => props.title ?? "Task Center";

  return (
    <Dialog.Root modal open={open()} onOpenChange={setDialogOpen}>
      <Dialog.Trigger
        as={Button}
        ref={(element) => (triggerButton = element)}
        aria-keyshortcuts={props.shortcutKeys}
        aria-label={
          indicator().tone === "attention"
            ? `${label()}, ${indicator().attentionCount} need attention`
            : `${label()}, ${indicator().activeCount} active`
        }
        class={cn("relative", statusLink() && "h-7 gap-2 px-2.5 text-xs text-foreground")}
        data-task-center-appearance={props.appearance ?? "button"}
        size="sm"
        type="button"
        variant={statusLink() ? "outline" : "ghost"}
      >
        <Show when={!statusLink()}>
          <IconQueueRegular class="size-4" />
        </Show>
        <span class={statusLink() ? undefined : "hidden sm:inline"}>{label()}</span>
        {props.shortcutHint}
        <Show when={statusLink() ? indicator().activeCount > 0 : indicator().tone !== "idle"}>
          <span
            aria-hidden="true"
            data-slot="task-badge"
            class={cn(
              "flex min-w-4 items-center justify-center rounded-none px-1 text-[10px] leading-4",
              statusLink()
                ? "bg-foreground text-background"
                : indicator().tone === "attention"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground",
            )}
          >
            {statusLink()
              ? indicator().activeCount
              : indicator().tone === "attention"
                ? "!"
                : indicator().activeCount}
          </span>
        </Show>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          class={cn("fixed inset-0 z-50", statusLink() ? "bg-foreground/40" : "bg-black/50")}
          data-testid="task-center-overlay"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setDialogOpen(false);
          }}
        />
        <Dialog.Content
          class={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100%-2.5rem)] w-[calc(100%-3rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border border-border bg-background text-foreground sm:max-h-[calc(100%-4rem)]",
            statusLink()
              ? "max-w-[32.5rem] rounded-none shadow-none"
              : "max-w-2xl rounded-none shadow-2xl",
          )}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            closeButton?.focus();
          }}
        >
          <div class="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div class="space-y-1">
              <Dialog.Title class="font-semibold text-foreground text-lg">{title()}</Dialog.Title>
              <Dialog.Description class="text-muted-foreground text-sm">
                {props.description ?? "Background computations and recent results"}
              </Dialog.Description>
            </div>
            <Dialog.CloseButton
              as={Button}
              ref={(element) => (closeButton = element)}
              aria-label={`Close ${title()}`}
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

          <ScrollArea class="min-h-52 flex-1" viewportClass="overscroll-contain">
            <Show
              when={state().tasks.length > 0}
              fallback={
                <div class="flex min-h-52 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                  <IconQueueRegular class="size-7 text-muted-foreground" />
                  <p class="font-medium text-foreground text-sm">
                    {props.emptyTitle ?? "No tasks yet"}
                  </p>
                  <p class="max-w-sm text-muted-foreground text-sm">
                    {props.emptyMessage ?? "Long-running computations will appear here."}
                  </p>
                </div>
              }
            >
              <ul class="space-y-1 px-3 py-3">
                <For each={state().tasks}>
                  {(task) => {
                    const expanded = () => expandedTaskId() === task.taskId;
                    const detail = () => state().details[task.taskId];
                    const taskBusy = () => busyAction() === `task:${task.taskId}`;
                    return (
                      <li>
                        <div
                          class={cn(
                            "flex items-start gap-2 rounded-lg",
                            expanded() && "bg-muted/50",
                          )}
                        >
                          <button
                            aria-expanded={expanded()}
                            aria-label={
                              expanded()
                                ? `Collapse ${taskKindLabel(task.kind)}, ${taskStatusLabel(task.status)}`
                                : `Expand ${taskKindLabel(task.kind)}, ${taskStatusLabel(task.status)}`
                            }
                            class={cn(
                              buttonVariants({ variant: "ghost" }),
                              "h-auto min-w-0 flex-1 items-start justify-start gap-2 rounded-lg px-3 py-2.5 text-left font-normal",
                              expanded() && "bg-transparent hover:bg-transparent",
                            )}
                            type="button"
                            onClick={() => void toggleTask(task.taskId)}
                          >
                            <span class="min-w-0 flex-1 space-y-2">
                              <span class="flex items-center justify-between gap-3">
                                <span class="min-w-0 truncate font-medium text-foreground text-sm">
                                  {taskKindLabel(task.kind)}
                                </span>
                                <span
                                  aria-hidden="true"
                                  class={cn("size-2 shrink-0 rounded-full", taskDotClass(task))}
                                />
                              </span>
                              <span class="flex items-center justify-between gap-3 text-muted-foreground text-xs">
                                <span class="min-w-0 truncate" title={task.workspacePath}>
                                  {workspaceName(task.workspacePath)} · updated{" "}
                                  {formatTime(task.updatedAtMs)}
                                </span>
                                <span class="flex shrink-0 items-center gap-2 tabular-nums">
                                  <Show when={task.progress.failed > 0}>
                                    <span class="text-destructive">
                                      {task.progress.failed} failed
                                    </span>
                                  </Show>
                                  <span>
                                    {task.progress.completed}/{task.progress.total} Positions
                                  </span>
                                </span>
                              </span>
                              <TaskProgressRail task={task} />
                            </span>
                          </button>
                          <Show when={canCancelTask(task)}>
                            <Button
                              class="mt-2.5 mr-2"
                              disabled={taskBusy()}
                              size="xs"
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                void runAction(`task:${task.taskId}`, task.taskId, (signal) =>
                                  props.gateway.cancelTask(task.taskId, signal),
                                )
                              }
                            >
                              <Show when={taskBusy()}>
                                <Spinner />
                              </Show>
                              Stop
                            </Button>
                          </Show>
                        </div>

                        <Show when={expanded()}>
                          <div class="mt-1 space-y-0.5 px-3">
                            <Show
                              when={loadingDetail() !== task.taskId}
                              fallback={
                                <div class="flex items-center gap-2 px-3 py-2.5 text-muted-foreground text-sm">
                                  <Spinner /> Loading task details…
                                </div>
                              }
                            >
                              <Show
                                when={detail()}
                                fallback={
                                  <p class="px-3 py-2.5 text-muted-foreground text-sm">
                                    Details could not be loaded. Close and reopen this task to try
                                    again.
                                  </p>
                                }
                              >
                                {(taskDetail) => (
                                  <ul class="space-y-0.5">
                                    <For each={taskDetail().steps}>
                                      {(step) => (
                                        <StepRow
                                          busy={busyAction() === `step:${step.stepId}`}
                                          step={step}
                                          onRetry={() =>
                                            void runAction(
                                              `step:${step.stepId}`,
                                              task.taskId,
                                              (signal) =>
                                                props.gateway.retryStep(step.stepId, signal),
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
          </ScrollArea>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

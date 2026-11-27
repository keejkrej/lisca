import { Command, Component, Subscription, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { StepDetail, TaskDetail, TaskSummary } from "@lisca/contracts";
import { Button, buttonVariants } from "@lisca/ui/button";
import { cn } from "@lisca/ui/cn";
import { Dialog } from "@lisca/ui/dialog";
import { Icon } from "@lisca/ui/icons";
import { ScrollArea } from "@lisca/ui/scroll-area";
import { Spinner } from "@lisca/ui/spinner";
import {
  canCancelTask,
  canDismissTask,
  canRetryStep,
  deriveTaskCenterIndicator,
  deriveTaskProgress,
  initialTaskCenterState,
  reconcileTaskCenterDetail,
  reconcileTaskCenterDismissed,
  reconcileTaskCenterSnapshot,
  stepKindLabel,
  taskKindLabel,
  taskProgressNoun,
  taskStatusLabel,
  type TaskCenterGateway,
  type TaskCenterState,
} from "@lisca/utils";
import { Context, Effect, Queue, Schema, Stream } from "effect";

export type TaskCenterSubscribe = (handlers: {
  readonly onSnapshot: (snapshot: Awaited<ReturnType<TaskCenterGateway["listTasks"]>>) => void;
  readonly onError: (error: unknown) => void;
}) => () => void;

export type TaskCenterServiceShape = {
  readonly gateway: TaskCenterGateway;
  readonly subscribe: TaskCenterSubscribe;
};

/** Runtime task center gateway + stream subscription provided via Effect Layer. */
export const TaskCenterPort = Context.Reference<TaskCenterServiceShape | null>(
  "lisca/TaskCenterPort",
  { defaultValue: () => null },
);

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

function TaskProgressRail<M>(h: Html.H<M>, task: TaskSummary) {
  const progress = deriveTaskProgress(task);
  return h.div
    .attr("aria-label", `${progress.completed} of ${progress.total} steps completed`)
    .attr("role", "progressbar")
    .attr("aria-valuemax", String(progress.total))
    .attr("aria-valuemin", "0")
    .attr("aria-valuenow", String(progress.completed))
    .class("flex h-1.5 w-full overflow-hidden rounded-none bg-muted")
    .children(
      h.div.class("bg-primary").style({ width: `${progress.completedPercent}%` }),
      h.div
        .class("bg-primary/35 motion-safe:animate-pulse")
        .style({ width: `${progress.runningPercent}%` }),
      h.div.class("bg-destructive").style({ width: `${progress.failedPercent}%` }),
      h.div.class("bg-muted-foreground/35").style({ width: `${progress.cancelledPercent}%` }),
    );
}

function positionLabel(stepKind: string | null | undefined): string {
  if (!stepKind) return "Current step";
  return stepKindLabel(stepKind);
}

function WorkProgressRail<M>(
  h: Html.H<M>,
  label: string,
  work: NonNullable<StepDetail["workProgress"]>,
) {
  const percent = work.total > 0 ? (work.completed / work.total) * 100 : 0;
  return h.div.class("space-y-1").children(
    h.div
      .class("flex justify-between gap-3 text-muted-foreground text-xs tabular-nums")
      .children(
        h.span.children(label),
        h.span.children(`${work.completed}/${work.total} ${work.unit}`),
      ),
    h.div
      .attr("aria-label", `${label} ${work.unit} progress`)
      .attr("aria-valuemax", String(work.total))
      .attr("aria-valuemin", "0")
      .attr("aria-valuenow", String(work.completed))
      .attr("role", "progressbar")
      .class("h-1.5 overflow-hidden rounded-none bg-muted")
      .children(h.div.class("h-full bg-primary").style({ width: `${percent}%` })),
  );
}

function statusTrack(status: StepDetail["status"]): {
  readonly width: string;
  readonly className: string;
  readonly value: number | null;
} {
  if (status === "completed") {
    return { width: "100%", className: "bg-primary", value: 1 };
  }
  if (status === "running" || status === "cancellation-requested") {
    return { width: "35%", className: "bg-primary/70 motion-safe:animate-pulse", value: null };
  }
  if (status === "failed") {
    return { width: "100%", className: "bg-destructive", value: 1 };
  }
  return { width: "0%", className: "bg-primary", value: 0 };
}

function StatusTrack<M>(h: Html.H<M>, label: string, status: StepDetail["status"]) {
  const track = statusTrack(status);
  let bar = h.div
    .attr("aria-label", `${label} progress`)
    .attr("aria-valuemax", "1")
    .attr("aria-valuemin", "0")
    .attr("role", "progressbar")
    .class("h-1.5 overflow-hidden rounded-none bg-muted");

  if (track.value !== null) {
    bar = bar.attr("aria-valuenow", String(track.value));
  }

  return h.div
    .class("space-y-1")
    .children(
      h.span.class("block truncate text-muted-foreground text-xs").children(label),
      bar.children(h.div.class(cn("h-full", track.className)).style({ width: track.width })),
    );
}

function StepRow<M>(
  h: Html.H<M>,
  options: { readonly step: StepDetail; readonly busy: boolean; readonly onRetry: M },
) {
  const latestError = options.step.attempts.at(-1)?.error;
  const label = positionLabel(options.step.stepKind);

  return h.li.key(options.step.stepId).children(
    h.div
      .class(
        cn(
          buttonVariants({ variant: "ghost" }),
          "h-auto w-full justify-start gap-2 rounded-lg px-3 py-2.5 font-normal",
        ),
      )
      .children(
        h.div
          .class("min-w-0 flex-1 space-y-1 text-left")
          .children(
            options.step.workProgress
              ? WorkProgressRail(h, label, options.step.workProgress)
              : StatusTrack(h, label, options.step.status),
            latestError
              ? h.span
                  .class("block truncate text-destructive text-xs")
                  .children(latestError.message)
              : undefined,
          ),
        canRetryStep(options.step)
          ? Button(h, {
              disabled: options.busy,
              size: "xs",
              type: "button",
              variant: "ghost",
              onPress: options.onRetry,
            }).children(Icon(h, "arrows-clockwise"), "Retry")
          : undefined,
      ),
  );
}

const TaskCenterMessage = UiSchema.TaggedEnum({
  SetOpen: { open: Schema.Boolean },
  SnapshotReceived: { snapshot: Schema.Any },
  RefreshErrored: { error: Schema.String },
  ToggleTask: { taskId: Schema.String },
  DetailLoaded: { taskId: Schema.String, detail: Schema.Any },
  DetailFailed: { taskId: Schema.String, error: Schema.String },
  CancelTask: { taskId: Schema.String },
  DismissTask: { taskId: Schema.String },
  RetryStep: { taskId: Schema.String, stepId: Schema.String },
  ActionFinished: {
    actionKey: Schema.String,
    taskId: Schema.String,
    dismissed: Schema.Boolean,
    detail: Schema.Any,
    error: Schema.NullOr(Schema.String),
  },
});

export const TaskCenterEvents = UiSchema.TaggedEnum({
  OpenChanged: { open: Schema.Boolean },
});

const FetchTaskDetailCmd = Command.make(
  "LiscaTaskCenterGetDetail",
  { args: { taskId: Schema.String } },
  ({ taskId }) =>
    Effect.gen(function* () {
      const port = yield* TaskCenterPort;
      if (!port) return Component.noop;
      return yield* Effect.tryPromise({
        try: (signal) => port.gateway.getTask(taskId, signal),
        catch: (error) => errorMessage(error),
      }).pipe(
        Effect.map((detail) => TaskCenterMessage.DetailLoaded({ taskId, detail })),
        Effect.catch((error) => Effect.succeed(TaskCenterMessage.DetailFailed({ taskId, error }))),
      );
    }),
);

const CancelTaskCmd = Command.make(
  "LiscaTaskCenterCancel",
  { args: { taskId: Schema.String } },
  ({ taskId }) =>
    Effect.gen(function* () {
      const port = yield* TaskCenterPort;
      if (!port) return Component.noop;
      return yield* Effect.tryPromise({
        try: (signal) => port.gateway.cancelTask(taskId, signal),
        catch: (error) => errorMessage(error),
      }).pipe(
        Effect.map((detail) =>
          TaskCenterMessage.ActionFinished({
            actionKey: `task:${taskId}`,
            taskId,
            dismissed: false,
            detail,
            error: null,
          }),
        ),
        Effect.catch((error) =>
          Effect.succeed(
            TaskCenterMessage.ActionFinished({
              actionKey: `task:${taskId}`,
              taskId,
              dismissed: false,
              detail: null,
              error,
            }),
          ),
        ),
      );
    }),
);

const DismissTaskCmd = Command.make(
  "LiscaTaskCenterDismiss",
  { args: { taskId: Schema.String } },
  ({ taskId }) =>
    Effect.gen(function* () {
      const port = yield* TaskCenterPort;
      if (!port) return Component.noop;
      return yield* Effect.tryPromise({
        try: (signal) => port.gateway.dismissTask(taskId, signal),
        catch: (error) => errorMessage(error),
      }).pipe(
        Effect.as(
          TaskCenterMessage.ActionFinished({
            actionKey: `dismiss:${taskId}`,
            taskId,
            dismissed: true,
            detail: null,
            error: null,
          }),
        ),
        Effect.catch((error) =>
          Effect.succeed(
            TaskCenterMessage.ActionFinished({
              actionKey: `dismiss:${taskId}`,
              taskId,
              dismissed: false,
              detail: null,
              error,
            }),
          ),
        ),
      );
    }),
);

const RetryStepCmd = Command.make(
  "LiscaTaskCenterRetryStep",
  { args: { taskId: Schema.String, stepId: Schema.String } },
  ({ taskId, stepId }) =>
    Effect.gen(function* () {
      const port = yield* TaskCenterPort;
      if (!port) return Component.noop;
      return yield* Effect.tryPromise({
        try: (signal) => port.gateway.retryStep(stepId, signal),
        catch: (error) => errorMessage(error),
      }).pipe(
        Effect.map((detail) =>
          TaskCenterMessage.ActionFinished({
            actionKey: `step:${stepId}`,
            taskId,
            dismissed: false,
            detail,
            error: null,
          }),
        ),
        Effect.catch((error) =>
          Effect.succeed(
            TaskCenterMessage.ActionFinished({
              actionKey: `step:${stepId}`,
              taskId,
              dismissed: false,
              detail: null,
              error,
            }),
          ),
        ),
      );
    }),
);

const TaskCenterComponent = Html.component({
  name: "TaskCenter",
  props: Schema.Struct({
    appearance: Schema.optional(Schema.Literals(["button", "status-link"])),
    description: Schema.optional(Schema.String),
    emptyMessage: Schema.optional(Schema.String),
    emptyTitle: Schema.optional(Schema.String),
    label: Schema.optional(Schema.String),
    title: Schema.optional(Schema.String),
    open: Schema.optional(Schema.Boolean),
    shortcutKeys: Schema.optional(Schema.String),
    shortcutHintText: Schema.optional(Schema.String),
  }),
  model: Schema.Struct({
    uncontrolledOpen: Schema.Boolean,
    state: Schema.Any,
    expandedTaskId: Schema.NullOr(Schema.String),
    loadingDetail: Schema.NullOr(Schema.String),
    busyAction: Schema.NullOr(Schema.String),
    refreshError: Schema.NullOr(Schema.String),
    actionError: Schema.NullOr(Schema.String),
  }),
  message: TaskCenterMessage,
  events: TaskCenterEvents,
}).make({
  init: () => ({
    uncontrolledOpen: false,
    state: initialTaskCenterState,
    expandedTaskId: null,
    loadingDetail: null,
    busyAction: null,
    refreshError: null,
    actionError: null,
  }),
  update: {
    SetOpen: ($, { open }) => {
      const step = $.props.open === undefined ? $.evolve({ uncontrolledOpen: open }) : $;
      return step.emit(TaskCenterEvents.OpenChanged({ open }));
    },
    SnapshotReceived: ($, { snapshot }) => {
      const current = $.model.state as TaskCenterState;
      const next = reconcileTaskCenterSnapshot(
        current,
        snapshot as Awaited<ReturnType<TaskCenterGateway["listTasks"]>>,
      );
      const expandedId = $.model.expandedTaskId;
      let shouldRefreshExpanded = false;
      if (expandedId) {
        const summary = next.tasks.find((task) => task.taskId === expandedId);
        const detail = next.details[expandedId];
        shouldRefreshExpanded = Boolean(
          summary && (!detail || summary.updatedAtMs > detail.task.updatedAtMs),
        );
      }
      const step = $.evolve({ state: next, refreshError: null });
      return shouldRefreshExpanded && expandedId
        ? step.run(FetchTaskDetailCmd.make({ taskId: expandedId }))
        : step;
    },
    RefreshErrored: ($, { error }) => $.evolve({ refreshError: error }),
    ToggleTask: ($, { taskId }) => {
      if ($.model.expandedTaskId === taskId) {
        return $.evolve({ expandedTaskId: null });
      }
      const current = $.model.state as TaskCenterState;
      const hasCached = Boolean(current.details[taskId]);
      return $.evolve({
        expandedTaskId: taskId,
        actionError: null,
        loadingDetail: hasCached ? null : taskId,
      }).run(FetchTaskDetailCmd.make({ taskId }));
    },
    DetailLoaded: ($, { taskId, detail }) => {
      const current = $.model.state as TaskCenterState;
      const next = reconcileTaskCenterDetail(current, detail as TaskDetail);
      return $.evolve({
        state: next,
        loadingDetail: $.model.loadingDetail === taskId ? null : $.model.loadingDetail,
      });
    },
    DetailFailed: ($, { taskId, error }) =>
      $.evolve({
        actionError: error,
        loadingDetail: $.model.loadingDetail === taskId ? null : $.model.loadingDetail,
      }),
    CancelTask: ($, { taskId }) =>
      $.evolve({ busyAction: `task:${taskId}`, actionError: null }).run(
        CancelTaskCmd.make({ taskId }),
      ),
    DismissTask: ($, { taskId }) =>
      $.evolve({ busyAction: `dismiss:${taskId}`, actionError: null }).run(
        DismissTaskCmd.make({ taskId }),
      ),
    RetryStep: ($, { taskId, stepId }) =>
      $.evolve({ busyAction: `step:${stepId}`, actionError: null }).run(
        RetryStepCmd.make({ taskId, stepId }),
      ),
    ActionFinished: ($, { actionKey, taskId, dismissed, detail, error }) => {
      const current = $.model.state as TaskCenterState;
      let nextState = current;
      let nextExpanded = $.model.expandedTaskId;
      if (!error) {
        if (dismissed) {
          nextState = reconcileTaskCenterDismissed(current, taskId);
          if (nextExpanded === taskId) nextExpanded = null;
        } else if (detail) {
          nextState = reconcileTaskCenterDetail(current, detail as TaskDetail);
        }
      }
      return $.evolve({
        state: nextState,
        expandedTaskId: nextExpanded,
        actionError: error,
        busyAction: $.model.busyAction === actionKey ? null : $.model.busyAction,
      });
    },
  },
  subscriptions: () => [
    Subscription.make(
      "task-center-events",
      Stream.unwrap(
        Effect.gen(function* () {
          const port = yield* TaskCenterPort;
          if (!port) return Stream.empty;
          return Stream.callback<typeof TaskCenterMessage.Type>((queue) => {
            const stop = port.subscribe({
              onSnapshot: (snapshot) => {
                Queue.offerUnsafe(queue, TaskCenterMessage.SnapshotReceived({ snapshot }));
              },
              onError: (error) => {
                Queue.offerUnsafe(
                  queue,
                  TaskCenterMessage.RefreshErrored({ error: errorMessage(error) }),
                );
              },
            });
            return Effect.addFinalizer(() => Effect.sync(stop));
          });
        }),
      ),
    ),
  ],
  view: (h, model) => {
    const open = h.props.open ?? model.uncontrolledOpen;
    const state = model.state as TaskCenterState;
    const indicator = deriveTaskCenterIndicator(state.tasks);
    const statusLink = h.props.appearance === "status-link";
    const label = h.props.label ?? "Tasks";
    const title = h.props.title ?? "Task Center";

    return Dialog(h, {
      props: { open, modal: true },
      onEmit: {
        RequestedOpen: () => TaskCenterMessage.SetOpen({ open: true }),
        RequestedClose: () => TaskCenterMessage.SetOpen({ open: false }),
        Settled: () => undefined,
      },
      view: (dialog) => {
        let trigger = dialog
          .trigger(h.button)
          .attr(
            "aria-label",
            indicator.tone === "attention"
              ? `${label}, ${indicator.attentionCount} need attention`
              : `${label}, ${indicator.activeCount} active`,
          )
          .attr("data-task-center-appearance", h.props.appearance ?? "button")
          .class(
            cn(
              buttonVariants({ size: "sm", variant: statusLink ? "outline" : "ghost" }),
              "relative",
              statusLink && "h-7 gap-2 px-2.5 text-xs text-foreground",
            ),
          );

        if (h.props.shortcutKeys !== undefined) {
          trigger = trigger.attr("aria-keyshortcuts", h.props.shortcutKeys);
        }

        const showBadge = statusLink ? indicator.activeCount > 0 : indicator.tone !== "idle";

        return h.span.class("inline-flex").children(
          trigger.children(
            !statusLink ? Icon(h, "queue", { class: "size-4" }) : undefined,
            h.span.class(statusLink ? undefined : "hidden sm:inline").children(label),
            h.props.shortcutHintText
              ? h.kbd
                  .class("font-mono text-[10px] text-muted-foreground")
                  .children(h.props.shortcutHintText)
              : undefined,
            showBadge
              ? h.span
                  .attr("aria-hidden", "true")
                  .attr("data-slot", "task-badge")
                  .class(
                    cn(
                      "flex min-w-4 items-center justify-center rounded-none px-1 text-[10px] leading-4",
                      statusLink
                        ? "bg-foreground text-background"
                        : indicator.tone === "attention"
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-primary text-primary-foreground",
                    ),
                  )
                  .children(
                    String(
                      statusLink
                        ? indicator.activeCount
                        : indicator.tone === "attention"
                          ? "!"
                          : indicator.activeCount,
                    ),
                  )
              : undefined,
          ),
          dialog.portal(h.dialog)?.children(
            dialog
              .backdrop(h.div)
              ?.attr("data-testid", "task-center-overlay")
              .class(cn("fixed inset-0 z-50", statusLink ? "bg-foreground/40" : "bg-black/50")),
            dialog
              .popup(h.div)
              .attr("role", "dialog")
              .attr("aria-modal", "true")
              .class(
                cn(
                  "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100%-2.5rem)] w-[calc(100%-3rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border border-border bg-background text-foreground sm:max-h-[calc(100%-4rem)]",
                  statusLink
                    ? "max-w-[32.5rem] rounded-none shadow-none"
                    : "max-w-2xl rounded-none shadow-2xl",
                ),
              )
              .children(
                h.div
                  .class("flex items-start justify-between gap-4 border-b border-border px-5 py-4")
                  .children(
                    h.div.class("space-y-1").children(
                      dialog
                        .title(h.h2)
                        .class("font-semibold text-foreground text-lg")
                        .children(title),
                      dialog
                        .description(h.p)
                        .class("text-muted-foreground text-sm")
                        .children(
                          h.props.description ??
                            "Background computations and recent results. Click a task to expand its steps.",
                        ),
                    ),
                    dialog
                      .initialFocus(dialog.close(h.button))
                      .attr("aria-label", `Close ${title}`)
                      .class(buttonVariants({ size: "icon-sm", variant: "ghost" }))
                      .children(Icon(h, "x")),
                  ),
                model.refreshError
                  ? h.div
                      .class(
                        "flex items-start gap-2 border-b border-destructive/30 bg-destructive/5 px-5 py-2.5 text-destructive text-sm",
                      )
                      .children(
                        Icon(h, "warning-circle", { class: "mt-0.5 size-4 shrink-0" }),
                        h.span.children(
                          "Task updates are temporarily unavailable. Showing the last known state.",
                        ),
                      )
                  : undefined,
                model.actionError
                  ? h.div
                      .attr("aria-live", "assertive")
                      .class(
                        "flex items-start gap-2 border-b border-destructive/30 bg-destructive/5 px-5 py-2.5 text-destructive text-sm",
                      )
                      .children(
                        Icon(h, "warning-circle", { class: "mt-0.5 size-4 shrink-0" }),
                        h.span.children(model.actionError),
                      )
                  : undefined,
                ScrollArea(h, {
                  class: "min-h-52 flex-1",
                  viewportClass: "overscroll-contain",
                  children:
                    state.tasks.length > 0
                      ? h.ul.class("space-y-1 px-3 py-3").children(
                          ...state.tasks.map((task) => {
                            const expanded = model.expandedTaskId === task.taskId;
                            const detail = state.details[task.taskId];
                            const taskBusy = model.busyAction === `task:${task.taskId}`;
                            const dismissBusy = model.busyAction === `dismiss:${task.taskId}`;
                            return h.li.key(task.taskId).children(
                              h.div
                                .class(
                                  cn(
                                    "flex items-start gap-2 rounded-lg",
                                    expanded && "bg-muted/50",
                                  ),
                                )
                                .children(
                                  h.button
                                    .attr("type", "button")
                                    .attr("aria-expanded", expanded ? "true" : "false")
                                    .attr(
                                      "aria-label",
                                      expanded
                                        ? `Collapse ${taskKindLabel(task.kind)}, ${taskStatusLabel(task.status)}`
                                        : `Expand ${taskKindLabel(task.kind)}, ${taskStatusLabel(task.status)}`,
                                    )
                                    .class(
                                      cn(
                                        buttonVariants({ variant: "ghost" }),
                                        "h-auto min-w-0 flex-1 items-start justify-start gap-2 rounded-lg px-3 py-2.5 text-left font-normal",
                                        expanded && "bg-transparent hover:bg-transparent",
                                      ),
                                    )
                                    .on(
                                      "click",
                                      TaskCenterMessage.ToggleTask({ taskId: task.taskId }),
                                    )
                                    .children(
                                      h.span.class("min-w-0 flex-1 space-y-2").children(
                                        h.span
                                          .class("flex items-center justify-between gap-3")
                                          .children(
                                            h.span
                                              .class("flex min-w-0 items-center gap-1.5")
                                              .children(
                                                Icon(h, expanded ? "caret-up" : "caret-down", {
                                                  class: "size-3.5 shrink-0 text-muted-foreground",
                                                }),
                                                h.span
                                                  .class(
                                                    "min-w-0 truncate font-medium text-foreground text-sm",
                                                  )
                                                  .children(taskKindLabel(task.kind)),
                                              ),
                                            h.span
                                              .attr("aria-hidden", "true")
                                              .class(
                                                cn(
                                                  "size-2 shrink-0 rounded-full",
                                                  taskDotClass(task),
                                                ),
                                              ),
                                          ),
                                        h.span
                                          .class(
                                            "flex items-center justify-between gap-3 text-muted-foreground text-xs",
                                          )
                                          .children(
                                            h.span
                                              .attr("title", task.workspacePath)
                                              .class("min-w-0 truncate")
                                              .children(
                                                `${workspaceName(task.workspacePath)} · updated ${formatTime(task.updatedAtMs)}`,
                                              ),
                                            h.span
                                              .class(
                                                "flex shrink-0 items-center gap-2 tabular-nums",
                                              )
                                              .children(
                                                task.progress.failed > 0
                                                  ? h.span
                                                      .class("text-destructive")
                                                      .children(`${task.progress.failed} failed`)
                                                  : undefined,
                                                h.span.children(
                                                  `${task.progress.completed}/${task.progress.total} ${taskProgressNoun(task.kind)}`,
                                                ),
                                              ),
                                          ),
                                        TaskProgressRail(h, task),
                                      ),
                                    ),
                                  canCancelTask(task)
                                    ? Button(h, {
                                        class: "mt-2.5 mr-2",
                                        disabled: taskBusy,
                                        size: "xs",
                                        type: "button",
                                        variant: "ghost",
                                        onPress: TaskCenterMessage.CancelTask({
                                          taskId: task.taskId,
                                        }),
                                      }).children(taskBusy ? Spinner(h) : undefined, "Stop")
                                    : undefined,
                                  canDismissTask(task)
                                    ? Button(h, {
                                        class: "mt-2.5 mr-2",
                                        disabled: dismissBusy,
                                        size: "xs",
                                        type: "button",
                                        variant: "ghost",
                                        onPress: TaskCenterMessage.DismissTask({
                                          taskId: task.taskId,
                                        }),
                                      }).children(dismissBusy ? Spinner(h) : undefined, "Dismiss")
                                    : undefined,
                                ),
                              expanded
                                ? h.div.class("mt-1 space-y-0.5 px-3").children(
                                    model.loadingDetail === task.taskId
                                      ? h.div
                                          .class(
                                            "flex items-center gap-2 px-3 py-2.5 text-muted-foreground text-sm",
                                          )
                                          .children(Spinner(h), " Loading task details…")
                                      : detail
                                        ? h.ul.class("space-y-0.5").children(
                                            ...detail.steps.map((step) =>
                                              StepRow(h, {
                                                busy: model.busyAction === `step:${step.stepId}`,
                                                step,
                                                onRetry: TaskCenterMessage.RetryStep({
                                                  taskId: task.taskId,
                                                  stepId: step.stepId,
                                                }),
                                              }),
                                            ),
                                          )
                                        : h.p
                                            .class("px-3 py-2.5 text-muted-foreground text-sm")
                                            .children(
                                              "Details could not be loaded. Close and reopen this task to try again.",
                                            ),
                                  )
                                : undefined,
                            );
                          }),
                        )
                      : h.div
                          .class(
                            "flex min-h-52 flex-col items-center justify-center gap-2 px-6 py-12 text-center",
                          )
                          .children(
                            Icon(h, "queue", { class: "size-7 text-muted-foreground" }),
                            h.p
                              .class("font-medium text-foreground text-sm")
                              .children(h.props.emptyTitle ?? "No tasks yet"),
                            h.p
                              .class("max-w-sm text-muted-foreground text-sm")
                              .children(
                                h.props.emptyMessage ??
                                  "Long-running computations will appear here.",
                              ),
                          ),
                }),
              ),
          ),
        );
      },
    });
  },
});

export type TaskCenterOptions<M> = {
  readonly key?: string | undefined;
  readonly appearance?: "button" | "status-link" | undefined;
  readonly description?: string | undefined;
  readonly emptyMessage?: string | undefined;
  readonly emptyTitle?: string | undefined;
  readonly label?: string | undefined;
  readonly title?: string | undefined;
  readonly open?: boolean | undefined;
  readonly onOpenChange?: ((open: boolean) => M) | undefined;
  readonly shortcutKeys?: string | undefined;
  readonly shortcutHintText?: string | undefined;
};

export type TaskCenterProps<M = never> = TaskCenterOptions<M>;

export function TaskCenter<M>(h: Html.H<M>, options: TaskCenterOptions<M> = {}) {
  return TaskCenterComponent(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      ...(options.appearance !== undefined ? { appearance: options.appearance } : {}),
      ...(options.description !== undefined ? { description: options.description } : {}),
      ...(options.emptyMessage !== undefined ? { emptyMessage: options.emptyMessage } : {}),
      ...(options.emptyTitle !== undefined ? { emptyTitle: options.emptyTitle } : {}),
      ...(options.label !== undefined ? { label: options.label } : {}),
      ...(options.title !== undefined ? { title: options.title } : {}),
      ...(options.open !== undefined ? { open: options.open } : {}),
      ...(options.shortcutKeys !== undefined ? { shortcutKeys: options.shortcutKeys } : {}),
      ...(options.shortcutHintText !== undefined
        ? { shortcutHintText: options.shortcutHintText }
        : {}),
    },
    onEmit: {
      OpenChanged: ({ open }) => options.onOpenChange?.(open),
    },
  });
}

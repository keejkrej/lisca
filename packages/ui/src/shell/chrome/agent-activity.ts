import { Command, Component, Subscription, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Effect, Schema, Stream } from "effect";

import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

export const ShellWorkspaceControlModeSchema = Schema.Literals([
  "human-control",
  "agent-running",
  "agent-paused",
  "user-takeover",
]);
export type ShellWorkspaceControlMode = typeof ShellWorkspaceControlModeSchema.Type;

export const ShellWorkspaceControlOperationSchema = Schema.Struct({
  requestId: Schema.String,
  kind: Schema.Literals(["mutation", "crop", "analysis"]),
  label: Schema.String,
  detail: Schema.optional(Schema.NullOr(Schema.String)),
});
export type ShellWorkspaceControlOperation = typeof ShellWorkspaceControlOperationSchema.Type;

export const ShellWorkspaceControlSessionSchema = Schema.Struct({
  workspacePath: Schema.String,
  mode: ShellWorkspaceControlModeSchema,
  agentName: Schema.optional(Schema.NullOr(Schema.String)),
  operation: Schema.optional(Schema.NullOr(ShellWorkspaceControlOperationSchema)),
  revision: Schema.Number,
});
export type ShellWorkspaceControlSession = typeof ShellWorkspaceControlSessionSchema.Type;

type DesktopControlBridge = {
  controlList?: () => Promise<ShellWorkspaceControlSession[]>;
  controlPause?: (workspacePath: string) => Promise<ShellWorkspaceControlSession>;
  controlTakeover?: (workspacePath: string) => Promise<ShellWorkspaceControlSession>;
  controlHandback?: (workspacePath: string) => Promise<ShellWorkspaceControlSession>;
  controlStop?: (workspacePath: string) => Promise<ShellWorkspaceControlSession>;
};

function desktopControlBridge(): DesktopControlBridge | null {
  if (typeof window === "undefined") return null;
  const desktop = (window as Window & { liscaDesktop?: DesktopControlBridge }).liscaDesktop;
  return desktop?.controlList ? desktop : null;
}

const INERT_STAGE_SELECTOR =
  "#main-content, aside[aria-label='Left panel'], aside[aria-label='Right panel']";

function setStageInert(inert: boolean): void {
  if (typeof document === "undefined") return;
  for (const element of document.querySelectorAll<HTMLElement>(INERT_STAGE_SELECTOR)) {
    element.inert = inert;
  }
}

const AgentActionKindSchema = Schema.Literals(["pause", "takeover", "handback", "stop"]);

const ShellAgentActivityMessage = UiSchema.TaggedEnum({
  PollRequested: {},
  LoadedSessions: { sessions: Schema.Array(ShellWorkspaceControlSessionSchema) },
  LoadFailed: { error: Schema.String },
  ActionRequested: { action: AgentActionKindSchema },
  ActionFinished: { error: Schema.NullOr(Schema.String) },
});

export const ShellAgentActivityEvents = UiSchema.TaggedEnum({
  SessionsChanged: { sessions: Schema.Array(ShellWorkspaceControlSessionSchema) },
});

const RefreshSessionsCommand = Command.make("LiscaAgentRefreshSessions", { args: {} }, () =>
  Effect.gen(function* () {
    const bridge = desktopControlBridge();
    if (!bridge?.controlList) return Component.noop;
    const result = yield* Effect.tryPromise({
      try: () => bridge.controlList!(),
      catch: (cause) => (cause instanceof Error ? cause.message : "Could not read agent activity."),
    }).pipe(
      Effect.map((sessions) => ShellAgentActivityMessage.LoadedSessions({ sessions })),
      Effect.catch((error) => Effect.succeed(ShellAgentActivityMessage.LoadFailed({ error }))),
    );
    return result;
  }),
);

const RunAgentActionCommand = Command.make(
  "LiscaAgentRunAction",
  {
    args: {
      action: AgentActionKindSchema,
      workspacePath: Schema.String,
    },
  },
  ({ action, workspacePath }) =>
    Effect.gen(function* () {
      const bridge = desktopControlBridge();
      const fn =
        action === "pause"
          ? bridge?.controlPause
          : action === "takeover"
            ? bridge?.controlTakeover
            : action === "handback"
              ? bridge?.controlHandback
              : bridge?.controlStop;
      if (!fn) {
        return ShellAgentActivityMessage.ActionFinished({ error: null });
      }
      const error = yield* Effect.tryPromise({
        try: () => fn(workspacePath),
        catch: (cause) =>
          cause instanceof Error ? cause.message : "Could not change workspace control.",
      }).pipe(
        Effect.as(null as string | null),
        Effect.catch((msg) => Effect.succeed(msg)),
      );
      return ShellAgentActivityMessage.ActionFinished({ error });
    }),
);

/**
 * Full-width replacement for the top bar while an MCP agent owns a workspace.
 * Restores normal chrome when the session ends.
 */
export const ShellAgentActivity = Html.component({
  name: "ShellAgentActivity",
  props: Schema.Struct({
    class: Schema.optional(Schema.String),
  }),
  model: Schema.Struct({
    sessions: Schema.Array(ShellWorkspaceControlSessionSchema),
    busy: Schema.Boolean,
    error: Schema.NullOr(Schema.String),
  }),
  message: ShellAgentActivityMessage,
  events: ShellAgentActivityEvents,
}).make({
  init: ($) => $.set({ sessions: [], busy: false, error: null }).run(RefreshSessionsCommand.make()),
  update: {
    PollRequested: ($) => $.run(RefreshSessionsCommand.make()),
    LoadedSessions: ($, { sessions }) =>
      $.evolve({ sessions, error: null }).emit(
        ShellAgentActivityEvents.SessionsChanged({ sessions }),
      ),
    LoadFailed: ($, { error }) => $.evolve({ error }),
    ActionRequested: ($, { action }) => {
      const current = $.model.sessions[0];
      if (!current) return $.model;
      return $.evolve({ busy: true }).run(
        RunAgentActionCommand.make({ action, workspacePath: current.workspacePath }),
      );
    },
    ActionFinished: ($, { error }) =>
      $.evolve({ busy: false, error }).run(RefreshSessionsCommand.make()),
  },
  subscriptions: ({ model }) => {
    const mode = model.sessions[0]?.mode;
    const agentHasControl = mode === "agent-running" || mode === "agent-paused";
    const hasBridge = desktopControlBridge() !== null;
    return [
      hasBridge &&
        Subscription.make(
          "agent-activity-poll",
          Stream.tick("1 second").pipe(Stream.as(ShellAgentActivityMessage.PollRequested())),
        ),
      Subscription.make("agent-stage-inert", agentHasControl, (inert) =>
        Stream.unwrap(
          Effect.acquireRelease(
            Effect.sync(() => {
              setStageInert(inert);
            }),
            () =>
              Effect.sync(() => {
                setStageInert(false);
              }),
          ).pipe(Effect.as(Stream.never)),
        ),
      ),
    ];
  },
  view: (h, model) => {
    const session = model.sessions[0];
    if (!session) return View.text("");

    const subLabel = session.mode === "user-takeover" ? "Agent paused" : session.operation?.label;

    return h.div
      .attr("aria-live", "polite")
      .attr("data-agent-state", session.mode)
      .attr(
        "title",
        `${session.workspacePath} · revision ${session.revision}${model.error ? `\n${model.error}` : ""}`,
      )
      .class(
        cn(
          "col-span-3 flex h-full w-full min-w-0 items-center justify-between gap-3 text-sm",
          h.props.class,
        ),
      )
      .children(
        h.span
          .class("flex min-w-0 items-center gap-2 text-muted-foreground")
          .children(
            h.span
              .attr("aria-hidden", "true")
              .class(
                `size-2 shrink-0 rounded-full ${
                  session.mode === "agent-running" ? "animate-pulse bg-primary" : "bg-amber-500"
                }`,
              ),
            h.span
              .class("truncate")
              .children(
                h.span
                  .class("font-medium text-foreground")
                  .children(
                    session.mode === "user-takeover"
                      ? "You have control"
                      : `${session.agentName ?? "unknown"} agent is controlling`,
                  ),
                subLabel ? h.span.children(` · ${subLabel}`) : undefined,
                session.operation?.detail
                  ? h.span.children(` · ${session.operation.detail}`)
                  : undefined,
              ),
          ),
        h.div.class("flex shrink-0 items-center gap-1").children(
          session.mode === "agent-running"
            ? Button(h, {
                disabled: model.busy,
                size: "sm",
                type: "button",
                variant: "ghost",
                onPress: ShellAgentActivityMessage.ActionRequested({ action: "pause" }),
              }).children("Pause")
            : undefined,
          session.mode !== "user-takeover"
            ? Button(h, {
                class: "shrink-0",
                disabled: model.busy,
                size: "sm",
                type: "button",
                variant: "ghost",
                onPress: ShellAgentActivityMessage.ActionRequested({ action: "takeover" }),
              }).children("Take over")
            : undefined,
          session.mode !== "agent-running"
            ? Button(h, {
                class: "shrink-0",
                disabled: model.busy,
                size: "sm",
                type: "button",
                variant: "ghost",
                onPress: ShellAgentActivityMessage.ActionRequested({ action: "handback" }),
              }).children("Hand back")
            : undefined,
          Button(h, {
            class: "shrink-0",
            disabled: model.busy,
            size: "sm",
            type: "button",
            variant: "ghost",
            onPress: ShellAgentActivityMessage.ActionRequested({ action: "stop" }),
          }).children("Stop"),
        ),
      );
  },
});

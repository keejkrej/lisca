import { Command, Component, Subscription, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import {
  ShellWorkspaceControlSessionSchema,
  type ShellWorkspaceControlSession,
} from "@lisca/ui/shell";
import { Effect, Schema, Stream } from "effect";

import {
  StudioNavigationMessage,
  StudioNavigationProvider,
  type StudioRouteTo,
} from "../navigation/studio-router";
import { refreshStudioRoi } from "../state/studio-crop-watch";
import { getActiveStudioSession } from "../state/studio-session-context";

const openedWorkspaces = new Set<string>();
const workspaceRoutes = new Map<string, StudioRouteTo>();
const workspaceRevisions = new Map<string, number>();
let lastOperationKey: string | null = null;

function operationRoute(session: ShellWorkspaceControlSession): StudioRouteTo {
  switch (session.operation?.kind) {
    case "crop":
      return "/annotate";
    case "analysis":
      return "/analysis";
    default: {
      const label = session.operation?.label.toLowerCase() ?? "";
      if (label.includes("align")) return "/align";
      return "/metadata";
    }
  }
}

const AgentNavMsg = UiSchema.TaggedEnum({
  SyncSession: {},
  NavigateTo: { to: Schema.String },
});

const FollowAgentCommand = Command.make(
  "StudioFollowAgentWorkspace",
  { args: { session: ShellWorkspaceControlSessionSchema } },
  ({ session }) =>
    Effect.gen(function* () {
      let studioSession: ReturnType<typeof getActiveStudioSession>;
      try {
        studioSession = getActiveStudioSession();
      } catch {
        return Component.noop;
      }

      const prevRevision = workspaceRevisions.get(session.workspacePath);
      if (prevRevision !== session.revision) {
        workspaceRevisions.set(session.workspacePath, session.revision);
        if (openedWorkspaces.has(session.workspacePath)) {
          refreshStudioRoi(session.workspacePath);
        }
      }
      if (session.mode !== "agent-running") return Component.noop;
      const operation = session.operation;
      if (!operation && openedWorkspaces.has(session.workspacePath)) return Component.noop;
      const operationKey = `${session.workspacePath}:${operation?.requestId ?? "session"}`;
      if (operationKey === lastOperationKey) return Component.noop;
      lastOperationKey = operationKey;

      const route = yield* Effect.tryPromise({
        try: async () => {
          if (!openedWorkspaces.has(session.workspacePath)) {
            await studioSession.openAssay(`${session.workspacePath}/assay.json`);
            openedWorkspaces.add(session.workspacePath);
          }
          return operationRoute(session);
        },
        catch: (cause) => cause,
      }).pipe(
        Effect.catch((cause) =>
          Effect.sync(() => {
            console.error("Could not follow the agent workspace", cause);
            return null;
          }),
        ),
      );

      if (!route || workspaceRoutes.get(session.workspacePath) === route) {
        return Component.noop;
      }
      workspaceRoutes.set(session.workspacePath, route);
      return AgentNavMsg.NavigateTo({ to: route });
    }),
);

function sessionFingerprint(session: ShellWorkspaceControlSession | undefined): string {
  if (!session) return "";
  return [
    session.workspacePath,
    session.revision,
    session.mode,
    session.operation?.requestId ?? "",
    session.operation?.kind ?? "",
    session.operation?.label ?? "",
  ].join("\0");
}

const StudioAgentNavigationComponent = Html.component({
  name: "StudioAgentNavigation",
  props: Schema.Struct({
    sessions: Schema.Array(ShellWorkspaceControlSessionSchema),
  }),
  model: Schema.Struct({}),
  message: AgentNavMsg,
  reads: {
    nav: StudioNavigationProvider,
  },
}).make({
  init: () => ({}),
  update: {
    SyncSession: ($) => {
      const current = $.props.sessions[0];
      if (!current) return $.model;
      return $.run(FollowAgentCommand.make({ session: current }));
    },
    NavigateTo: ($, { to }) =>
      $.send(StudioNavigationProvider, StudioNavigationMessage.Navigate({ to })),
  },
  subscriptions: ({ props }) => {
    const fingerprint = sessionFingerprint(props.sessions[0]);
    return [
      fingerprint.length > 0 &&
        Subscription.make("studio-agent-nav-sync", fingerprint, () =>
          Stream.make(AgentNavMsg.SyncSession()),
        ),
    ];
  },
  view: () => View.text(""),
});

export type StudioAgentNavigationOptions = {
  readonly key?: string | undefined;
  readonly sessions: readonly ShellWorkspaceControlSession[];
};

/**
 * Follow backend agent work in the visible Studio session. Opening and route
 * changes are keyed by workspace and operation id, so progress polling does not
 * repeatedly reset the page.
 */
export function StudioAgentNavigation<M>(h: Html.H<M>, options: StudioAgentNavigationOptions) {
  return StudioAgentNavigationComponent(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: { sessions: options.sessions },
  });
}

import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import {
  ConnectionStatus,
  ShellHelpDialog,
  ShellServerProvider,
  ShellThemeToggle,
  ShellWorkspaceControlSessionSchema,
  type QuickGuideTopicId,
} from "@lisca/ui/shell";
import { Schema } from "effect";

import { setStudioExpertMode, studioExpertModeAtom } from "../atoms/studio-expert-atoms";
import { StudioNavigationProvider } from "../navigation/studio-router";
import { studioCommandShortcutSubscription } from "../navigation/use-studio-command-shortcut";
import { setStudioAtom, studioRegistry } from "../state/studio-registry";
import { AgentActivity } from "./agent-activity";
import { StudioAgentNavigation } from "./studio-agent-navigation";
import { StudioExpertToggle } from "./studio-expert-toggle";
import { StudioSettings } from "./studio-settings";
import { StudioPageTaskCenter } from "./studio-task-center";

function studioGuideTopicForPath(pathname: string): QuickGuideTopicId {
  if (pathname.startsWith("/metadata")) return "metadata";
  if (pathname.startsWith("/align")) return "align";
  if (pathname.startsWith("/annotate")) return "annotate";
  if (pathname.startsWith("/analysis")) return "analysis";
  return "assay";
}

const StudioTopBarMsg = UiSchema.TaggedEnum({
  ToggleExpert: {},
  SessionsChanged: { sessions: Schema.Array(ShellWorkspaceControlSessionSchema) },
});

const StudioTopBarComponent = Html.component({
  name: "StudioTopBar",
  props: Schema.Struct({
    showExpert: Schema.Boolean,
  }),
  model: Schema.Struct({
    agentSessions: Schema.Array(ShellWorkspaceControlSessionSchema),
  }),
  message: StudioTopBarMsg,
  reads: {
    server: ShellServerProvider,
    nav: StudioNavigationProvider,
  },
}).make({
  init: () => ({ agentSessions: [] }),
  update: {
    ToggleExpert: ($) => {
      const next = !studioRegistry.get(studioExpertModeAtom);
      setStudioAtom(studioExpertModeAtom, next);
      setStudioExpertMode(next);
      return $.model;
    },
    SessionsChanged: ($, { sessions }) => $.evolve({ agentSessions: sessions }),
  },
  subscriptions: () => [
    studioCommandShortcutSubscription("expert", true, StudioTopBarMsg.ToggleExpert()),
  ],
  view: (h, model) => {
    const agentActive = model.agentSessions.length > 0;
    const pathname = h.reads.nav.pathname;

    return h.div
      .attr("aria-label", "Studio status bar")
      .attr("role", "region")
      .class("grid h-full w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3")
      .children(
        h.h1.class("sr-only").children("LiSCA"),
        !agentActive
          ? [
              h.div
                .key("left")
                .class("flex min-w-0 items-center gap-2")
                .children(
                  StudioPageTaskCenter(h, { key: "task-center" }),
                  h.props.showExpert ? StudioExpertToggle(h, { key: "expert-toggle" }) : undefined,
                ),
              h.span
                .key("brand")
                .attr("aria-hidden", "true")
                .class("pointer-events-none text-xs font-semibold tracking-[0.2em] text-foreground")
                .children("LiSCA"),
              h.div
                .key("right")
                .class("flex items-center justify-end gap-2")
                .children(
                  ConnectionStatus(h, {
                    key: "connection-status",
                    props: { state: h.reads.server.state },
                  }),
                  ShellHelpDialog(h, {
                    key: "help-dialog",
                    props: { topic: studioGuideTopicForPath(pathname) },
                  }),
                  StudioSettings(h, { key: "settings" }),
                  ShellThemeToggle(h, { key: "theme-toggle", props: { class: "size-7" } }),
                ),
            ]
          : undefined,
        AgentActivity(h, {
          key: "agent-activity",
          onSessionsChange: (sessions) => StudioTopBarMsg.SessionsChanged({ sessions }),
        }),
        StudioAgentNavigation(h, {
          key: "agent-navigation",
          sessions: model.agentSessions,
        }),
      );
  },
});

export type StudioTopBarOptions = {
  readonly key?: string | undefined;
  readonly showExpert?: boolean | undefined;
};

export function StudioTopBar<M>(h: Html.H<M>, options?: StudioTopBarOptions) {
  return StudioTopBarComponent(h, {
    ...(options?.key !== undefined ? { key: options.key } : {}),
    props: { showExpert: options?.showExpert ?? false },
  });
}

import { UiSchema, type View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Schema } from "effect";

import { Icon } from "../../icons";
import { cn } from "../../lib/utils";
import { PathButton } from "../../patterns/chrome/path-button";
import { ShellServerProvider } from "../server/shell-server";
import { ShellThemeToggle } from "../theme/shell-theme";
import { ShellWorkspaceProvider, ShellWorkspaceReceives } from "../workspace/workspace";
import {
  ShellAgentActivity,
  ShellWorkspaceControlSessionSchema,
  type ShellWorkspaceControlSession,
} from "./agent-activity";
import { ConnectionStatus } from "./connection-status";
import { ShellHelpDialog, type QuickGuideTopicId } from "./help-dialog";
import { ShellSettingsDialog } from "./settings-dialog";

const NavbarStateMessage = UiSchema.TaggedEnum({
  SetAgentActive: { active: Schema.Boolean },
  RequestedPickWorkspace: {},
  RequestedPickSource: {},
});

const NavbarStateEvents = UiSchema.TaggedEnum({
  AgentSessionsChanged: { sessions: Schema.Array(ShellWorkspaceControlSessionSchema) },
});

const ShellNavbarState = Html.component({
  name: "LiscaShellNavbarState",
  props: Schema.Struct({}),
  model: Schema.Struct({
    agentActive: Schema.Boolean,
  }),
  message: NavbarStateMessage,
  events: NavbarStateEvents,
  reads: {
    server: ShellServerProvider,
    workspace: ShellWorkspaceProvider,
  },
}).make({
  init: () => ({ agentActive: false }),
  update: {
    SetAgentActive: ($, { active }) => $.evolve({ agentActive: active }),
    RequestedPickWorkspace: ($) =>
      $.send(ShellWorkspaceProvider, ShellWorkspaceReceives.PickWorkspace()),
    RequestedPickSource: ($) => $.send(ShellWorkspaceProvider, ShellWorkspaceReceives.PickSource()),
  },
  parts: (p, model) => ({
    agentActive: model.agentActive,
    workspacePath: p.reads.workspace.workspacePath,
    sourcePath: p.reads.workspace.sourcePath,
    serverState: p.reads.server.state,
    pickWorkspaceButton: p.part("button", (b) =>
      b.on("click", NavbarStateMessage.RequestedPickWorkspace()),
    ),
    pickSourceButton: p.part("button", (b) =>
      b.on("click", NavbarStateMessage.RequestedPickSource()),
    ),
  }),
});

export type ShellNavbarOptions<M, R = never> = {
  readonly key?: string | undefined;
  /** Screen-reader application title rendered as the page's primary heading. */
  readonly title?: string | undefined;
  /** Visible label centered in the bar; falls back to `title`. */
  readonly label?: string | undefined;
  readonly appearance?: "default" | "stage" | undefined;
  /** Show the source path/action button (default: true). */
  readonly showSourceButton?: boolean | undefined;
  /** Show the `endLeading` action slot (default: true). */
  readonly showToolsMenu?: boolean | undefined;
  /** Insert next to the workspace action in the left path group. */
  readonly workspaceTrailing?: View.Input<M, R> | undefined;
  /** Override workspace action. */
  readonly onPickWorkspace?: M | undefined;
  /** Override source action. */
  readonly onPickSource?: M | undefined;
  /** Insert before the theme toggle (e.g. aligner Tools menu). */
  readonly endLeading?: View.Input<M, R> | undefined;
  /** Optional quick-guide topic shown via an info button in the header. */
  readonly helpTopic?: QuickGuideTopicId | undefined;
  /** Optional Inference tab content in Settings (for Studio and Annotator). */
  readonly inferenceSlot?: View.Input<M, R> | undefined;
  /** Called whenever active MCP workspace control sessions change. */
  readonly onAgentSessionsChange?:
    | ((sessions: readonly ShellWorkspaceControlSession[]) => M | undefined)
    | undefined;
  /** Whether an agent session is currently active (optional external override). */
  readonly agentActive?: boolean | undefined;
};

export type ShellNavbarProps<M = never, R = never> = ShellNavbarOptions<M, R>;

/**
 * Shared shell chrome: workspace/source paths, server status, theme.
 * Requires `ShellServerProvider` and `ShellWorkspaceProvider` above in the tree.
 */
function ShellNavbarRoot<M, R = never>(h: Html.H<M>, options: ShellNavbarOptions<M, R> = {}) {
  const label = options.label ?? options.title;

  return ShellNavbarState(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {},
    onEmit: {
      AgentSessionsChanged: ({ sessions }) => options.onAgentSessionsChange?.(sessions),
    },
    view: (nav) => {
      const agentActive = options.agentActive ?? nav.agentActive;
      return h.header
        .class(cn("relative h-full", options.appearance !== "stage" && "px-6"))
        .children(
          options.title ? h.h1.class("sr-only").children(options.title) : undefined,
          !agentActive
            ? [
                h.div
                  .class(
                    cn(
                      "h-full items-center gap-4",
                      options.appearance === "stage"
                        ? "flex justify-between"
                        : "grid grid-cols-[1fr_auto_1fr]",
                    ),
                  )
                  .children(
                    h.div
                      .class(
                        "flex min-w-0 max-w-[56rem] flex-wrap items-center justify-start gap-3",
                      )
                      .children(
                        PathButton(h, {
                          key: "workspace-path",
                          appearance: options.appearance,
                          label: "Workspace",
                          value: nav.workspacePath,
                          icon: Icon(h, "folder", { class: "size-4 shrink-0 opacity-80" }),
                          onPress: options.onPickWorkspace,
                        }),
                        options.workspaceTrailing,
                        options.showSourceButton !== false
                          ? PathButton(h, {
                              key: "source-path",
                              appearance: options.appearance,
                              label: "Source",
                              value: nav.sourcePath,
                              icon: Icon(h, "hard-drive", { class: "size-4 shrink-0 opacity-80" }),
                              preserveExtension: options.appearance === "stage",
                              disabled: !nav.workspacePath,
                              onPress: nav.workspacePath ? options.onPickSource : undefined,
                            })
                          : undefined,
                      ),
                    options.appearance !== "stage" ? h.div : undefined,
                    h.div
                      .class(
                        "flex min-w-0 items-center justify-end justify-self-end gap-1 sm:gap-2",
                      )
                      .children(
                        ConnectionStatus(h, {
                          key: "connection-status",
                          props: { state: nav.serverState },
                        }),
                        options.showToolsMenu !== false ? options.endLeading : undefined,
                        options.helpTopic
                          ? ShellHelpDialog(h, {
                              key: "help-dialog",
                              props: { topic: options.helpTopic },
                            })
                          : undefined,
                        ShellSettingsDialog(h, {
                          key: "settings-dialog",
                          inferenceSlot: options.inferenceSlot,
                          productName: options.title,
                        }),
                        ShellThemeToggle(h, { key: "theme-toggle", props: {} }),
                      ),
                  ),
                label
                  ? h.span
                      .attr("aria-hidden", "true")
                      .class(
                        "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-semibold tracking-[0.2em] text-foreground",
                      )
                      .children(label)
                  : undefined,
              ]
            : undefined,
          ShellAgentActivity(h, {
            key: "agent-activity",
            props: {},
            onEmit: {
              SessionsChanged: ({ sessions }) => options.onAgentSessionsChange?.(sessions),
            },
          }),
        );
    },
  });
}

export type ShellNavbarAnnotatorOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly appearance?: "default" | "stage" | undefined;
  readonly endLeading?: View.Input<M, R> | undefined;
  readonly inferenceSlot?: View.Input<M, R> | undefined;
  readonly onAgentSessionsChange?:
    | ((sessions: readonly ShellWorkspaceControlSession[]) => M | undefined)
    | undefined;
  readonly onPickWorkspace?: M | undefined;
  readonly agentActive?: boolean | undefined;
};

export type ShellNavbarAnnotatorProps<M = never, R = never> = ShellNavbarAnnotatorOptions<M, R>;

function ShellNavbarAnnotator<M, R = never>(
  h: Html.H<M>,
  options: ShellNavbarAnnotatorOptions<M, R> = {},
) {
  return ShellNavbarRoot(h, {
    ...options,
    helpTopic: "annotator",
    showSourceButton: false,
    title: "LiSCA",
  });
}

export type ShellNavbarAlignerOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly appearance?: "default" | "stage" | undefined;
  readonly endLeading?: View.Input<M, R> | undefined;
  readonly onAgentSessionsChange?:
    | ((sessions: readonly ShellWorkspaceControlSession[]) => M | undefined)
    | undefined;
  readonly onPickSource?: M | undefined;
  readonly onPickWorkspace?: M | undefined;
  readonly agentActive?: boolean | undefined;
};

export type ShellNavbarAlignerProps<M = never, R = never> = ShellNavbarAlignerOptions<M, R>;

function ShellNavbarAligner<M, R = never>(
  h: Html.H<M>,
  options: ShellNavbarAlignerOptions<M, R> = {},
) {
  return ShellNavbarRoot(h, {
    ...options,
    helpTopic: "aligner",
    showToolsMenu: options.endLeading !== undefined,
    title: "LiSCA",
  });
}

export type ShellNavbarCompound = typeof ShellNavbarRoot & {
  readonly Annotator: typeof ShellNavbarAnnotator;
  readonly Aligner: typeof ShellNavbarAligner;
};

export const ShellNavbar: ShellNavbarCompound = Object.assign(ShellNavbarRoot, {
  Annotator: ShellNavbarAnnotator,
  Aligner: ShellNavbarAligner,
});

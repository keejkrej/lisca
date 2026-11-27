import { Command, Component, UiSchema, type View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Effect, Schema } from "effect";

import { Button } from "../../components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "../../components/ui/sidebar";
import { Icon } from "../../icons";
import { ModalScrim } from "../../patterns/modal/modal-scrim";
import { StartupUpdateCheck } from "./update-settings";

const DesktopMcpStatusSchema = Schema.Struct({
  product: Schema.String,
  enabled: Schema.Boolean,
  running: Schema.Boolean,
  url: Schema.String,
  token: Schema.String,
  toolCount: Schema.Number,
  claudeCommand: Schema.String,
  error: Schema.optional(Schema.NullOr(Schema.String)),
});
type DesktopMcpStatus = typeof DesktopMcpStatusSchema.Type;

type DesktopMcpBridge = {
  readonly product?: string | undefined;
  readonly mcpStatus?: () => Promise<DesktopMcpStatus>;
  readonly mcpSetEnabled?: (enabled: boolean) => Promise<DesktopMcpStatus>;
};

const PRODUCT_LABEL: Record<string, string> = {
  aligner: "Aligner",
  annotator: "Annotator",
  studio: "Studio",
};

function desktopMcpBridge(): DesktopMcpBridge | null {
  if (typeof window === "undefined") return null;
  const desktop = (window as Window & { liscaDesktop?: DesktopMcpBridge }).liscaDesktop;
  return desktop ?? null;
}

const AgentSettingsMessage = UiSchema.TaggedEnum({
  Loaded: { status: Schema.NullOr(DesktopMcpStatusSchema) },
  ToggleClicked: {},
  ToggleFinished: {
    status: Schema.NullOr(DesktopMcpStatusSchema),
    error: Schema.NullOr(Schema.String),
  },
  CopyClicked: { command: Schema.String },
  Copied: {},
  ResetCopied: {},
  CopyFailed: {},
});

const LoadMcpStatusCommand = Command.make("LiscaLoadMcpStatus", { args: {} }, () =>
  Effect.gen(function* () {
    const bridge = desktopMcpBridge();
    if (!bridge?.mcpStatus) return AgentSettingsMessage.Loaded({ status: null });
    return yield* Effect.tryPromise({
      try: () => bridge.mcpStatus!(),
      catch: () => null,
    }).pipe(
      Effect.map((status) => AgentSettingsMessage.Loaded({ status })),
      Effect.catch(() => Effect.succeed(AgentSettingsMessage.Loaded({ status: null }))),
    );
  }),
);

const SetMcpEnabledCommand = Command.make(
  "LiscaSetMcpEnabled",
  { args: { enabled: Schema.Boolean } },
  ({ enabled }) =>
    Effect.gen(function* () {
      const bridge = desktopMcpBridge();
      if (!bridge?.mcpSetEnabled) {
        return AgentSettingsMessage.ToggleFinished({ status: null, error: null });
      }
      return yield* Effect.tryPromise({
        try: () => bridge.mcpSetEnabled!(enabled),
        catch: (error) =>
          error instanceof Error ? error.message : "Could not change the MCP server.",
      }).pipe(
        Effect.map((status) => AgentSettingsMessage.ToggleFinished({ status, error: null })),
        Effect.catch((error) =>
          Effect.succeed(AgentSettingsMessage.ToggleFinished({ status: null, error })),
        ),
      );
    }),
);

const CopyMcpCommand = Command.make(
  "LiscaCopyMcpCommand",
  { args: { command: Schema.String } },
  ({ command }) =>
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(command),
      catch: () => undefined,
    }).pipe(
      Effect.as(AgentSettingsMessage.Copied()),
      Effect.catch(() => Effect.succeed(AgentSettingsMessage.CopyFailed())),
    ),
);

const ResetMcpCopiedCommand = Command.make("LiscaResetMcpCopied", { args: {} }, () =>
  Effect.sleep("1500 millis").pipe(Effect.as(AgentSettingsMessage.ResetCopied())),
);

const AgentSettingsPanel = Html.component({
  name: "LiscaAgentSettingsPanel",
  props: Schema.Struct({
    productName: Schema.String,
  }),
  model: Schema.Struct({
    status: Schema.NullOr(DesktopMcpStatusSchema),
    busy: Schema.Boolean,
    copied: Schema.Boolean,
    message: Schema.NullOr(Schema.String),
  }),
  message: AgentSettingsMessage,
}).make({
  init: ($) =>
    $.set({ status: null, busy: false, copied: false, message: null }).run(
      LoadMcpStatusCommand.make(),
    ),
  update: {
    Loaded: ($, { status }) => $.evolve({ status }),
    ToggleClicked: ($) => {
      const current = $.model.status;
      if (!current) return $.model;
      return $.evolve({ busy: true, message: null }).run(
        SetMcpEnabledCommand.make({ enabled: !current.enabled }),
      );
    },
    ToggleFinished: ($, { status, error }) =>
      $.evolve({
        busy: false,
        status: status ?? $.model.status,
        message: error,
      }),
    CopyClicked: ($, { command }) => $.run(CopyMcpCommand.make({ command })),
    Copied: ($) => $.evolve({ copied: true }).run(ResetMcpCopiedCommand.make()),
    ResetCopied: ($) => $.evolve({ copied: false }),
    CopyFailed: ($) => $.evolve({ message: "Could not copy command to clipboard." }),
  },
  view: (h, model) => {
    const bridge = desktopMcpBridge();
    if (!bridge?.mcpStatus) {
      return h.div
        .class("flex flex-col gap-4")
        .children(
          h.p
            .class("text-sm text-muted-foreground")
            .children(
              `The packaged ${h.props.productName} desktop app can expose MCP to local agents. Hosted ${h.props.productName} does not open a local agent listener.`,
            ),
        );
    }

    const current = model.status;
    return h.div.class("flex flex-col gap-4").children(
      h.p
        .class("text-sm text-muted-foreground")
        .children(
          `Let Claude Code and other MCP clients drive this running ${h.props.productName} app. The server listens on loopback only, uses the same live backend as the UI, and requires the bearer token below. No Node.js or source checkout is needed.`,
        ),
      current
        ? [
            h.p
              .class("text-sm text-muted-foreground")
              .children(
                current.running
                  ? `MCP is running with ${current.toolCount} tools at ${current.url}`
                  : "MCP is stopped.",
              ),
            Button(h, {
              class: "self-start",
              disabled: model.busy,
              type: "button",
              variant: "outline",
              onPress: AgentSettingsMessage.ToggleClicked(),
            }).children(current.enabled ? "Disable MCP" : "Enable MCP"),
            current.enabled
              ? h.div.class("flex flex-col gap-2").children(
                  h.div.class("flex items-center justify-between gap-2").children(
                    h.p
                      .class("text-sm font-medium text-foreground")
                      .children("Connect Claude Code"),
                    Button(h, {
                      size: "sm",
                      type: "button",
                      variant: "outline",
                      onPress: AgentSettingsMessage.CopyClicked({ command: current.claudeCommand }),
                    }).children(model.copied ? "Copied" : "Copy command"),
                  ),
                  h.p
                    .class("text-sm text-muted-foreground")
                    .children("Run this command once in a terminal, then ask Claude to use LiSCA:"),
                  h.code
                    .class(
                      "block overflow-x-auto whitespace-pre-wrap break-all bg-muted p-3 text-xs text-foreground",
                    )
                    .children(current.claudeCommand),
                )
              : undefined,
            current.error
              ? h.p.attr("role", "alert").class("text-sm text-destructive").children(current.error)
              : undefined,
          ]
        : undefined,
      model.message
        ? h.p.attr("role", "alert").class("text-sm text-destructive").children(model.message)
        : undefined,
    );
  },
});

const SettingsSectionSchema = Schema.Literals(["updates", "inference", "agents"]);
type SettingsSection = typeof SettingsSectionSchema.Type;

const SettingsDialogStateMessage = UiSchema.TaggedEnum({
  Opened: {},
  Closed: {},
  SelectedSection: { section: SettingsSectionSchema },
});

const SettingsDialogState = Html.component({
  name: "LiscaSettingsDialogState",
  props: Schema.Struct({}),
  model: Schema.Struct({
    open: Schema.Boolean,
    section: SettingsSectionSchema,
  }),
  message: SettingsDialogStateMessage,
}).make({
  init: () => ({ open: false, section: "updates" as const }),
  update: {
    Opened: ($) => $.evolve({ open: true }),
    Closed: ($) => $.evolve({ open: false }),
    SelectedSection: ($, { section }) => $.evolve({ section }),
  },
  parts: (p, model) => ({
    open: model.open,
    section: model.section,
    openButton: p.part("button", (b) => b.on("click", SettingsDialogStateMessage.Opened())),
    closeButton: p.part("button", (b) => b.on("click", SettingsDialogStateMessage.Closed())),
    dismiss: () => SettingsDialogStateMessage.Closed(),
    tabButton: p.part("button", (b, section: SettingsSection) =>
      b.on("click", SettingsDialogStateMessage.SelectedSection({ section })),
    ),
  }),
});

export type ShellSettingsDialogOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly productName?: string | undefined;
  readonly inferenceSlot?: View.Input<M, R> | undefined;
  readonly triggerVariant?: "ghost" | "outline" | undefined;
};

export type ShellSettingsDialogProps<M = never, R = never> = ShellSettingsDialogOptions<M, R>;

/**
 * Shared Settings modal across Studio, Aligner, and Annotator:
 * startup update check, optional label-free inference, and local MCP agent access.
 */
export function ShellSettingsDialog<M, R = never>(
  h: Html.H<M>,
  options: ShellSettingsDialogOptions<M, R> = {},
) {
  const bridge = desktopMcpBridge();
  const resolvedProduct = options.productName ?? PRODUCT_LABEL[bridge?.product ?? ""] ?? "LiSCA";
  const hasInference = options.inferenceSlot !== undefined;
  const subtitle = hasInference
    ? "Startup updates, label-free inference, and local agent access."
    : "Startup updates and local agent access.";

  return SettingsDialogState(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {},
    view: (settings) =>
      h.span.class("inline-flex").children(
        Button(h, {
          element: settings.openButton(h.button),
          ariaLabel: "Settings",
          class: "size-7",
          size: "icon",
          type: "button",
          variant: options.triggerVariant ?? "ghost",
        }).children(Icon(h, "gear", { class: "size-4" })),
        settings.open
          ? ModalScrim(h, {
              maxWidth: "lg",
              surfaceClass: "gap-0 overflow-hidden p-0",
              ariaLabelledby: "shell-settings-title",
              dismissible: false,
              children: [
                h.div
                  .class("flex items-start justify-between gap-4 border-b border-border px-5 py-4")
                  .children(
                    h.div
                      .class("space-y-1")
                      .children(
                        h.h2
                          .attr("id", "shell-settings-title")
                          .class("font-semibold text-foreground text-lg")
                          .children("Settings"),
                        h.p.class("text-muted-foreground text-sm").children(subtitle),
                      ),
                    Button(h, {
                      element: settings.closeButton(h.button),
                      ariaLabel: "Close Settings",
                      size: "icon-sm",
                      type: "button",
                      variant: "ghost",
                    }).children(Icon(h, "x")),
                  ),
                SidebarProvider(h, { class: "min-h-72" })
                  .style({ "--sidebar-width": "10rem" })
                  .children(
                    Sidebar(h, { class: "h-auto border-r border-sidebar-border" }).children(
                      SidebarContent(h).children(
                        SidebarGroup(h).children(
                          SidebarGroupContent(h).children(
                            SidebarMenu(h)
                              .attr("aria-label", "Settings")
                              .children(
                                SidebarMenuItem(h).children(
                                  settings
                                    .tabButton(
                                      SidebarMenuButton(h, {
                                        isActive: settings.section === "updates",
                                      }).attr(
                                        "aria-current",
                                        settings.section === "updates" ? "page" : undefined,
                                      ),
                                      "updates",
                                    )
                                    .children("Updates"),
                                ),
                                hasInference
                                  ? SidebarMenuItem(h).children(
                                      settings
                                        .tabButton(
                                          SidebarMenuButton(h, {
                                            isActive: settings.section === "inference",
                                          }).attr(
                                            "aria-current",
                                            settings.section === "inference" ? "page" : undefined,
                                          ),
                                          "inference",
                                        )
                                        .children("Inference"),
                                    )
                                  : undefined,
                                SidebarMenuItem(h).children(
                                  settings
                                    .tabButton(
                                      SidebarMenuButton(h, {
                                        isActive: settings.section === "agents",
                                      }).attr(
                                        "aria-current",
                                        settings.section === "agents" ? "page" : undefined,
                                      ),
                                      "agents",
                                    )
                                    .children("Agents"),
                                ),
                              ),
                          ),
                        ),
                      ),
                    ),
                    SidebarInset(h, { class: "min-w-0 p-5" }).children(
                      settings.section === "updates"
                        ? StartupUpdateCheck(h, { key: "updates", props: {} })
                        : settings.section === "inference" && hasInference
                          ? options.inferenceSlot
                          : AgentSettingsPanel(h, {
                              key: "agents",
                              props: { productName: resolvedProduct },
                            }),
                    ),
                  ),
              ],
            })
          : undefined,
      ),
  });
}

void Component;

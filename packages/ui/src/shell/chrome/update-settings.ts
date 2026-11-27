import { Command, Component, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Effect, Schema } from "effect";

import { Button } from "../../components/ui/button";
import { Toggle } from "../../components/ui/toggle";
import { Icon } from "../../icons";
import { ModalScrim } from "../../patterns/modal/modal-scrim";
import { AlignStateToggleIndicator } from "../../patterns/state-toggle-indicator";

type UpdateBridge = {
  readonly product?: string | undefined;
  readonly updateCheckEnabled: () => Promise<boolean>;
  readonly setUpdateCheckEnabled: (enabled: boolean) => Promise<void>;
};

const PRODUCT_LABEL: Record<string, string> = {
  aligner: "Aligner",
  annotator: "Annotator",
  studio: "Studio",
};

function desktopUpdateBridge(): UpdateBridge | null {
  if (typeof window === "undefined") return null;
  const desktop = (window as Window & { liscaDesktop?: Partial<UpdateBridge> }).liscaDesktop;
  if (!desktop?.updateCheckEnabled || !desktop.setUpdateCheckEnabled) return null;
  return {
    product: desktop.product,
    updateCheckEnabled: desktop.updateCheckEnabled,
    setUpdateCheckEnabled: desktop.setUpdateCheckEnabled,
  };
}

const StartupUpdateMessage = UiSchema.TaggedEnum({
  Loaded: { enabled: Schema.Boolean },
  LoadFailed: { error: Schema.String },
  Toggled: { enabled: Schema.Boolean },
  SaveFailed: { previous: Schema.Boolean, error: Schema.String },
});

const LoadUpdateEnabledCommand = Command.make("LiscaLoadUpdateCheckEnabled", { args: {} }, () =>
  Effect.gen(function* () {
    const bridge = desktopUpdateBridge();
    if (!bridge) return Component.noop;
    return yield* Effect.tryPromise({
      try: () => bridge.updateCheckEnabled(),
      catch: (cause) => (cause instanceof Error ? cause.message : String(cause)),
    }).pipe(
      Effect.map((enabled) => StartupUpdateMessage.Loaded({ enabled })),
      Effect.catch((error) => Effect.succeed(StartupUpdateMessage.LoadFailed({ error }))),
    );
  }),
);

const SaveUpdateEnabledCommand = Command.make(
  "LiscaSaveUpdateCheckEnabled",
  { args: { next: Schema.Boolean, previous: Schema.Boolean } },
  ({ next, previous }) =>
    Effect.gen(function* () {
      const bridge = desktopUpdateBridge();
      if (!bridge) return Component.noop;
      return yield* Effect.tryPromise({
        try: () => bridge.setUpdateCheckEnabled(next),
        catch: (cause) => (cause instanceof Error ? cause.message : String(cause)),
      }).pipe(
        Effect.as(Component.noop),
        Effect.catch((error) =>
          Effect.succeed(StartupUpdateMessage.SaveFailed({ previous, error })),
        ),
      );
    }),
);

/**
 * Startup update check. The toggle is on until it is turned off. The web app
 * has no updater, so this panel only explains that the desktop app checks.
 */
export const StartupUpdateCheck = Html.component({
  name: "StartupUpdateCheck",
  props: Schema.Struct({}),
  model: Schema.Struct({
    enabled: Schema.Boolean,
    error: Schema.NullOr(Schema.String),
  }),
  message: StartupUpdateMessage,
}).make({
  init: ($) => $.set({ enabled: true, error: null }).run(LoadUpdateEnabledCommand.make()),
  update: {
    Loaded: ($, { enabled }) => $.evolve({ enabled }),
    LoadFailed: ($, { error }) => $.evolve({ error }),
    Toggled: ($, { enabled }) => {
      const previous = $.model.enabled;
      return $.evolve({ enabled, error: null }).run(
        SaveUpdateEnabledCommand.make({ next: enabled, previous }),
      );
    },
    SaveFailed: ($, { previous, error }) => $.evolve({ enabled: previous, error }),
  },
  view: (h, model) => {
    const bridge = desktopUpdateBridge();
    const product = PRODUCT_LABEL[bridge?.product ?? ""] ?? "this app";

    return h.div.class("flex flex-col gap-4").children(
      h.p
        .class("text-sm text-muted-foreground")
        .children(
          bridge
            ? `Each launch of ${product} looks for a newer release. The download starts only after you choose Install.`
            : "The desktop app checks for updates at startup. The download starts only after you choose Install.",
        ),
      bridge
        ? Toggle(h, {
            ariaLabel: "Check for updates on startup",
            class:
              "h-8 w-fit gap-2 px-2.5 text-sm [&_.lisca-instrument-toggle-indicator]:inline-flex",
            pressed: model.enabled,
            size: "sm",
            variant: "outline",
            onToggle: ({ pressed }) => StartupUpdateMessage.Toggled({ enabled: pressed }),
          })
            .attr("data-instrument-state-toggle", "")
            .children(
              AlignStateToggleIndicator(h, { pressed: model.enabled }),
              h.span.children("Check for updates on startup"),
            )
        : undefined,
      model.error
        ? h.p.attr("role", "alert").class("z-destructive-surface text-sm").children(model.error)
        : undefined,
    );
  },
});

const DesktopSettingsMessage = UiSchema.TaggedEnum({
  Opened: {},
  Closed: {},
});

/**
 * Desktop-only settings for Aligner and Annotator. The web app has no updater,
 * so the button stays hidden there. Studio uses its own tabbed settings dialog.
 */
export const DesktopUpdateSettings = Html.component({
  name: "DesktopUpdateSettings",
  props: Schema.Struct({}),
  model: Schema.Struct({
    open: Schema.Boolean,
  }),
  message: DesktopSettingsMessage,
}).make({
  init: () => ({ open: false }),
  update: {
    Opened: ($) => $.evolve({ open: true }),
    Closed: ($) => $.evolve({ open: false }),
  },
  view: (h, model) => {
    if (!desktopUpdateBridge()) return View.text("");
    return h.span.class("inline-flex").children(
      Button(h, {
        ariaLabel: "Settings",
        class: "size-7",
        size: "icon",
        type: "button",
        variant: "ghost",
        onPress: DesktopSettingsMessage.Opened(),
      }).children(Icon(h, "gear", { class: "size-4" })),
      model.open
        ? ModalScrim(h, {
            ariaLabelledby: "desktop-update-settings-title",
            surfaceClass: "gap-4 p-5",
            dismissible: false,
            children: [
              h.h2
                .attr("id", "desktop-update-settings-title")
                .class("font-medium text-foreground")
                .children("Settings"),
              StartupUpdateCheck(h, { props: {} }),
              h.div.class("flex justify-end").children(
                Button(h, {
                  type: "button",
                  variant: "outline",
                  onPress: DesktopSettingsMessage.Closed(),
                }).children("Close"),
              ),
            ],
          })
        : undefined,
    );
  },
});

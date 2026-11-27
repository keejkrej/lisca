import { Command, Component, Subscription, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { LiscaAppId } from "@lisca/utils";
import { Effect, Schema, Stream } from "effect";

import { Button } from "../../components/ui/button";
import { Icon } from "../../icons";
import { cn } from "../../lib/utils";

export const ShellThemeModeSchema = Schema.Literals(["light", "dark"]);
export type ShellThemeMode = typeof ShellThemeModeSchema.Type;

const LiscaAppIdSchema = Schema.Literals(["aligner", "annotator", "studio"]);

const DEFAULT_STORAGE_KEY = "lisca-shell-theme";

function readStoredMode(storageKey: string, fallback: ShellThemeMode): ShellThemeMode {
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(storageKey);
    if (raw === "light" || raw === "dark") return raw;
    if (raw === "system") return fallback;
  } catch {
    /* ignore */
  }
  return fallback;
}

function writeStoredMode(storageKey: string, mode: ShellThemeMode): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey, mode);
    }
  } catch {
    /* ignore */
  }
}

function applyDocumentTheme(mode: ShellThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode === "dark" ? "dark" : "light";
}

export const ShellThemeReceives = UiSchema.TaggedEnum({
  SetMode: { mode: ShellThemeModeSchema },
  ToggleLightDark: {},
});
export type ShellThemeReceives = typeof ShellThemeReceives.Type;

const SyncDocumentTheme = Command.make(
  "LiscaSyncDocumentTheme",
  {
    args: {
      mode: ShellThemeModeSchema,
      storageKey: Schema.String,
      persist: Schema.Boolean,
    },
  },
  ({ mode, storageKey, persist }) =>
    Effect.sync(() => {
      if (persist) {
        writeStoredMode(storageKey, mode);
      }
      applyDocumentTheme(mode);
      return Component.noop;
    }),
);

export const ShellThemeSharedSchema = Schema.Struct({
  mode: ShellThemeModeSchema,
  resolvedTheme: ShellThemeModeSchema,
});

export type ShellThemeShared = typeof ShellThemeSharedSchema.Type;

/**
 * Persists light/dark choice and syncs `document.documentElement` (`class="dark"`,
 * `color-scheme`, and optional `data-lisca-app`) so Tailwind `dark:` utilities and
 * per-app brand tokens apply app-wide.
 */
export const ShellThemeProvider = Html.component({
  name: "ShellThemeProvider",
  props: Schema.Struct({
    /** Used when nothing valid is in `localStorage`. */
    defaultMode: Schema.optional(ShellThemeModeSchema),
    /** `localStorage` key for the mode string. */
    storageKey: Schema.optional(Schema.String),
    /** Scopes `--lisca-brand` via `document.documentElement[data-lisca-app]`. */
    appId: Schema.optional(LiscaAppIdSchema),
  }),
  model: Schema.Struct({
    mode: ShellThemeModeSchema,
  }),
  message: ShellThemeReceives,
  shares: {
    value: ({ model }) => ({
      mode: model.mode,
      resolvedTheme: model.mode,
    }),
    schema: ShellThemeSharedSchema,
    receives: ["SetMode", "ToggleLightDark"],
  },
}).make({
  init: ($) => {
    const defaultMode = $.props.defaultMode ?? "light";
    const storageKey = $.props.storageKey ?? DEFAULT_STORAGE_KEY;
    const mode =
      typeof window === "undefined" ? defaultMode : readStoredMode(storageKey, defaultMode);
    return $.set({ mode }).run(SyncDocumentTheme.make({ mode, storageKey, persist: false }));
  },
  update: {
    SetMode: ($, { mode }) => {
      const storageKey = $.props.storageKey ?? DEFAULT_STORAGE_KEY;
      return $.evolve({ mode }).run(SyncDocumentTheme.make({ mode, storageKey, persist: true }));
    },
    ToggleLightDark: ($) => {
      const next: ShellThemeMode = $.model.mode === "dark" ? "light" : "dark";
      const storageKey = $.props.storageKey ?? DEFAULT_STORAGE_KEY;
      return $.evolve({ mode: next }).run(
        SyncDocumentTheme.make({ mode: next, storageKey, persist: true }),
      );
    },
  },
  subscriptions: ({ props }) => [
    props.appId !== undefined &&
      Subscription.make("lisca-app-id", props.appId, (appId: LiscaAppId) =>
        Stream.unwrap(
          Effect.acquireRelease(
            Effect.sync(() => {
              if (typeof document === "undefined") return undefined;
              const root = document.documentElement;
              const previous = root.dataset.liscaApp;
              root.dataset.liscaApp = appId;
              return previous;
            }),
            (previous) =>
              Effect.sync(() => {
                if (typeof document === "undefined") return;
                const root = document.documentElement;
                if (previous === undefined) {
                  delete root.dataset.liscaApp;
                } else {
                  root.dataset.liscaApp = previous;
                }
              }),
          ).pipe(Effect.as(Stream.never)),
        ),
      ),
  ],
  parts: (_p, model) => ({
    mode: model.mode,
    resolvedTheme: model.mode,
  }),
});

const ShellThemeToggleMessage = UiSchema.TaggedEnum({
  Clicked: {},
});

/**
 * Icon control: moon while in light mode (switch to dark), sun while in dark (switch to light).
 */
export const ShellThemeToggle = Html.component({
  name: "ShellThemeToggle",
  props: Schema.Struct({
    class: Schema.optional(Schema.String),
  }),
  model: Schema.Struct({}),
  message: ShellThemeToggleMessage,
  reads: {
    theme: ShellThemeProvider,
  },
}).make({
  init: () => ({}),
  update: {
    Clicked: ($) => $.send(ShellThemeProvider, ShellThemeReceives.ToggleLightDark()),
  },
  view: (h) => {
    const mode = h.reads.theme.mode;
    const title = mode === "light" ? "Switch to dark theme" : "Switch to light theme";
    return Button(h, {
      variant: "outline",
      size: "icon-sm",
      class: cn("size-7 text-foreground", h.props.class),
      onPress: ShellThemeToggleMessage.Clicked(),
      title,
      ariaLabel: title,
    }).children(Icon(h, mode === "light" ? "moon" : "sun", { class: "size-3.5" }));
  },
});

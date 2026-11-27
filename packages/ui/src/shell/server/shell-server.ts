import { Command, Subscription, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Context, Effect, Queue, Schema, Stream } from "effect";

import type { ConnectionState } from "../chrome/connection-status";

export const ConnectionStateSchema = Schema.Literals(["idle", "connecting", "open", "closed"]);

export const ShellServerSharedSchema = Schema.Struct({
  state: ConnectionStateSchema,
});

export type ShellServerShared = typeof ShellServerSharedSchema.Type;

export type ShellServer = {
  readonly state: ConnectionState;
};

/**
 * Optional server health probe provided via Effect Layer.
 * Defaults to `undefined` (skips network probing in tests or desktop builds).
 */
export const ShellServerProbe = Context.Reference<(() => Promise<unknown>) | undefined>(
  "lisca/ShellServerProbe",
  { defaultValue: () => undefined },
);

/**
 * Desktop builds run the backend in-process over Tauri IPC (`window.liscaDesktop`), so there is
 * no server connection to check or report. Web builds always talk HTTP to a server on their own
 * origin — in development through the Vite proxy, when deployed through the Docker nginx proxy.
 */
export function hasEmbeddedBackend(): boolean {
  return typeof window !== "undefined" && "liscaDesktop" in window;
}

/** Fast retries while booting or after a blip; report "closed" only once this many fail (~2s). */
const GRACE_ATTEMPTS = 8;
const FAST_RETRY_MS = 250;
/** While unreachable, keep retrying in the background so the app recovers on its own. */
const CLOSED_RETRY_MS = 3_000;
/** Once connected, a light heartbeat notices a server that goes away later. */
const HEARTBEAT_MS = 15_000;

export const ShellServerReceives = UiSchema.TaggedEnum({
  Retry: {},
});
export type ShellServerReceives = typeof ShellServerReceives.Type;

const ShellServerMessage = UiSchema.TaggedEnum({
  Retry: {},
  SetState: { state: ConnectionStateSchema },
  ProbeSucceeded: {},
  ProbeFailed: {},
});

const RunProbeCommand = Command.make("LiscaShellServerProbe", { args: {} }, () =>
  Effect.gen(function* () {
    const probe = yield* ShellServerProbe;
    if (!probe || hasEmbeddedBackend()) {
      return ShellServerMessage.SetState({ state: "idle" });
    }
    const ok = yield* Effect.tryPromise({
      try: () => probe(),
      catch: () => undefined,
    }).pipe(
      Effect.as(true),
      Effect.catch(() => Effect.succeed(false)),
    );
    return ok ? ShellServerMessage.ProbeSucceeded() : ShellServerMessage.ProbeFailed();
  }),
);

const watchOnlineAndVisibility = Stream.callback<typeof ShellServerMessage.Type>((queue) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Effect.void;
  }
  const trigger = () => {
    Queue.offerUnsafe(queue, ShellServerMessage.Retry());
  };
  const checkWhenVisible = () => {
    if (document.visibilityState === "visible") {
      trigger();
    }
  };
  window.addEventListener("online", trigger);
  document.addEventListener("visibilitychange", checkWhenVisible);
  return Effect.addFinalizer(() =>
    Effect.sync(() => {
      window.removeEventListener("online", trigger);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    }),
  );
});

const ShellServerModelSchema = Schema.Struct({
  state: ConnectionStateSchema,
  failures: Schema.Number,
  inFlight: Schema.Boolean,
  nextDelayMs: Schema.NullOr(Schema.Number),
  epoch: Schema.Number,
});

export const ShellServerProvider = Html.component({
  name: "ShellServerProvider",
  props: Schema.Struct({
    enabled: Schema.optional(Schema.Boolean),
  }),
  model: ShellServerModelSchema,
  message: ShellServerMessage,
  shares: {
    value: ({ model }) => ({ state: model.state }),
    schema: ShellServerSharedSchema,
    receives: ["Retry"],
  },
}).make({
  init: ($) => {
    if ($.props.enabled === false || hasEmbeddedBackend()) {
      return $.set({
        state: "idle",
        failures: 0,
        inFlight: false,
        nextDelayMs: null,
        epoch: 0,
      });
    }
    return $.set({
      state: "connecting",
      failures: 0,
      inFlight: true,
      nextDelayMs: null,
      epoch: 1,
    }).run(RunProbeCommand.make());
  },
  update: {
    Retry: ($) => {
      if ($.props.enabled === false || hasEmbeddedBackend() || $.model.inFlight) {
        return $.model;
      }
      return $.evolve({
        inFlight: true,
        nextDelayMs: null,
        epoch: (n) => n + 1,
      }).run(RunProbeCommand.make());
    },
    SetState: ($, { state }) =>
      $.evolve({
        state,
        inFlight: false,
        nextDelayMs: null,
      }),
    ProbeSucceeded: ($) =>
      $.evolve({
        state: "open" as const,
        failures: 0,
        inFlight: false,
        nextDelayMs: HEARTBEAT_MS,
        epoch: (n) => n + 1,
      }),
    ProbeFailed: ($) => {
      const failures = $.model.failures + 1;
      const isClosed = failures >= GRACE_ATTEMPTS;
      return $.evolve({
        state: isClosed ? ("closed" as const) : $.model.state,
        failures,
        inFlight: false,
        nextDelayMs: isClosed ? CLOSED_RETRY_MS : FAST_RETRY_MS,
        epoch: (n) => n + 1,
      });
    },
  },
  subscriptions: ({ model, props }) => {
    const active = props.enabled !== false && !hasEmbeddedBackend();
    return [
      active && Subscription.make("shell-server-network", watchOnlineAndVisibility),
      active &&
        model.nextDelayMs !== null &&
        Subscription.make("shell-server-timer", [model.epoch, model.nextDelayMs], ([, delayMs]) =>
          Stream.fromEffect(
            Effect.sleep(`${delayMs} millis`).pipe(Effect.as(ShellServerMessage.Retry())),
          ),
        ),
    ];
  },
  parts: (_p, model) => ({
    state: model.state,
  }),
});

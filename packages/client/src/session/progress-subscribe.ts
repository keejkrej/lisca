import { formatSchemaError } from "@lisca/contracts";
import * as Either from "effect/Either";
import { Effect, Exit, Option, Ref, Scope, Stream } from "effect";
import type * as ParseResult from "effect/ParseResult";

import type { ClientEffect } from "../infra/runtime.ts";
import { runClientEffect } from "../infra/runtime.ts";
import { withOptionalAbortSignal } from "../infra/with-abort-signal.ts";

export type ProgressPollOptions<TProgress> = {
  pollProgress: () => ClientEffect<TProgress>;
  onProgress: (progress: TProgress) => void;
  isTerminal: (progress: TProgress) => boolean;
  createErrorProgress: (cause: unknown) => TProgress;
  pollIntervalMs?: number;
  schedule?: (callback: () => void, delayMs: number) => number;
  clearSchedule?: (handle: number) => void;
};

type ScheduleFn = (callback: () => void, delayMs: number) => number;
type ClearScheduleFn = (handle: number) => void;

const defaultSchedule: ScheduleFn = (callback, delayMs) => window.setTimeout(callback, delayMs);
const defaultClearSchedule: ClearScheduleFn = (handle) => window.clearTimeout(handle);

function createScheduledDelay(
  schedule: ScheduleFn,
  clearSchedule: ClearScheduleFn,
  delayMs: number,
): Effect.Effect<void, never, Scope.Scope> {
  return Effect.async<void>((resume) => {
    const handle = schedule(() => resume(Effect.void), delayMs);
    return Effect.sync(() => clearSchedule(handle));
  });
}

type PollState = { readonly delayed: boolean };

function createProgressPollStream<TProgress>(
  options: ProgressPollOptions<TProgress>,
  closed: Ref.Ref<boolean>,
): Stream.Stream<TProgress, never, Scope.Scope> {
  const pollIntervalMs = options.pollIntervalMs ?? 350;
  const schedule = options.schedule ?? defaultSchedule;
  const clearSchedule = options.clearSchedule ?? defaultClearSchedule;

  const pollOnce = (): Effect.Effect<
    { progress: TProgress; continue: boolean },
    never,
    Scope.Scope
  > =>
    options.pollProgress().pipe(
      Effect.match({
        onFailure: (cause) => ({
          progress: options.createErrorProgress(cause),
          continue: false,
        }),
        onSuccess: (progress) => ({
          progress,
          continue: !options.isTerminal(progress),
        }),
      }),
    );

  return Stream.unfoldEffect({ delayed: false } as PollState | null, (state) =>
    Effect.gen(function* () {
      if (state === null) {
        return Option.none();
      }
      if (state.delayed) {
        if (yield* Ref.get(closed)) {
          return Option.none();
        }
        yield* createScheduledDelay(schedule, clearSchedule, pollIntervalMs);
        if (yield* Ref.get(closed)) {
          return Option.none();
        }
      }
      const { progress, continue: shouldContinue } = yield* pollOnce();
      if (yield* Ref.get(closed)) {
        return Option.none();
      }
      return Option.some([progress, shouldContinue ? { delayed: true } : null] as const);
    }),
  );
}

function pollProgressLoopEffect<TProgress>(
  options: ProgressPollOptions<TProgress>,
): Effect.Effect<void, never, Scope.Scope> {
  return Effect.gen(function* () {
    const closed = yield* Ref.make(false);
    const scope = yield* Scope.Scope;

    yield* Scope.addFinalizer(scope, Ref.set(closed, true));

    const stream = createProgressPollStream(options, closed);

    yield* Stream.runForEach(stream, (progress) =>
      Effect.gen(function* () {
        if (!(yield* Ref.get(closed))) {
          options.onProgress(progress);
        }
      }),
    );
  });
}

function forkScoped(effect: Effect.Effect<void, never, Scope.Scope>): () => void {
  const abortController = new AbortController();

  void runClientEffect(
    withOptionalAbortSignal(effect.pipe(Effect.scoped), abortController.signal),
  ).catch(() => {});

  return () => {
    abortController.abort();
  };
}

export function pollProgressLoop<TProgress>(options: ProgressPollOptions<TProgress>): () => void {
  return forkScoped(pollProgressLoopEffect(options));
}

export type ProgressSubscriptionOptions<TProgress, TMessage> = {
  wsUrl: string;
  requestId: string;
  onProgress: (progress: TProgress) => void;
  pollProgress: () => ClientEffect<TProgress>;
  decodeMessage: (input: unknown) => Either.Either<TMessage, ParseResult.ParseError>;
  extractProgress: (message: TMessage) => TProgress;
  matchRequestId: (message: TMessage, requestId: string) => boolean;
  isTerminal: (progress: TProgress) => boolean;
  createErrorProgress: (cause: unknown) => TProgress;
  fallbackDelayMs?: number;
  pollIntervalMs?: number;
  debugLabel?: string;
  isDev?: boolean;
  WebSocketImpl?: typeof WebSocket;
  schedule?: (callback: () => void, delayMs: number) => number;
  clearSchedule?: (handle: number) => void;
};

function subscribeProgressSetup<TProgress, TMessage>(
  scope: Scope.CloseableScope,
  options: ProgressSubscriptionOptions<TProgress, TMessage>,
): void {
  const WebSocketImpl = options.WebSocketImpl ?? WebSocket;
  const schedule = options.schedule ?? defaultSchedule;
  const clearSchedule = options.clearSchedule ?? defaultClearSchedule;
  const fallbackDelayMs = options.fallbackDelayMs ?? 1500;
  const debugLabel = options.debugLabel ?? "lisca-ws";

  let closed = false;
  let terminal = false;
  let ws: WebSocket | null = null;
  let stopFallback: (() => void) | null = null;
  let fallbackTimer: number | null = null;

  const startFallback = () => {
    if (closed || stopFallback) return;
    stopFallback = pollProgressLoop({
      pollProgress: options.pollProgress,
      onProgress: options.onProgress,
      isTerminal: options.isTerminal,
      createErrorProgress: options.createErrorProgress,
      pollIntervalMs: options.pollIntervalMs,
      schedule,
      clearSchedule,
    });
  };

  Effect.runSync(
    Scope.addFinalizer(
      scope,
      Effect.sync(() => {
        closed = true;
        if (fallbackTimer != null) {
          clearSchedule(fallbackTimer);
        }
        stopFallback?.();
        ws?.close();
      }),
    ),
  );

  fallbackTimer = schedule(() => {
    if (closed) return;
    startFallback();
  }, fallbackDelayMs);

  try {
    ws = new WebSocketImpl(options.wsUrl);
  } catch {
    if (fallbackTimer != null) {
      clearSchedule(fallbackTimer);
      fallbackTimer = null;
    }
    startFallback();
  }

  ws?.addEventListener("open", () => {
    if (fallbackTimer != null) {
      clearSchedule(fallbackTimer);
      fallbackTimer = null;
    }
    void runClientEffect(options.pollProgress())
      .then((progress) => {
        if (closed) return;
        options.onProgress(progress);
        terminal = options.isTerminal(progress);
        if (terminal) ws?.close();
      })
      .catch(() => {
        if (closed || stopFallback) return;
        startFallback();
      });
  });

  ws?.addEventListener("message", (event) => {
    if (closed) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(event.data));
    } catch {
      return;
    }
    const result = options.decodeMessage(parsed);
    if (Either.isLeft(result)) {
      if (options.isDev) {
        console.debug(`[${debugLabel}] protocol decode failed:`, formatSchemaError(result.left));
      }
      return;
    }
    const message = result.right;
    if (!options.matchRequestId(message, options.requestId)) return;
    const progress = options.extractProgress(message);
    options.onProgress(progress);
    terminal = options.isTerminal(progress);
    if (terminal) {
      ws?.close();
    }
  });

  ws?.addEventListener("error", () => {
    if (closed || stopFallback) return;
    if (fallbackTimer != null) {
      clearSchedule(fallbackTimer);
      fallbackTimer = null;
    }
    startFallback();
  });

  ws?.addEventListener("close", () => {
    if (closed || terminal || stopFallback) return;
    if (fallbackTimer != null) {
      clearSchedule(fallbackTimer);
      fallbackTimer = null;
    }
    startFallback();
  });
}

export function subscribeProgress<TProgress, TMessage>(
  options: ProgressSubscriptionOptions<TProgress, TMessage>,
): () => void {
  const scope = Effect.runSync(Scope.make());
  subscribeProgressSetup(scope, options);

  return () => {
    Effect.runSync(Scope.close(scope, Exit.void));
  };
}

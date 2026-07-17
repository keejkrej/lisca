import { Effect, Option, Ref, Scope, Stream } from "effect";

import type { ClientEffect } from "../infra/runtime";
import { runClientEffect } from "../infra/runtime";
import { withOptionalAbortSignal } from "../infra/with-abort-signal";

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

const defaultSchedule: ScheduleFn = (callback, delayMs) =>
  globalThis.setTimeout(callback, delayMs) as unknown as number;
const defaultClearSchedule: ClearScheduleFn = (handle) => globalThis.clearTimeout(handle);

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

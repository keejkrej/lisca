import { Effect, Fiber } from "effect";

import type { ClientEffect } from "../infra/runtime";

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
): Effect.Effect<void> {
  return Effect.async<void>((resume) => {
    const handle = schedule(() => resume(Effect.void), delayMs);
    return Effect.sync(() => clearSchedule(handle));
  });
}

function pollProgressLoopEffect<TProgress>(
  options: ProgressPollOptions<TProgress>,
): Effect.Effect<void> {
  const pollIntervalMs = options.pollIntervalMs ?? 350;
  const schedule = options.schedule ?? defaultSchedule;
  const clearSchedule = options.clearSchedule ?? defaultClearSchedule;

  const loop = (): Effect.Effect<void> =>
    Effect.gen(function* () {
      const { progress, shouldContinue } = yield* options.pollProgress().pipe(
        Effect.match({
          onFailure: (cause) => ({
            progress: options.createErrorProgress(cause),
            shouldContinue: false,
          }),
          onSuccess: (progress) => ({
            progress,
            shouldContinue: !options.isTerminal(progress),
          }),
        }),
      );

      yield* Effect.sync(() => options.onProgress(progress));
      if (!shouldContinue) return;

      yield* createScheduledDelay(schedule, clearSchedule, pollIntervalMs);
      yield* Effect.suspend(loop);
    });

  return Effect.suspend(loop);
}

export function pollProgressLoop<TProgress>(options: ProgressPollOptions<TProgress>): () => void {
  const fiber = Effect.runFork(pollProgressLoopEffect(options));
  return () => {
    Effect.runFork(Fiber.interrupt(fiber));
  };
}

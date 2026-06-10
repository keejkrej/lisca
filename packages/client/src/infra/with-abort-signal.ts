import { Effect } from "effect";

import type { ClientEffect } from "./runtime";
import { clientFail } from "./runtime";

/** Link an optional `AbortSignal` to effect interruption. */
export function withOptionalAbortSignal<A>(
  effect: ClientEffect<A>,
  signal?: AbortSignal,
): ClientEffect<A> {
  if (!signal) return effect;
  if (signal.aborted) {
    return clientFail("Request aborted");
  }
  return Effect.raceFirst(
    effect,
    Effect.async<never>((resume) => {
      const onAbort = () => resume(Effect.interrupt);
      signal.addEventListener("abort", onAbort, { once: true });
      return Effect.sync(() => signal.removeEventListener("abort", onAbort));
    }),
  );
}

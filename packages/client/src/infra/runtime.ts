import { Effect } from "effect";

import { ClientError, toClientError } from "./client-error";

export type ClientEffect<A, E = never> = Effect.Effect<A, ClientError | E>;

export function clientFail(message: string, cause?: unknown): ClientEffect<never> {
  return Effect.fail(new ClientError({ message, cause }));
}

export function runClientEffect<A, E>(
  effect: ClientEffect<A, E>,
  options?: { readonly signal?: AbortSignal },
): Promise<A> {
  return Effect.runPromise(effect, options);
}

export function clientQueryFn<A, E>(
  effect: ClientEffect<A, E>,
  signal?: AbortSignal,
): () => Promise<A> {
  return () => runClientEffect(effect, signal ? { signal } : undefined);
}

export { toClientError };

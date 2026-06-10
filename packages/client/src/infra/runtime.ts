import { Effect } from "effect";

import { ClientError, toClientError } from "./client-error.ts";

export type ClientEffect<A> = Effect.Effect<A, ClientError>;

export function clientFail(message: string, cause?: unknown): ClientEffect<never> {
  return Effect.fail(new ClientError({ message, cause }));
}

export function runClientEffect<A>(
  effect: ClientEffect<A>,
  options?: { readonly signal?: AbortSignal },
): Promise<A> {
  return Effect.runPromise(effect, options);
}

export function clientQueryFn<A>(effect: ClientEffect<A>, signal?: AbortSignal): () => Promise<A> {
  return () => runClientEffect(effect, signal ? { signal } : undefined);
}

export { toClientError };

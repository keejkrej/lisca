import { Cause, Effect, Exit } from "effect";

import { ClientError, toClientError } from "./client-error";

export type ClientEffect<A, E = never> = Effect.Effect<A, ClientError | E>;

export function clientFail(message: string, cause?: unknown): ClientEffect<never> {
  return Effect.fail(new ClientError({ message, cause }));
}

export function runClientEffect<A, E>(
  effect: ClientEffect<A, E>,
  options?: { readonly signal?: AbortSignal },
): Promise<A> {
  return Effect.runPromiseExit(effect, options).then(
    Exit.match({
      onFailure: (cause) => {
        throw Cause.squash(cause);
      },
      onSuccess: (value) => value,
    }),
  );
}

export { toClientError };

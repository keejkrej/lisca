import { Data } from "effect";

export class ClientError extends Data.TaggedError("ClientError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export function toClientError(cause: unknown): ClientError {
  if (cause instanceof ClientError) return cause;
  return new ClientError({
    message: cause instanceof Error ? cause.message : String(cause),
    cause,
  });
}

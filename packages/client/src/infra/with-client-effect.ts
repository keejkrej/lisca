import { Effect } from "effect";

import { toClientEffect, type LiscaApiClient } from "./api-client";
import type { ClientEffect } from "./runtime";
import { withOptionalAbortSignal } from "./with-abort-signal";

export function withClientEffect<A, E>(
  client: LiscaApiClient,
  signal: AbortSignal | undefined,
  run: (client: LiscaApiClient) => Effect.Effect<A, E>,
): ClientEffect<A> {
  return withOptionalAbortSignal(toClientEffect(run(client)), signal);
}

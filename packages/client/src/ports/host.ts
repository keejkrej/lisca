import { Effect } from "effect";

import {
  createApiClient,
  toClientEffect,
  type ApiClientDeps,
  type LiscaApiClient,
} from "../infra/api-client";
import type { ClientEffect } from "../infra/runtime";
import { withOptionalAbortSignal } from "../infra/with-abort-signal";
import type { HostPort } from "./types";

export type { HostPort } from "./types";

export type HostPortDeps = ApiClientDeps;

function withClientEffect<A, E>(
  client: LiscaApiClient,
  signal: AbortSignal | undefined,
  run: (client: LiscaApiClient) => Effect.Effect<A, E>,
): ClientEffect<A> {
  return withOptionalAbortSignal(toClientEffect(run(client)), signal);
}

export function createHostPort(
  deps: HostPortDeps,
  client: LiscaApiClient = createApiClient(deps),
): HostPort {
  return {
    listDirectory(path, signal) {
      return withClientEffect(client, signal, (c) =>
        c.fs.listDirectory({ urlParams: { path: path ?? undefined } }),
      );
    },
    userHomeDirectory(signal) {
      return withClientEffect(client, signal, (c) =>
        c.fs.userHomeDirectory().pipe(Effect.map((result) => result.path)),
      );
    },
  };
}

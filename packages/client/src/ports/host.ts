import { Effect } from "effect";

import { createApiClient, toClientEffect, type ApiClientDeps } from "../api-client.ts";
import type { HostPort } from "./types.ts";

export type { HostPort } from "./types.ts";

export type HostPortDeps = ApiClientDeps;

export function createHostPort(deps: HostPortDeps): HostPort {
  const client = createApiClient(deps);

  return {
    listDirectory(path) {
      return toClientEffect(
        client.fs.listDirectory({ urlParams: { path: path ?? undefined } }),
      );
    },
    userHomeDirectory() {
      return toClientEffect(
        client.fs.userHomeDirectory().pipe(Effect.map((result) => result.path)),
      );
    },
    connectSmb(request) {
      return toClientEffect(client.fs.connectSmb({ payload: request }));
    },
    disconnectSmb(sessionId) {
      return toClientEffect(
        client.fs.disconnectSmb({ payload: { sessionId } }).pipe(Effect.asVoid),
      );
    },
  };
}

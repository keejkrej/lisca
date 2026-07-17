import { Effect } from "effect";

import { createApiClient, type ApiClientDeps, type LiscaApiClient } from "../infra/api-client";
import { withClientEffect } from "../infra/with-client-effect";
import type { HostPort } from "./types";

export type { HostPort } from "./types";

export type HostPortDeps = ApiClientDeps;

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
    createDirectory(parentPath, name, signal) {
      return withClientEffect(client, signal, (c) =>
        c.fs.createDirectory({ payload: { parentPath, name } }),
      );
    },
  };
}

import { Effect } from "effect";

import {
  createApiClient,
  toClientEffect,
  type ApiClientDeps,
  type LiscaApiClient,
} from "../infra/api-client";
import type { HostPort } from "./types";

export type { HostPort } from "./types";

export type HostPortDeps = ApiClientDeps;

export function createHostPort(
  deps: HostPortDeps,
  client: LiscaApiClient = createApiClient(deps),
): HostPort {
  return {
    listDirectory(path) {
      return toClientEffect(client.fs.listDirectory({ query: { path: path ?? undefined } }));
    },
    userHomeDirectory() {
      return toClientEffect(
        client.fs.userHomeDirectory().pipe(Effect.map((result) => result.path)),
      );
    },
    createDirectory(parentPath, name) {
      return toClientEffect(client.fs.createDirectory({ payload: { parentPath, name } }));
    },
  };
}

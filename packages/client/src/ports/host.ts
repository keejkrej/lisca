import {
  HomeDirectoryResponseSchema,
  HostListDirectoryResultSchema,
  SmbConnectResponseSchema,
  SmbDisconnectRequestSchema,
} from "@lisca/contracts";
import * as Schema from "effect/Schema";
import { Effect } from "effect";

import { createJsonFetch } from "../fetch.ts";
import type { HostPort } from "./types.ts";

export type { HostPort } from "./types.ts";

export type HostPortDeps = {
  baseUrl: () => string;
  fetch?: typeof fetch;
};

export function createHostPort(deps: HostPortDeps): HostPort {
  const json = createJsonFetch(deps.baseUrl, deps.fetch);

  return {
    listDirectory(path, signal) {
      return json.getJson(
        "/fs/list",
        HostListDirectoryResultSchema,
        path ? { path } : undefined,
        signal,
      );
    },
    userHomeDirectory(signal) {
      return json
        .getJson("/fs/home", HomeDirectoryResponseSchema, undefined, signal)
        .pipe(Effect.map((result) => result.path));
    },
    connectSmb(request, signal) {
      return json.postJson("/fs/smb/connect", request, SmbConnectResponseSchema, signal);
    },
    disconnectSmb(sessionId, signal) {
      return json
        .postJson(
          "/fs/smb/disconnect",
          { sessionId },
          Schema.Struct({ ok: Schema.Boolean }),
          signal,
        )
        .pipe(Effect.asVoid);
    },
  };
}

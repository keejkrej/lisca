import {
  HomeDirectoryResponseSchema,
  HostListDirectoryResultSchema,
} from "@lisca/contracts";
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
  };
}

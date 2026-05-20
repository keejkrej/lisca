import {
  HomeDirectoryResponseSchema,
  HostListDirectoryResultSchema,
  ReadTextFileResponseSchema,
  SaveAssayJsonResponseSchema,
  SaveResultPdfResponseSchema,
  type HostListDirectoryResult,
  type SaveResultPdfRequest,
} from "@lisca/contracts";

import { createJsonFetch } from "../fetch.ts";
import type { StudioHostPort } from "./types.ts";

export type { StudioHostPort } from "./types.ts";

export type HostPortDeps = {
  baseUrl: () => string;
  fetch?: typeof fetch;
};

export function createHostPort(deps: HostPortDeps) {
  const json = createJsonFetch(deps.baseUrl, deps.fetch);

  return {
    listDirectory(path: string | null, signal?: AbortSignal): Promise<HostListDirectoryResult> {
      return json.getJson(
        "/fs/list",
        HostListDirectoryResultSchema,
        path ? { path } : undefined,
        signal,
      );
    },
    async userHomeDirectory(signal?: AbortSignal): Promise<string> {
      const result = await json.getJson("/fs/home", HomeDirectoryResponseSchema, undefined, signal);
      return result.path;
    },
  };
}

export type StudioHostPortDeps = HostPortDeps;

export function createStudioHostPort(deps: StudioHostPortDeps): StudioHostPort {
  const json = createJsonFetch(deps.baseUrl, deps.fetch);
  const host = createHostPort(deps);

  return {
    listDirectory: host.listDirectory,
    userHomeDirectory: host.userHomeDirectory,
    async readTextFile(path: string, signal?: AbortSignal) {
      const result = await json.getJson(
        "/fs/read-text",
        ReadTextFileResponseSchema,
        { path },
        signal,
      );
      return result.contents;
    },
    saveAssayJson(saveTo: string, contents: string) {
      return json.postJson(
        "/studio/save-assay-json",
        { saveTo, contents },
        SaveAssayJsonResponseSchema,
      );
    },
    saveResultPdf(request: SaveResultPdfRequest) {
      return json.postJson("/studio/save-result-pdf", request, SaveResultPdfResponseSchema);
    },
  };
}

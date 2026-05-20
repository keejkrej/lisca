import { readJsonResponse } from "@lisca/contracts";
import type * as Schema from "effect/Schema";

export type JsonFetch = {
  getJson<S extends Schema.Schema.Any>(
    path: string,
    schema: S,
    params?: Record<string, string | number>,
    signal?: AbortSignal,
  ): Promise<Schema.Schema.Type<S>>;
  postJson<S extends Schema.Schema.Any>(
    path: string,
    body: unknown,
    schema: S,
    signal?: AbortSignal,
  ): Promise<Schema.Schema.Type<S>>;
};

export function createJsonFetch(
  baseUrl: () => string,
  fetchImpl: typeof fetch = fetch,
): JsonFetch {
  return {
    getJson(path, schema, params, signal) {
      const url = new URL(path, baseUrl());
      for (const [key, value] of Object.entries(params ?? {})) {
        url.searchParams.set(key, String(value));
      }
      return fetchImpl(url, { signal }).then((response) => readJsonResponse(response, schema));
    },
    postJson(path, body, schema, signal) {
      return fetchImpl(new URL(path, baseUrl()), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal,
      }).then((response) => readJsonResponse(response, schema));
    },
  };
}

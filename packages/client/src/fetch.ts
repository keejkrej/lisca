import { readJsonResponse } from "@lisca/contracts";
import { Effect } from "effect";
import type * as Schema from "effect/Schema";

import { toClientError } from "./client-error.ts";
import type { ClientEffect } from "./runtime.ts";

export type JsonFetch = {
  getJson<S extends Schema.Schema.Any>(
    path: string,
    schema: S,
    params?: Record<string, string | number>,
    signal?: AbortSignal,
  ): ClientEffect<Schema.Schema.Type<S>>;
  postJson<S extends Schema.Schema.Any>(
    path: string,
    body: unknown,
    schema: S,
    signal?: AbortSignal,
  ): ClientEffect<Schema.Schema.Type<S>>;
};

export function createJsonFetch(baseUrl: () => string, fetchImpl: typeof fetch = fetch): JsonFetch {
  return {
    getJson(path, schema, params, signal) {
      const url = new URL(path, baseUrl());
      for (const [key, value] of Object.entries(params ?? {})) {
        url.searchParams.set(key, String(value));
      }
      return Effect.tryPromise({
        try: (abortSignal) =>
          fetchImpl(url, { signal: signal ?? abortSignal }).then((response) =>
            readJsonResponse(response, schema),
          ),
        catch: toClientError,
      });
    },
    postJson(path, body, schema, signal) {
      return Effect.tryPromise({
        try: (abortSignal) =>
          fetchImpl(new URL(path, baseUrl()), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
            signal: signal ?? abortSignal,
          }).then((response) => readJsonResponse(response, schema)),
        catch: toClientError,
      });
    },
  };
}

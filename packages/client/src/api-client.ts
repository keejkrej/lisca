import { FetchHttpClient, HttpApiClient, HttpClient, HttpClientRequest } from "@effect/platform";
import { liscaApi } from "@lisca/contracts/http-api";
import { Effect, Layer } from "effect";

import { toClientError } from "./client-error.ts";
import type { ClientEffect } from "./runtime.ts";

export type ApiClientDeps = {
  baseUrl: () => string;
  fetch?: typeof fetch;
};

/**
 * Typed client derived from the Effect `HttpApi` contract. The base URL is
 * resolved per request (session server switching) by rewriting the outgoing
 * request, so a single client instance survives base-URL changes.
 */
export type LiscaApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(deps: ApiClientDeps) {
  const fetchLayer = deps.fetch
    ? FetchHttpClient.layer.pipe(
        Layer.provide(Layer.succeed(FetchHttpClient.Fetch, deps.fetch)),
      )
    : FetchHttpClient.layer;

  return Effect.runSync(
    HttpApiClient.make(liscaApi, {
      baseUrl: "",
      transformClient: (client) =>
        HttpClient.mapRequest(client, (request) =>
          HttpClientRequest.prependUrl(request, deps.baseUrl()),
        ),
    }).pipe(Effect.provide(fetchLayer)),
  );
}

/** Adapt a client call (which fails with platform/parse errors) to `ClientEffect`. */
export function toClientEffect<A, E>(effect: Effect.Effect<A, E>): ClientEffect<A> {
  return Effect.mapError(effect, toClientError);
}

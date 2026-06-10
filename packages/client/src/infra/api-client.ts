import { FetchHttpClient, HttpApiClient, HttpClient, HttpClientRequest } from "@effect/platform";
import { liscaApi } from "@lisca/contracts/http-api";
import { Context, Effect, Layer } from "effect";

import { toClientError } from "./client-error.ts";
import type { ClientEffect } from "./runtime.ts";

export type ApiClientDeps = {
  baseUrl: () => string;
  fetch?: typeof fetch;
};

function fetchLayerFor(deps: ApiClientDeps) {
  return deps.fetch
    ? FetchHttpClient.layer.pipe(Layer.provide(Layer.succeed(FetchHttpClient.Fetch, deps.fetch)))
    : FetchHttpClient.layer;
}

function makeApiClientEffect(deps: ApiClientDeps) {
  return HttpApiClient.make(liscaApi, {
    baseUrl: "",
    transformClient: (client) =>
      HttpClient.mapRequest(client, (request) =>
        HttpClientRequest.prependUrl(request, deps.baseUrl()),
      ),
  }).pipe(Effect.provide(fetchLayerFor(deps)));
}

export type LiscaApiClient = Effect.Effect.Success<ReturnType<typeof makeApiClientEffect>>;

export class LiscaApiClientService extends Context.Tag("@lisca/LiscaApiClient")<
  LiscaApiClientService,
  LiscaApiClient
>() {}

/** Layer that provides a shared typed HttpApi client. */
export function apiClientLayer(deps: ApiClientDeps): Layer.Layer<LiscaApiClientService> {
  return Layer.effect(LiscaApiClientService, makeApiClientEffect(deps));
}

/**
 * Typed client derived from the Effect `HttpApi` contract. The base URL is
 * resolved per request (session server switching) by rewriting the outgoing
 * request, so a single client instance survives base-URL changes.
 */
export function createApiClient(deps: ApiClientDeps): LiscaApiClient {
  return Effect.runSync(makeApiClientEffect(deps));
}

/** Adapt a client call (which fails with platform/parse errors) to `ClientEffect`. */
export function toClientEffect<A, E>(effect: Effect.Effect<A, E>): ClientEffect<A> {
  return Effect.mapError(effect, toClientError);
}

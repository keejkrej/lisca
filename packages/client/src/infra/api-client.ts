import { FetchHttpClient, HttpApiClient, HttpClient, HttpClientRequest } from "@effect/platform";
import { liscaApi } from "@lisca/contracts/http-api";
import { Effect, Layer } from "effect";

import { toClientError } from "./client-error";
import { createDesktopFetch, liscaDesktopBridge } from "./desktop";
import type { ClientEffect } from "./runtime";

export type ApiClientDeps = {
  baseUrl: () => string;
  fetch?: typeof fetch;
  accessToken?: () => string | undefined;
};

function fetchLayerFor(deps: ApiClientDeps) {
  const desktopBridge = liscaDesktopBridge();
  const transportFetch = deps.fetch ?? (desktopBridge ? createDesktopFetch(desktopBridge) : null);
  return transportFetch
    ? FetchHttpClient.layer.pipe(
        Layer.provide(Layer.succeed(FetchHttpClient.Fetch, transportFetch)),
      )
    : FetchHttpClient.layer;
}

function makeApiClientEffect(deps: ApiClientDeps) {
  return HttpApiClient.make(liscaApi, {
    baseUrl: "",
    transformClient: (client) =>
      HttpClient.mapRequest(client, (request) => {
        let next = HttpClientRequest.prependUrl(request, deps.baseUrl());
        const token = deps.accessToken?.();
        if (token) {
          next = HttpClientRequest.setHeader(next, "Authorization", `Bearer ${token}`);
        }
        return next;
      }),
  }).pipe(Effect.provide(fetchLayerFor(deps)));
}

export type LiscaApiClient = Effect.Effect.Success<ReturnType<typeof makeApiClientEffect>>;

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

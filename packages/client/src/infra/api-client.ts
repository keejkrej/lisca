import { FetchHttpClient } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { liscaApi } from "@lisca/contracts/http-api";
import { Effect, Layer } from "effect";

import { toClientError } from "./client-error";
import { createDesktopFetch, liscaDesktopBridge } from "./desktop";
import type { ClientEffect } from "./runtime";

export type ApiClientDeps = {
  /** Test seam; defaults to the Tauri bridge in desktop builds, else global `fetch`. */
  fetch?: typeof fetch;
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
  return HttpApiClient.make(liscaApi, { baseUrl: "" }).pipe(Effect.provide(fetchLayerFor(deps)));
}

export type LiscaApiClient = Effect.Success<ReturnType<typeof makeApiClientEffect>>;

/**
 * Typed client derived from the Effect `HttpApi` contract. Requests use origin-relative URLs:
 * web builds are served from the same origin as the server (Vite dev proxy or Docker nginx),
 * and desktop builds route them over Tauri IPC (ADR-0003).
 */
export function createApiClient(deps: ApiClientDeps): LiscaApiClient {
  return Effect.runSync(makeApiClientEffect(deps));
}

/** Adapt a client call (which fails with platform/parse errors) to `ClientEffect`. */
export function toClientEffect<A, E>(effect: Effect.Effect<A, E>): ClientEffect<A> {
  return Effect.mapError(effect, toClientError);
}

import { WS_PATH } from "@lisca/contracts";
import { toFetchErrorMessage } from "@lisca/client/errors";
import { createLiscaUrlResolver, readBrowserSearchParams } from "@lisca/client/urls";

const urls = createLiscaUrlResolver({
  searchParams: readBrowserSearchParams(),
  viteHttpUrl: import.meta.env.VITE_HTTP_URL,
  viteWsUrl: import.meta.env.VITE_WS_URL,
  viteWsHost: import.meta.env.VITE_WS_HOST,
  viteWsPort: import.meta.env.VITE_WS_PORT,
  defaultPort: 8765,
  wsPath: WS_PATH,
});

export function resolveAlignerHttpBaseUrl(): string {
  return urls.httpBaseUrl();
}

export function resolveAlignerWsUrl(): string {
  return urls.wsUrl();
}

export function createAlignerPortDeps() {
  return {
    baseUrl: resolveAlignerHttpBaseUrl,
    wsUrl: resolveAlignerWsUrl,
    isDev: import.meta.env.DEV,
  };
}

export function toErrorMessage(cause: unknown, fallback: string): string {
  return toFetchErrorMessage(cause, fallback, resolveAlignerHttpBaseUrl());
}

/** @deprecated Use {@link createAlignerPortDeps} with `@lisca/client/ports/aligner`. */
export { createAlignerPortDeps as createAlignerHttpClientDeps };

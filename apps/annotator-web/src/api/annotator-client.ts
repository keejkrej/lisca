import { WS_PATH } from "@lisca/contracts";
import { toFetchErrorMessage } from "@lisca/client/errors";
import { createLiscaUrlResolver, readBrowserSearchParams } from "@lisca/client/urls";

const urls = createLiscaUrlResolver({
  searchParams: readBrowserSearchParams(),
  viteHttpUrl: import.meta.env.VITE_HTTP_URL,
  viteWsUrl: import.meta.env.VITE_WS_URL,
  viteWsHost: import.meta.env.VITE_WS_HOST,
  viteWsPort: import.meta.env.VITE_WS_PORT,
  defaultPort: 8766,
  wsPath: WS_PATH,
});

export function resolveAnnotatorHttpBaseUrl(): string {
  return urls.httpBaseUrl();
}

export function resolveAnnotatorWsUrl(): string {
  return urls.wsUrl();
}

export function createAnnotatorPortDeps() {
  return {
    baseUrl: resolveAnnotatorHttpBaseUrl,
  };
}

export function toErrorMessage(cause: unknown, fallback: string): string {
  return toFetchErrorMessage(cause, fallback, resolveAnnotatorHttpBaseUrl());
}

/** @deprecated Use {@link resolveAnnotatorHttpBaseUrl}. */
export { resolveAnnotatorHttpBaseUrl as annotatorBaseUrl };

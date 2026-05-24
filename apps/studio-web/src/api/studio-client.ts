import { WS_PATH } from "@lisca/contracts";
import { toFetchErrorMessage } from "@lisca/client/errors";
import { createLiscaUrlResolver, readBrowserSearchParams } from "@lisca/client/urls";

const urls = createLiscaUrlResolver({
  searchParams: readBrowserSearchParams(),
  viteHttpUrl: import.meta.env.VITE_HTTP_URL,
  viteWsUrl: import.meta.env.VITE_WS_URL,
  viteWsHost: import.meta.env.VITE_WS_HOST,
  viteWsPort: import.meta.env.VITE_WS_PORT,
  defaultPort: 8767,
  wsPath: WS_PATH,
});

export function resolveStudioHttpBaseUrl(): string {
  return urls.httpBaseUrl();
}

export function resolveStudioWsUrl(): string {
  return urls.wsUrl();
}

export function createStudioPortDeps() {
  return {
    baseUrl: resolveStudioHttpBaseUrl,
    wsUrl: resolveStudioWsUrl,
    isDev: import.meta.env.DEV,
  };
}

export function toErrorMessage(cause: unknown, fallback: string): string {
  return toFetchErrorMessage(cause, fallback, resolveStudioHttpBaseUrl());
}

/** @deprecated Use {@link createStudioPortDeps}. */
export { createStudioPortDeps as createStudioHttpClientDeps };

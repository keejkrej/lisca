import { WS_PATH } from "@lisca/contracts";
import { createLiscaUrlResolver } from "@lisca/client/urls";

function alignerUrlOptions() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  return {
    searchParams: params,
    viteHttpUrl: import.meta.env.VITE_HTTP_URL,
    viteWsUrl: import.meta.env.VITE_WS_URL,
    viteWsHost: import.meta.env.VITE_WS_HOST,
    viteWsPort: import.meta.env.VITE_WS_PORT,
    defaultPort: 8765,
    wsPath: WS_PATH,
  };
}

const urls = createLiscaUrlResolver(alignerUrlOptions());

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

/** @deprecated Use {@link createAlignerPortDeps} with `@lisca/client/ports/aligner`. */
export { createAlignerPortDeps as createAlignerHttpClientDeps };

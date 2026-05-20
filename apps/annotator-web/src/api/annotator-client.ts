import { createLiscaUrlResolver } from "@lisca/client/urls";

function annotatorUrlOptions() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  return {
    searchParams: params,
    viteHttpUrl: import.meta.env.VITE_HTTP_URL,
    viteWsHost: import.meta.env.VITE_WS_HOST,
    viteWsPort: import.meta.env.VITE_HTTP_PORT ?? import.meta.env.VITE_WS_PORT,
    defaultPort: 8766,
  };
}

const urls = createLiscaUrlResolver(annotatorUrlOptions());

export function annotatorBaseUrl(): string {
  return urls.httpBaseUrl();
}

export function createAnnotatorPortDeps() {
  return {
    baseUrl: annotatorBaseUrl,
  };
}

/** @deprecated Use {@link createAnnotatorPortDeps}. */
export { annotatorBaseUrl as resolveAnnotatorHttpBaseUrl };

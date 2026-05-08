export function formatWsUrl(host: string, port: number, path: string): string {
  const proto = host === "localhost" || host === "127.0.0.1" ? "ws" : "wss";
  return `${proto}://${host}:${port}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Resolve the WebSocket URL for Lisca web UIs.
 *
 * Precedence: URL query `liscaWs` or `wsUrl` (e.g. injected by the native shell) →
 * `VITE_WS_URL` → host/port via {@link formatWsUrl} (local host uses `ws:`, otherwise `wss:`).
 */
export function resolveLiscaWsUrl(options: {
  searchParams?: URLSearchParams | null;
  viteWsUrl?: string | undefined;
  viteWsHost?: string | undefined;
  viteWsPort?: string | number | undefined;
  /** Used when building from host/port and `VITE_WS_PORT` is unset */
  defaultPort: number;
  wsPath?: string;
}): string {
  const fromQuery = options.searchParams?.get("liscaWs") ?? options.searchParams?.get("wsUrl");
  if (fromQuery?.trim()) {
    return decodeURIComponent(fromQuery.trim());
  }
  if (options.viteWsUrl?.trim()) {
    return options.viteWsUrl.trim();
  }
  const path = options.wsPath ?? "/ws";
  const port = Number(options.viteWsPort ?? options.defaultPort);
  const host = options.viteWsHost?.trim() || "127.0.0.1";
  return formatWsUrl(host, port, path);
}

import { liscaLocalStorage } from "@lisca/storage";

export function formatWsUrl(host: string, port: number, path: string): string {
  const proto = host === "localhost" || host === "127.0.0.1" ? "ws" : "wss";
  return `${proto}://${host}:${port}${path.startsWith("/") ? path : `/${path}`}`;
}

/** @deprecated Migrated into {@link LISCA_SAVED_SERVERS_STORAGE_KEY}. */
export const LISCA_SERVER_ADDRESS_STORAGE_KEY = "lisca.serverAddress";

export const LISCA_SAVED_SERVERS_STORAGE_KEY = "lisca.savedServers";

let activeServerAddress: string | null = null;

/** Session-only target; `null` means the local default server. Not persisted across reloads. */
export function getLiscaActiveServerAddress(): string | null {
  return activeServerAddress;
}

export function setLiscaActiveServerAddress(value: string | null): void {
  activeServerAddress = value?.trim() ? value.trim() : null;
}

function migrateLegacyServerOverride(): void {
  const storage = liscaLocalStorage();
  const legacy = storage.getItem(LISCA_SERVER_ADDRESS_STORAGE_KEY)?.trim();
  if (!legacy) return;
  const saved = readLiscaSavedServers();
  if (!saved.includes(legacy)) {
    writeLiscaSavedServers([legacy, ...saved]);
  }
  storage.removeItem(LISCA_SERVER_ADDRESS_STORAGE_KEY);
}

export function readLiscaSavedServers(): string[] {
  migrateLegacyServerOverride();
  const raw = liscaLocalStorage().getItem(LISCA_SAVED_SERVERS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
    );
  } catch {
    return [];
  }
}

export function writeLiscaSavedServers(servers: string[]): void {
  const storage = liscaLocalStorage();
  const unique = [...new Set(servers.map((entry) => entry.trim()).filter(Boolean))];
  if (unique.length === 0) {
    storage.removeItem(LISCA_SAVED_SERVERS_STORAGE_KEY);
    return;
  }
  storage.setItem(LISCA_SAVED_SERVERS_STORAGE_KEY, JSON.stringify(unique));
}

export function addLiscaSavedServer(
  input: string,
  options: { defaultPort: number; wsPath?: string },
): string[] {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Server address is required");
  parseLiscaServerAddress(trimmed, options);
  const next = readLiscaSavedServers();
  if (next.includes(trimmed)) return next;
  const updated = [...next, trimmed];
  writeLiscaSavedServers(updated);
  return updated;
}

export function removeLiscaSavedServer(address: string): string[] {
  const trimmed = address.trim();
  const updated = readLiscaSavedServers().filter((entry) => entry !== trimmed);
  writeLiscaSavedServers(updated);
  return updated;
}

export type LiscaServerEndpoints = {
  wsUrl: string;
  httpBaseUrl: string;
};

/**
 * Parse a user-entered server address into HTTP and WebSocket endpoints.
 *
 * Accepts a WebSocket URL, HTTP(S) origin, or `host:port` (uses {@link defaultPort} when port omitted).
 */
export function parseLiscaServerAddress(
  input: string,
  options: { defaultPort: number; wsPath?: string },
): LiscaServerEndpoints {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Server address is required");
  }

  const wsPath = options.wsPath ?? "/ws";

  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
    const url = new URL(trimmed);
    const httpProto = url.protocol === "wss:" ? "https:" : "http:";
    return {
      wsUrl: trimmed,
      httpBaseUrl: `${httpProto}//${url.host}`,
    };
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const url = new URL(trimmed);
    const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
    return {
      httpBaseUrl: url.origin,
      wsUrl: formatWsUrl(url.hostname, port, wsPath),
    };
  }

  const colonIndex = trimmed.lastIndexOf(":");
  let host = trimmed;
  let port = options.defaultPort;
  if (colonIndex > 0) {
    host = trimmed.slice(0, colonIndex);
    port = Number(trimmed.slice(colonIndex + 1)) || options.defaultPort;
  }

  return {
    httpBaseUrl: `http://${host}:${port}`,
    wsUrl: formatWsUrl(host, port, wsPath),
  };
}

function endpointsFromStoredOverride(
  stored: string,
  defaultPort: number,
  wsPath: string,
): LiscaServerEndpoints {
  return parseLiscaServerAddress(stored, { defaultPort, wsPath });
}

function httpBaseUrlFromWsUrl(wsUrl: string): string | null {
  try {
    const url = new URL(wsUrl);
    const httpProto = url.protocol === "wss:" ? "https:" : "http:";
    return `${httpProto}//${url.host}`;
  } catch {
    return null;
  }
}

function hasExplicitViteEndpoint(options: {
  viteWsUrl?: string | undefined;
  viteHttpUrl?: string | undefined;
  viteWsHost?: string | undefined;
  viteWsPort?: string | number | undefined;
}): boolean {
  return Boolean(
    options.viteWsUrl?.trim() ||
    options.viteHttpUrl?.trim() ||
    options.viteWsHost?.trim() ||
    (options.viteWsPort !== undefined &&
      options.viteWsPort !== null &&
      String(options.viteWsPort).trim() !== ""),
  );
}

function endpointsFromBrowserLocation(wsPath: string): LiscaServerEndpoints | null {
  if (typeof window === "undefined") return null;
  const path = wsPath.startsWith("/") ? wsPath : `/${wsPath}`;
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  return {
    httpBaseUrl: `${window.location.protocol}//${host}`,
    wsUrl: `${proto}://${host}${path}`,
  };
}

/**
 * Resolve the WebSocket URL for Lisca web UIs.
 *
 * Precedence: URL query `liscaWs` → session active server → `VITE_WS_URL` → host/port env.
 */
export function resolveLiscaWsUrl(options: {
  searchParams?: URLSearchParams | null;
  viteWsUrl?: string | undefined;
  viteWsHost?: string | undefined;
  viteWsPort?: string | number | undefined;
  /** Used when building from host/port and `VITE_WS_PORT` is unset */
  defaultPort: number;
  wsPath?: string;
  /** Session target; defaults to {@link getLiscaActiveServerAddress}. */
  activeAddress?: string | null;
}): string {
  const fromQuery = options.searchParams?.get("liscaWs");
  if (fromQuery?.trim()) {
    return decodeURIComponent(fromQuery.trim());
  }
  const active = options.activeAddress ?? getLiscaActiveServerAddress();
  if (active) {
    return endpointsFromStoredOverride(active, options.defaultPort, options.wsPath ?? "/ws").wsUrl;
  }
  if (options.viteWsUrl?.trim()) {
    return options.viteWsUrl.trim();
  }
  const path = options.wsPath ?? "/ws";
  if (!hasExplicitViteEndpoint(options)) {
    const fromBrowser = endpointsFromBrowserLocation(path);
    if (fromBrowser) return fromBrowser.wsUrl;
  }
  const port = Number(options.viteWsPort ?? options.defaultPort);
  const host = options.viteWsHost?.trim() || "127.0.0.1";
  return formatWsUrl(host, port, path);
}

/**
 * Resolve the HTTP API base URL for Lisca web UIs (same precedence as {@link resolveLiscaWsUrl}).
 */
export function resolveLiscaHttpBaseUrl(options: {
  searchParams?: URLSearchParams | null;
  viteHttpUrl?: string | undefined;
  viteWsHost?: string | undefined;
  viteWsPort?: string | number | undefined;
  defaultPort: number;
  wsPath?: string;
  activeAddress?: string | null;
}): string {
  const fromQuery = options.searchParams?.get("liscaWs");
  if (fromQuery?.trim()) {
    const httpFromWs = httpBaseUrlFromWsUrl(decodeURIComponent(fromQuery.trim()));
    if (httpFromWs) return httpFromWs;
  }
  const active = options.activeAddress ?? getLiscaActiveServerAddress();
  if (active) {
    return endpointsFromStoredOverride(active, options.defaultPort, options.wsPath ?? "/ws")
      .httpBaseUrl;
  }
  if (options.viteHttpUrl?.trim()) {
    return options.viteHttpUrl.trim();
  }
  if (!hasExplicitViteEndpoint(options)) {
    const fromBrowser = endpointsFromBrowserLocation(options.wsPath ?? "/ws");
    if (fromBrowser) return fromBrowser.httpBaseUrl;
  }
  const port = Number(options.viteWsPort ?? options.defaultPort);
  const host = options.viteWsHost?.trim() || "127.0.0.1";
  return `http://${host}:${port}`;
}


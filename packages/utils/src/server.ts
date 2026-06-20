import { liscaLocalStorage } from "@lisca/storage";

/** @deprecated Migrated into {@link LISCA_SAVED_SERVERS_STORAGE_KEY}. */
export const LISCA_SERVER_ADDRESS_STORAGE_KEY = "lisca.serverAddress";

export const LISCA_SAVED_SERVERS_STORAGE_KEY = "lisca.savedServers";

export type LiscaAppId = "aligner" | "annotator" | "studio";

export const LISCA_APP_DEFAULT_PORTS: Record<LiscaAppId, number> = {
  aligner: 8765,
  annotator: 8766,
  studio: 8767,
};

function activeServerStorageKey(appId: LiscaAppId): string {
  return `lisca.activeServer.${appId}`;
}

export function readLiscaActiveServerForApp(appId: LiscaAppId): string | null {
  const raw = liscaLocalStorage().getItem(activeServerStorageKey(appId))?.trim();
  return raw ? raw : null;
}

export function writeLiscaActiveServerForApp(appId: LiscaAppId, address: string | null): void {
  const storage = liscaLocalStorage();
  const trimmed = address?.trim();
  if (!trimmed) {
    storage.removeItem(activeServerStorageKey(appId));
    return;
  }
  storage.setItem(activeServerStorageKey(appId), trimmed);
}

export function persistLiscaActiveServer(appId: LiscaAppId, address: string | null): void {
  writeLiscaActiveServerForApp(appId, address);
  setLiscaActiveServerAddress(address?.trim() ? address.trim() : null);
}

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

export function addLiscaSavedServer(input: string, options: { defaultPort: number }): string[] {
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
  httpBaseUrl: string;
};

/**
 * Parse a user-entered server address into an HTTP API base URL.
 *
 * Accepts an HTTP(S) origin or `host:port` (uses {@link defaultPort} when port omitted).
 */
export function parseLiscaServerAddress(
  input: string,
  options: { defaultPort: number },
): LiscaServerEndpoints {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Server address is required");
  }

  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
    throw new Error("Use an http:// or https:// server address");
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const url = new URL(trimmed);
    return {
      httpBaseUrl: url.origin,
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
  };
}

function endpointsFromStoredOverride(stored: string, defaultPort: number): LiscaServerEndpoints {
  return parseLiscaServerAddress(stored, { defaultPort });
}

function hasExplicitViteEndpoint(options: {
  viteHttpUrl?: string | undefined;
  viteHttpHost?: string | undefined;
  viteHttpPort?: string | number | undefined;
}): boolean {
  return Boolean(
    options.viteHttpUrl?.trim() ||
    options.viteHttpHost?.trim() ||
    (options.viteHttpPort !== undefined &&
      options.viteHttpPort !== null &&
      String(options.viteHttpPort).trim() !== ""),
  );
}

function httpBaseUrlFromBrowserLocation(): string | null {
  if (typeof window === "undefined") return null;
  if (window.location.protocol !== "http:" && window.location.protocol !== "https:") {
    return null;
  }
  return `${window.location.protocol}//${window.location.host}`;
}

/**
 * Resolve the HTTP API base URL for Lisca web UIs.
 *
 * Precedence: URL query `liscaHttp` → session active server → `VITE_HTTP_URL` →
 * `VITE_HTTP_HOST`/`VITE_HTTP_PORT` → browser origin.
 */
export function resolveLiscaHttpBaseUrl(options: {
  searchParams?: URLSearchParams | null;
  viteHttpUrl?: string | undefined;
  viteHttpHost?: string | undefined;
  viteHttpPort?: string | number | undefined;
  defaultPort: number;
  /** Session target; defaults to {@link getLiscaActiveServerAddress}. */
  activeAddress?: string | null;
}): string {
  const fromHttpQuery = options.searchParams?.get("liscaHttp");
  if (fromHttpQuery?.trim()) {
    return decodeURIComponent(fromHttpQuery.trim());
  }
  const active = options.activeAddress ?? getLiscaActiveServerAddress();
  if (active) {
    return endpointsFromStoredOverride(active, options.defaultPort).httpBaseUrl;
  }
  if (options.viteHttpUrl?.trim()) {
    return options.viteHttpUrl.trim();
  }
  if (!hasExplicitViteEndpoint(options)) {
    const fromBrowser = httpBaseUrlFromBrowserLocation();
    if (fromBrowser) return fromBrowser;
  }
  const port = Number(options.viteHttpPort ?? options.defaultPort);
  const host = options.viteHttpHost?.trim() || "127.0.0.1";
  return `http://${host}:${port}`;
}

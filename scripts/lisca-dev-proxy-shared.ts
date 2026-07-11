import { LISCA_API_PROXY_PREFIXES } from "./lisca-dev-ports";

export function pathnameFromUrl(url: string): string {
  try {
    return new URL(url, "http://127.0.0.1").pathname;
  } catch {
    return (url ?? "/").split("?")[0] ?? "/";
  }
}

/** True when a dev-server request should be proxied to the Rust backend. */
export function isLiscaApiProxyPath(url: string): boolean {
  const path = pathnameFromUrl(url);
  return LISCA_API_PROXY_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** Benign when Rust restarts (cargo watch) or the shell WS probe retries. */
export function isBenignDevWsProxyError(message: string): boolean {
  if (!message.includes("ws proxy")) return false;
  return message.includes("EPIPE") || message.includes("ECONNRESET");
}

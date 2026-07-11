const { LISCA_API_PROXY_PREFIXES } = require("./lisca-dev-ports.cjs");

function pathnameFromUrl(url) {
  try {
    return new URL(url, "http://127.0.0.1").pathname;
  } catch {
    return (url ?? "/").split("?")[0] ?? "/";
  }
}

/** True when a dev-server request should be proxied to the Rust backend. */
function isLiscaApiProxyPath(url) {
  const path = pathnameFromUrl(url);
  return LISCA_API_PROXY_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

const BENIGN_PROXY_SOCKET_CODES = ["EPIPE", "ECONNRESET"];

function messageIncludesBenignProxySocketCode(message) {
  return BENIGN_PROXY_SOCKET_CODES.some((code) => message.includes(code));
}

/** Benign when Rust restarts (cargo watch) or the browser aborts an in-flight request. */
function isBenignDevProxyError(message) {
  if (!messageIncludesBenignProxySocketCode(message)) return false;
  if (message.includes("ws proxy") || message.includes("http proxy")) return true;
  return message.includes("write EPIPE") || message.includes("read ECONNRESET");
}

function isBenignProxySocketError(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    BENIGN_PROXY_SOCKET_CODES.includes(error.code)
  );
}

module.exports = {
  pathnameFromUrl,
  isLiscaApiProxyPath,
  isBenignDevProxyError,
  isBenignDevWsProxyError: isBenignDevProxyError,
  isBenignProxySocketError,
};
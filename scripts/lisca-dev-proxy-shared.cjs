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

/** Benign when Rust restarts (cargo watch) or the shell WS probe retries. */
function isBenignDevWsProxyError(message) {
  if (!message.includes("ws proxy")) return false;
  return message.includes("EPIPE") || message.includes("ECONNRESET");
}

module.exports = {
  pathnameFromUrl,
  isLiscaApiProxyPath,
  isBenignDevWsProxyError,
};

/** @typedef {{ publicPort: number; backendPort: number }} LiscaDevPorts */

const LISCA_DEV_BACKEND_PORT_OFFSET = 1000;

/** API path prefixes proxied from dev UI servers (Vite, mobile) to the Rust backend. */
const LISCA_API_PROXY_PREFIXES = [
  "/ws",
  "/fs",
  "/align",
  "/annotate",
  "/studio",
  "/profile",
  "/memory",
];

/** @type {Record<"aligner" | "annotator" | "studio", LiscaDevPorts>} */
const LISCA_APP_PORTS = {
  aligner: { publicPort: 8765, backendPort: 8765 + LISCA_DEV_BACKEND_PORT_OFFSET },
  annotator: { publicPort: 8766, backendPort: 8766 + LISCA_DEV_BACKEND_PORT_OFFSET },
  studio: { publicPort: 8767, backendPort: 8767 + LISCA_DEV_BACKEND_PORT_OFFSET },
};

/** Public browser port for `bun lisca dev * mobile` (API proxied to Rust on 876x). */
const LISCA_MOBILE_PORTS = {
  aligner: 8081,
  annotator: 8082,
  studio: 8083,
};

function liscaMobileExpoPort(publicPort) {
  return publicPort + LISCA_DEV_BACKEND_PORT_OFFSET;
}

function liscaDevBackendPort(publicPort) {
  return publicPort + LISCA_DEV_BACKEND_PORT_OFFSET;
}

module.exports = {
  LISCA_DEV_BACKEND_PORT_OFFSET,
  LISCA_API_PROXY_PREFIXES,
  LISCA_APP_PORTS,
  LISCA_MOBILE_PORTS,
  liscaDevBackendPort,
  liscaMobileExpoPort,
};

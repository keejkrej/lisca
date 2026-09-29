/** @typedef {{ publicPort: number; backendPort: number }} LiscaDevPorts */

const LISCA_DEV_BACKEND_PORT_OFFSET = 1000;

/** API path prefixes proxied from dev UI servers (Vite) to the Rust backend. */
const LISCA_API_PROXY_PREFIXES = [
  "/fs",
  "/align",
  "/annotate",
  "/studio",
  "/profile",
  "/memory",
  "/tasks",
];

/** @type {Record<"aligner" | "annotator" | "studio", LiscaDevPorts>} */
const LISCA_APP_PORTS = {
  aligner: { publicPort: 18765, backendPort: 18765 + LISCA_DEV_BACKEND_PORT_OFFSET },
  annotator: { publicPort: 18766, backendPort: 18766 + LISCA_DEV_BACKEND_PORT_OFFSET },
  studio: { publicPort: 18767, backendPort: 18767 + LISCA_DEV_BACKEND_PORT_OFFSET },
};

function liscaDevBackendPort(publicPort) {
  return publicPort + LISCA_DEV_BACKEND_PORT_OFFSET;
}

module.exports = {
  LISCA_DEV_BACKEND_PORT_OFFSET,
  LISCA_API_PROXY_PREFIXES,
  LISCA_APP_PORTS,
  liscaDevBackendPort,
};

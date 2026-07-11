export const LISCA_DEV_BACKEND_PORT_OFFSET = 1000;

/** API path prefixes proxied from dev UI servers (Vite) to the Rust backend. */
export const LISCA_API_PROXY_PREFIXES = [
  "/fs",
  "/align",
  "/annotate",
  "/studio",
  "/profile",
  "/memory",
] as const;

export type LiscaProduct = "aligner" | "annotator" | "studio";

export type LiscaDevPorts = {
  publicPort: number;
  backendPort: number;
};

export const LISCA_APP_PORTS: Record<LiscaProduct, LiscaDevPorts> = {
  aligner: { publicPort: 8765, backendPort: 8765 + LISCA_DEV_BACKEND_PORT_OFFSET },
  annotator: { publicPort: 8766, backendPort: 8766 + LISCA_DEV_BACKEND_PORT_OFFSET },
  studio: { publicPort: 8767, backendPort: 8767 + LISCA_DEV_BACKEND_PORT_OFFSET },
};

export function liscaDevBackendPort(publicPort: number): number {
  return publicPort + LISCA_DEV_BACKEND_PORT_OFFSET;
}

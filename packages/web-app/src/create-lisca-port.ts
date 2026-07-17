export type { LiscaPortDeps, LiscaPort } from "@lisca/client/port-core";

import type { LiscaPortDeps } from "@lisca/client/port-core";
import { readBrowserSearchParams } from "@lisca/client/urls";
import { createLiscaPortCore, type LiscaPort } from "@lisca/client/port-core";

/**
 * Fold per-app port construction, URL resolution, and error formatting into one
 * factory. Each app supplies only its default port and `create*Port`.
 */
export function createLiscaPort<T>(config: {
  defaultPort: number;
  createPort: (deps: LiscaPortDeps) => T;
}): LiscaPort<T> {
  return createLiscaPortCore({
    defaultPort: config.defaultPort,
    searchParams: readBrowserSearchParams(),
    httpUrl: import.meta.env.VITE_HTTP_URL,
    httpHost: import.meta.env.VITE_HTTP_HOST,
    httpPort: import.meta.env.VITE_HTTP_PORT,
    dev: import.meta.env.DEV,
    createPort: config.createPort,
  });
}

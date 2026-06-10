import { readBrowserSearchParams } from "@lisca/client/urls";
import {
  createLiscaPortCore,
  type LiscaPort,
  type LiscaPortDeps,
} from "@lisca/client/port-core";

/** Vite-provided URL overrides, read once at app bootstrap. */
export type LiscaPortEnv = {
  httpUrl?: string | undefined;
  wsUrl?: string | undefined;
  wsHost?: string | undefined;
  wsPort?: string | number | undefined;
  dev?: boolean;
};

export type { LiscaPortDeps, LiscaPort };

/**
 * Fold the per-app port registry, URL resolver, and error formatter into one
 * factory. Each app supplies only its default port, Vite env, and `create*Port`.
 */
export function createLiscaPort<T>(config: {
  defaultPort: number;
  env?: LiscaPortEnv;
  createPort: (deps: LiscaPortDeps) => T;
}): LiscaPort<T> {
  const env = config.env ?? {};
  return createLiscaPortCore({
    defaultPort: config.defaultPort,
    searchParams: readBrowserSearchParams(),
    httpUrl: env.httpUrl,
    wsUrl: env.wsUrl,
    wsHost: env.wsHost,
    wsPort: env.wsPort,
    dev: env.dev,
    createPort: config.createPort,
  });
}

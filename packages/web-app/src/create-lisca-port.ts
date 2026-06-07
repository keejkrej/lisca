import { WS_PATH } from "@lisca/contracts";
import { toFetchErrorMessage } from "@lisca/client/errors";
import { createPortRegistry, type PortRegistry } from "@lisca/client/port-registry";
import { createLiscaUrlResolver, readBrowserSearchParams } from "@lisca/client/urls";

/** Vite-provided URL overrides, read once at app bootstrap. */
export type LiscaPortEnv = {
  httpUrl?: string | undefined;
  wsUrl?: string | undefined;
  wsHost?: string | undefined;
  wsPort?: string | number | undefined;
  dev?: boolean;
};

/** Dependencies handed to every `create*Port` factory. */
export type LiscaPortDeps = {
  baseUrl: () => string;
  wsUrl: () => string;
  isDev: boolean;
};

export type LiscaPort<T> = {
  registry: PortRegistry<T>;
  read: () => T | undefined;
  ensure: () => T;
  setForTests: (port: T) => void;
  resetForTests: () => void;
  httpBaseUrl: () => string;
  wsUrl: () => string;
  toErrorMessage: (cause: unknown, fallback: string) => string;
};

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
  const urls = createLiscaUrlResolver({
    searchParams: readBrowserSearchParams(),
    viteHttpUrl: env.httpUrl,
    viteWsUrl: env.wsUrl,
    viteWsHost: env.wsHost,
    viteWsPort: env.wsPort,
    defaultPort: config.defaultPort,
    wsPath: WS_PATH,
  });

  const httpBaseUrl = () => urls.httpBaseUrl();
  const wsUrl = () => urls.wsUrl();

  const registry = createPortRegistry(() =>
    config.createPort({ baseUrl: httpBaseUrl, wsUrl, isDev: env.dev ?? false }),
  );

  return {
    registry,
    read: () => registry.read(),
    ensure: () => registry.ensure(),
    setForTests: (port: T) => registry.setForTests(port),
    resetForTests: () => registry.resetForTests(),
    httpBaseUrl,
    wsUrl,
    toErrorMessage: (cause, fallback) => toFetchErrorMessage(cause, fallback, httpBaseUrl()),
  };
}

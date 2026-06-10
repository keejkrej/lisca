import { WS_PATH } from "@lisca/contracts";
import { toFetchErrorMessage } from "./errors.ts";
import { createPortRegistry, type PortRegistry } from "./port-registry.ts";
import { createLiscaUrlResolver } from "./urls.ts";

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

export function createLiscaPortCore<T>(config: {
  defaultPort: number;
  searchParams?: URLSearchParams | null;
  httpUrl?: string;
  wsUrl?: string;
  wsHost?: string;
  wsPort?: string | number;
  dev?: boolean;
  createPort: (deps: LiscaPortDeps) => T;
}): LiscaPort<T> {
  const urls = createLiscaUrlResolver({
    searchParams: config.searchParams ?? null,
    viteHttpUrl: config.httpUrl,
    viteWsUrl: config.wsUrl,
    viteWsHost: config.wsHost,
    viteWsPort: config.wsPort,
    defaultPort: config.defaultPort,
    wsPath: WS_PATH,
  });

  const httpBaseUrl = () => urls.httpBaseUrl();
  const wsUrl = () => urls.wsUrl();

  const registry = createPortRegistry(() =>
    config.createPort({ baseUrl: httpBaseUrl, wsUrl, isDev: config.dev ?? false }),
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

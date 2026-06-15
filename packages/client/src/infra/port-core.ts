import { toFetchErrorMessage } from "./errors";
import { createPortRegistry, type PortRegistry } from "./port-registry";
import { createLiscaUrlResolver } from "./urls";

/** Dependencies handed to every `create*Port` factory. */
export type LiscaPortDeps = {
  baseUrl: () => string;
  isDev: boolean;
};

export type LiscaPort<T> = {
  registry: PortRegistry<T>;
  read: () => T | undefined;
  ensure: () => T;
  setForTests: (port: T) => void;
  resetForTests: () => void;
  httpBaseUrl: () => string;
  toErrorMessage: (cause: unknown, fallback: string) => string;
};

export function createLiscaPortCore<T>(config: {
  defaultPort: number;
  searchParams?: URLSearchParams | null;
  httpUrl?: string;
  httpHost?: string;
  httpPort?: string | number;
  dev?: boolean;
  createPort: (deps: LiscaPortDeps) => T;
}): LiscaPort<T> {
  const urls = createLiscaUrlResolver({
    searchParams: config.searchParams ?? null,
    viteHttpUrl: config.httpUrl,
    viteHttpHost: config.httpHost,
    viteHttpPort: config.httpPort,
    defaultPort: config.defaultPort,
  });

  const httpBaseUrl = () => urls.httpBaseUrl();

  const registry = createPortRegistry(() =>
    config.createPort({ baseUrl: httpBaseUrl, isDev: config.dev ?? false }),
  );

  return {
    registry,
    read: () => registry.read(),
    ensure: () => registry.ensure(),
    setForTests: (port: T) => registry.setForTests(port),
    resetForTests: () => registry.resetForTests(),
    httpBaseUrl,
    toErrorMessage: (cause, fallback) => toFetchErrorMessage(cause, fallback, httpBaseUrl()),
  };
}

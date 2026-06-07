import { WS_PATH } from "@lisca/contracts";
import { toFetchErrorMessage } from "@lisca/client/errors";
import { createPortRegistry, type PortRegistry } from "@lisca/client/port-registry";
import { createLiscaUrlResolver } from "@lisca/client/urls";

export type LiscaMobilePortEnv = {
  httpUrl?: string | undefined;
  wsUrl?: string | undefined;
  wsHost?: string | undefined;
  wsPort?: string | number | undefined;
  dev?: boolean;
  searchParams?: URLSearchParams | null;
};

export type LiscaPortDeps = {
  baseUrl: () => string;
  wsUrl: () => string;
  isDev: boolean;
};

export type LiscaMobilePort<T> = {
  registry: PortRegistry<T>;
  read: () => T | undefined;
  ensure: () => T;
  setForTests: (port: T) => void;
  resetForTests: () => void;
  httpBaseUrl: () => string;
  wsUrl: () => string;
  toErrorMessage: (cause: unknown, fallback: string) => string;
};

function readExpoEnv(): LiscaMobilePortEnv {
  const env = process.env;
  return {
    httpUrl: env.EXPO_PUBLIC_LISCA_HTTP_URL,
    wsUrl: env.EXPO_PUBLIC_LISCA_WS_URL,
    wsHost: env.EXPO_PUBLIC_LISCA_WS_HOST,
    wsPort: env.EXPO_PUBLIC_LISCA_WS_PORT,
    dev: env.NODE_ENV !== "production",
  };
}

export function createLiscaMobilePort<T>(config: {
  defaultPort: number;
  env?: LiscaMobilePortEnv;
  createPort: (deps: LiscaPortDeps) => T;
}): LiscaMobilePort<T> {
  const env = { ...readExpoEnv(), ...config.env };
  const urls = createLiscaUrlResolver({
    searchParams: env.searchParams ?? null,
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

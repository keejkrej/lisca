import {
  createLiscaPortCore,
  type LiscaPortDeps,
} from "@lisca/client/port-core";

export type LiscaMobilePortEnv = {
  httpUrl?: string | undefined;
  wsUrl?: string | undefined;
  wsHost?: string | undefined;
  wsPort?: string | number | undefined;
  dev?: boolean;
  searchParams?: URLSearchParams | null;
};

export type LiscaMobilePort<T> = ReturnType<typeof createLiscaPortCore<T>>;

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
  return createLiscaPortCore({
    defaultPort: config.defaultPort,
    searchParams: env.searchParams ?? null,
    httpUrl: env.httpUrl,
    wsUrl: env.wsUrl,
    wsHost: env.wsHost,
    wsPort: env.wsPort,
    dev: env.dev,
    createPort: config.createPort,
  });
}

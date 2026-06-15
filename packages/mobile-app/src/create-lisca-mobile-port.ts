import {
  createLiscaPortCore,
  type LiscaPortDeps,
} from "@lisca/client/port-core";

export type LiscaMobilePortEnv = {
  httpUrl?: string | undefined;
  httpHost?: string | undefined;
  httpPort?: string | number | undefined;
  dev?: boolean;
  searchParams?: URLSearchParams | null;
};

export type LiscaMobilePort<T> = ReturnType<typeof createLiscaPortCore<T>>;

function readExpoEnv(): LiscaMobilePortEnv {
  const env = process.env;
  return {
    httpUrl: env.EXPO_PUBLIC_LISCA_HTTP_URL,
    httpHost: env.EXPO_PUBLIC_LISCA_HTTP_HOST,
    httpPort: env.EXPO_PUBLIC_LISCA_HTTP_PORT,
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
    httpHost: env.httpHost,
    httpPort: env.httpPort,
    dev: env.dev,
    createPort: config.createPort,
  });
}

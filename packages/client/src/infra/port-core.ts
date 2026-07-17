import { toFetchErrorMessage } from "./errors";
import { createLiscaUrlResolver } from "./urls";

/** Dependencies handed to every `create*Port` factory. */
export type LiscaPortDeps = {
  baseUrl: () => string;
  isDev: boolean;
};

export type LiscaPort<T> = {
  client: T;
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
  const client = config.createPort({ baseUrl: httpBaseUrl, isDev: config.dev ?? false });

  return {
    client,
    httpBaseUrl,
    toErrorMessage: (cause, fallback) => toFetchErrorMessage(cause, fallback, httpBaseUrl()),
  };
}

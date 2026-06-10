import { resolveLiscaHttpBaseUrl, resolveLiscaWsUrl } from "@lisca/utils";

export function readBrowserSearchParams(): URLSearchParams | null {
  return typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
}

export type LiscaUrlOptions = {
  searchParams?: URLSearchParams | null;
  viteHttpUrl?: string | undefined;
  viteWsUrl?: string | undefined;
  viteWsHost?: string | undefined;
  viteWsPort?: string | number | undefined;
  defaultPort: number;
  wsPath?: string;
};

export type LiscaUrlResolver = {
  httpBaseUrl: () => string;
  wsUrl: () => string;
};

export function createLiscaUrlResolver(options: LiscaUrlOptions): LiscaUrlResolver {
  return {
    httpBaseUrl: () => resolveLiscaHttpBaseUrl(options),
    wsUrl: () => resolveLiscaWsUrl(options),
  };
}

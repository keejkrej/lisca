import { resolveLiscaHttpBaseUrl } from "@lisca/utils";

export function readBrowserSearchParams(): URLSearchParams | null {
  return typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
}

export type LiscaUrlOptions = {
  searchParams?: URLSearchParams | null;
  viteHttpUrl?: string | undefined;
  viteHttpHost?: string | undefined;
  viteHttpPort?: string | number | undefined;
  defaultPort: number;
};

export type LiscaUrlResolver = {
  httpBaseUrl: () => string;
};

export function createLiscaUrlResolver(options: LiscaUrlOptions): LiscaUrlResolver {
  return {
    httpBaseUrl: () => resolveLiscaHttpBaseUrl(options),
  };
}

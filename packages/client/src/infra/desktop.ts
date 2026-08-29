export type LiscaIpcRequest = {
  method: string;
  uri: string;
  headers: Record<string, string>;
  body?: string;
};

export type LiscaIpcResponse = {
  status: number;
  headers: Record<string, string>;
  body?: string;
  bodyBase64?: string;
};

export type LiscaDesktopBridge = {
  product: string;
  request: (request: LiscaIpcRequest) => Promise<LiscaIpcResponse>;
};

declare global {
  interface Window {
    liscaDesktop?: LiscaDesktopBridge;
  }
}

export function liscaDesktopBridge(): LiscaDesktopBridge | null {
  return typeof window === "undefined" ? null : (window.liscaDesktop ?? null);
}

function requestUri(input: string): string {
  const base = typeof window === "undefined" ? "http://localhost" : window.location.href;
  const url = new URL(input, base);
  return `${url.pathname}${url.search}`;
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return buffer;
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 32_768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(new DOMException("The operation was aborted", "AbortError"));
  }
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new DOMException("The operation was aborted", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

export function createDesktopFetch(bridge: LiscaDesktopBridge): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    if (request.signal.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }

    const headers: Record<string, string> = {};
    request.headers.forEach((value, name) => {
      headers[name] = value;
    });
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const response = await withAbort(
      bridge.request({
        method: request.method,
        uri: requestUri(request.url),
        headers,
        body: hasBody ? await request.text() : undefined,
      }),
      request.signal,
    );
    const noBody = response.status === 204 || response.status === 205 || response.status === 304;
    const body = noBody
      ? null
      : response.bodyBase64
        ? decodeBase64(response.bodyBase64)
        : (response.body ?? null);

    return new Response(body, {
      status: response.status,
      headers: response.headers,
    });
  };
}

/** Resolve a backend file URL to an IPC-backed data URL in desktop builds. */
export async function resolveLiscaAssetUrl(url: string): Promise<string> {
  const bridge = liscaDesktopBridge();
  if (!bridge) return url;

  const response = await bridge.request({
    method: "GET",
    uri: requestUri(url),
    headers: {},
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Failed to load desktop asset (${response.status})`);
  }
  const contentType = response.headers["content-type"] ?? "application/octet-stream";
  const bodyBase64 = response.bodyBase64 ?? encodeBase64(response.body ?? "");
  return `data:${contentType};base64,${bodyBase64}`;
}

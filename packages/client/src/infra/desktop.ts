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

export type LiscaSaveFileRequest = {
  fileName: string;
  directory?: string;
  filterName: string;
  extensions: string[];
  contentsBase64: string;
};

export type LiscaPickPathRequest = {
  directory: boolean;
  directoryPath?: string;
  extensions: string[];
};

export type LiscaDesktopBridge = {
  product: string;
  request: (request: LiscaIpcRequest) => Promise<LiscaIpcResponse>;
  /** Native save dialog + write; resolves to the saved path, or null when cancelled. */
  saveFile?: (request: LiscaSaveFileRequest) => Promise<string | null>;
  /** Native open dialog; resolves to the chosen path, or null when cancelled. */
  pickPath?: (request: LiscaPickPathRequest) => Promise<string | null>;
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
  return bytesToBase64(new TextEncoder().encode(value));
}

function bytesToBase64(bytes: Uint8Array): string {
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

/** Load a backend file as bytes, over IPC in desktop builds and HTTP otherwise. */
export async function loadLiscaAssetBytes(url: string): Promise<Uint8Array> {
  const bridge = liscaDesktopBridge();
  if (!bridge) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load asset (${response.status})`);
    return new Uint8Array(await response.arrayBuffer());
  }

  const response = await bridge.request({
    method: "GET",
    uri: requestUri(url),
    headers: {},
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Failed to load desktop asset (${response.status})`);
  }
  return response.bodyBase64
    ? new Uint8Array(decodeBase64(response.bodyBase64))
    : new TextEncoder().encode(response.body ?? "");
}

export type LiscaSaveFileOptions = {
  fileName: string;
  /** Folder the dialog opens in, when it exists (desktop only). */
  directory?: string;
  mimeType: string;
  filterName: string;
  extensions: string[];
  bytes: Uint8Array;
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{
    name: string;
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

/**
 * Let the user choose where to save a file. Desktop builds use the native save dialog; browsers
 * use the File System Access picker when available and fall back to a download.
 * Resolves to the saved path (or file name in browsers), or null when the user cancels.
 */
export async function saveLiscaFile(options: LiscaSaveFileOptions): Promise<string | null> {
  const bridge = liscaDesktopBridge();
  if (bridge?.saveFile) {
    return bridge.saveFile({
      fileName: options.fileName,
      directory: options.directory,
      filterName: options.filterName,
      extensions: options.extensions,
      contentsBase64: bytesToBase64(options.bytes),
    });
  }

  const blob = new Blob([options.bytes as Uint8Array<ArrayBuffer>], { type: options.mimeType });
  const picker = (window as SaveFilePickerWindow).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: options.fileName,
        types: [
          {
            description: options.filterName,
            accept: { [options.mimeType]: options.extensions.map((ext) => `.${ext}`) },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return handle.name;
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return null;
      throw cause;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = options.fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return options.fileName;
}

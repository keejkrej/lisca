import { profileToken, productBaseUrl, requestTimeoutMs, type ProductId } from "./config.ts";

export class ApiError extends Error {
  readonly product: ProductId;
  readonly status: number;
  readonly statusText: string;
  readonly bodyText: string;

  constructor(product: ProductId, status: number, statusText: string, bodyText: string) {
    const body = bodyText.length > 2000 ? `${bodyText.slice(0, 2000)}…` : bodyText;
    super(`${product} server answered HTTP ${status} ${statusText}: ${body || "(no body)"}`);
    this.name = "ApiError";
    this.product = product;
    this.status = status;
    this.statusText = statusText;
    this.bodyText = bodyText;
  }
}

export class UnreachableServerError extends Error {
  readonly product: ProductId;
  readonly baseUrl: string;

  constructor(product: ProductId, baseUrl: string, cause: unknown) {
    super(
      `Cannot reach the ${product} server at ${baseUrl} (${causeMessage(cause)}). ` +
        `Start it with the server_start tool, or point LISCA_MCP_${product.toUpperCase()}_URL at a running instance.`,
    );
    this.name = "UnreachableServerError";
    this.product = product;
    this.baseUrl = baseUrl;
  }
}

export function causeMessage(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }
  return String(cause);
}

export interface ApiCallOptions {
  query?: Record<string, unknown>;
  body?: unknown;
  timeoutMs?: number;
}

/** Call a product server's JSON API and return the parsed response body. */
export async function callProductApi(
  product: ProductId,
  method: string,
  path: string,
  options: ApiCallOptions = {},
): Promise<unknown> {
  const baseUrl = productBaseUrl(product);
  const url = new URL(path, `${baseUrl}/`);
  for (const [name, value] of Object.entries(options.query ?? {})) {
    if (value === undefined || value === null) {
      continue;
    }
    url.searchParams.set(name, String(value));
  }
  const headers: Record<string, string> = { accept: "application/json" };
  const token = profileToken();
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  const init: RequestInit = { method, headers };
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }
  const timeout = options.timeoutMs ?? requestTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch (cause) {
    throw new UnreachableServerError(product, baseUrl, cause);
  } finally {
    clearTimeout(timer);
  }
  const text = await response.text();
  if (!response.ok) {
    throw new ApiError(product, response.status, response.statusText, text);
  }
  if (text.length === 0) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Probe a product server without throwing; returns latency when reachable. */
export async function probeProduct(
  product: ProductId,
  timeoutMs = 800,
): Promise<{ running: boolean; latencyMs?: number; error?: string }> {
  const startedAt = Date.now();
  try {
    await callProductApi(product, "GET", "/fs/home", { timeoutMs });
    return { running: true, latencyMs: Date.now() - startedAt };
  } catch (cause) {
    if (cause instanceof ApiError) {
      // Any HTTP answer means a server is listening (even 404/500 on /fs/home).
      return { running: true, latencyMs: Date.now() - startedAt };
    }
    return { running: false, error: causeMessage(cause) };
  }
}

import path from "node:path";

/** The Lisca product line this MCP server can drive. */
export type ProductId = "aligner" | "annotator" | "studio";

export const PRODUCTS: readonly ProductId[] = ["aligner", "annotator", "studio"] as const;

export const PRODUCT_TITLES: Record<ProductId, string> = {
  aligner: "Aligner",
  annotator: "Annotator",
  studio: "Studio",
};

/**
 * JSON API ports of the standalone server binaries (ADR-0002). The public web
 * dev ports are these plus 1000 (18765/18766/18767 via `scripts/serve.ts`).
 */
export const DEFAULT_PORTS: Record<ProductId, number> = {
  aligner: 19765,
  annotator: 19766,
  studio: 19767,
};

/** Repo root this server operates on. Defaults to the monorepo it lives in. */
export function repoRoot(): string {
  const override = process.env.LISCA_REPO_ROOT;
  if (override) {
    return path.resolve(override);
  }
  return path.resolve(import.meta.dirname, "..", "..", "..");
}

export function productPort(product: ProductId): number {
  const raw = process.env[`LISCA_MCP_${product.toUpperCase()}_PORT`];
  const parsed = raw === undefined ? NaN : Number(raw);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : DEFAULT_PORTS[product];
}

export function mcpHost(): string {
  return process.env.LISCA_MCP_HOST ?? "127.0.0.1";
}

/** Base URL of a product's JSON API server. */
export function productBaseUrl(product: ProductId): string {
  const override = process.env[`LISCA_MCP_${product.toUpperCase()}_URL`];
  if (override) {
    return override.replace(/\/+$/, "");
  }
  return `http://${mcpHost()}:${productPort(product)}`;
}

/** Path to the canonical OpenAPI document that describes every JSON route. */
export function openApiPath(): string {
  return (
    process.env.LISCA_MCP_OPENAPI ?? path.join(repoRoot(), "packages", "contracts", "openapi.json")
  );
}

/**
 * Bearer access token for guarded routes (profile sign-out, wizard memory).
 * Get one with `profile_create_profile` / `profile_sign_in_profile`, or set
 * `LISCA_MCP_PROFILE_TOKEN` so every call is authorized automatically.
 */
export function profileToken(): string | undefined {
  return process.env.LISCA_MCP_PROFILE_TOKEN || undefined;
}

/** Port the MCP server itself listens on in remote (Streamable HTTP) mode.
 * Unset means stdio mode, the default for locally spawned agents. */
export function httpPort(): number | undefined {
  const parsed = Number(process.env.LISCA_MCP_HTTP_PORT);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/** Interface the remote MCP endpoint binds to. Loopback by default; containers
 * set 0.0.0.0 (or their container IP) to expose the endpoint. */
export function httpHost(): string {
  return process.env.LISCA_MCP_HTTP_HOST ?? "127.0.0.1";
}

/** URL path the remote MCP endpoint serves. */
export function httpPath(): string {
  return process.env.LISCA_MCP_HTTP_PATH ?? "/mcp";
}

/**
 * Bearer token guarding the remote MCP endpoint itself (not the product API).
 * Set `LISCA_MCP_HTTP_TOKEN` whenever the endpoint is reachable off-loopback.
 */
export function httpToken(): string | undefined {
  return process.env.LISCA_MCP_HTTP_TOKEN || undefined;
}

/**
 * True when the product base URL points at this machine, so spawning and
 * stopping product binaries here actually manages that endpoint. Remote
 * deployments (containers, LAN hosts) are managed with deployment tooling.
 */
export function isLoopbackTarget(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    const host = hostname.replace(/^\[|\]$/g, "");
    return (
      host === "localhost" ||
      host === "::1" ||
      host === "0:0:0:0:0:0:0:1" ||
      /^127(\.\d{1,3}){0,3}$/.test(host)
    );
  } catch {
    return false;
  }
}

/** Default timeout for one JSON API call. Smart tools load ONNX models, so keep it generous. */
export function requestTimeoutMs(): number {
  const parsed = Number(process.env.LISCA_MCP_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 120_000;
}

/** Where server_start/server_stop keep pidfiles and server logs. */
export function mcpStateDir(): string {
  return path.join(repoRoot(), "target", "mcp");
}

/** Path to a cargo target binary (release or debug), without existence checks. */
export function targetBinary(name: string, release: boolean): string {
  return path.join(repoRoot(), "target", release ? "release" : "debug", name);
}

export function isProductId(value: unknown): value is ProductId {
  return typeof value === "string" && (PRODUCTS as readonly string[]).includes(value);
}

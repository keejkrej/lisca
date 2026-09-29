import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Axum routes that return raw bytes and are absent from the JSON HttpApi.
 * Web loads them as same-origin URLs; desktop loads them through `lisca_request`.
 * See ADR-0002.
 */
export const RAW_BYTE_ROUTES = new Set(["/fs/file"]);

export interface RouteMismatch {
  /** In openapi.json but missing from Rust routes. */
  missingInRust: string[];
  /** In Rust routes but missing from openapi.json (raw byte routes exempt). */
  missingInOpenApi: string[];
  /** Raw byte routes no longer served by Rust. */
  missingRawRoutes: string[];
  /** Raw byte routes that leaked back into the JSON HttpApi. */
  rawRoutesInOpenApi: string[];
}

export function findRouteMismatch(
  openapiPaths: ReadonlySet<string>,
  rustPaths: ReadonlySet<string>,
): RouteMismatch {
  return {
    missingInRust: [...openapiPaths].filter((path) => !rustPaths.has(path)).toSorted(),
    missingInOpenApi: [...rustPaths]
      .filter((path) => !openapiPaths.has(path) && !RAW_BYTE_ROUTES.has(path))
      .toSorted(),
    missingRawRoutes: [...RAW_BYTE_ROUTES].filter((path) => !rustPaths.has(path)).toSorted(),
    rawRoutesInOpenApi: [...RAW_BYTE_ROUTES].filter((path) => openapiPaths.has(path)).toSorted(),
  };
}

export function hasRouteMismatch(mismatch: RouteMismatch): boolean {
  return (
    mismatch.missingInRust.length > 0 ||
    mismatch.missingInOpenApi.length > 0 ||
    mismatch.missingRawRoutes.length > 0 ||
    mismatch.rawRoutesInOpenApi.length > 0
  );
}

function findRouteFiles(root: string): string[] {
  const files: string[] = [];
  const appsDir = join(root, "apps");
  for (const app of readdirSync(appsDir)) {
    const routesPath = join(appsDir, app, "server", "src", "routes.rs");
    if (statSync(routesPath, { throwIfNoEntry: false })?.isFile()) {
      files.push(routesPath);
    }
  }
  for (const fileName of ["fs.rs", "profile.rs"]) {
    const sharedRoutesPath = join(root, "crates/lisca/src/http", fileName);
    if (statSync(sharedRoutesPath, { throwIfNoEntry: false })?.isFile()) {
      files.push(sharedRoutesPath);
    }
  }
  const serverCommonRoutesPath = join(root, "crates/lisca-server/src/tasks.rs");
  if (statSync(serverCommonRoutesPath, { throwIfNoEntry: false })?.isFile()) {
    files.push(serverCommonRoutesPath);
  }
  return files.toSorted();
}

const routePattern = /\.route\s*\(\s*"([^"]+)"/g;

function extractRustPaths(filePath: string): string[] {
  const source = readFileSync(filePath, "utf8");
  const paths: string[] = [];
  for (const match of source.matchAll(routePattern)) {
    paths.push(match[1]!);
  }
  return paths;
}

function reportRouteMismatch(
  mismatch: RouteMismatch,
  routeFileCount: number,
  openApiPathCount: number,
): void {
  console.error("OpenAPI path mismatch with Rust Axum routes.\n");
  if (mismatch.missingInRust.length > 0) {
    console.error("In openapi.json but missing from Rust routes:");
    for (const path of mismatch.missingInRust) {
      console.error(`  - ${path}`);
    }
    console.error("");
  }
  if (mismatch.missingInOpenApi.length > 0) {
    console.error("In Rust routes but missing from openapi.json:");
    for (const path of mismatch.missingInOpenApi) {
      console.error(`  - ${path}`);
    }
    console.error("");
  }
  if (mismatch.missingRawRoutes.length > 0) {
    console.error("Raw byte routes missing from Rust routes:");
    for (const path of mismatch.missingRawRoutes) {
      console.error(`  - ${path}`);
    }
    console.error("");
  }
  if (mismatch.rawRoutesInOpenApi.length > 0) {
    console.error("Raw byte routes must stay out of the JSON HttpApi (ADR-0002):");
    for (const path of mismatch.rawRoutesInOpenApi) {
      console.error(`  - ${path}`);
    }
    console.error("");
  }
  console.error(`Checked ${routeFileCount} route files against ${openApiPathCount} OpenAPI paths.`);
}

function main(): void {
  const repoRoot = resolve(import.meta.dirname, "..");

  const openapiPath = resolve(repoRoot, "packages/contracts/openapi.json");
  const openapi = JSON.parse(readFileSync(openapiPath, "utf8")) as {
    paths: Record<string, unknown>;
  };

  const openapiPaths = new Set(Object.keys(openapi.paths).toSorted());

  const routeFiles = findRouteFiles(repoRoot);

  const rustPaths = new Set<string>();
  for (const filePath of routeFiles) {
    for (const path of extractRustPaths(filePath)) {
      rustPaths.add(path);
    }
  }

  const mismatch = findRouteMismatch(openapiPaths, rustPaths);
  if (hasRouteMismatch(mismatch)) {
    reportRouteMismatch(mismatch, routeFiles.length, openapiPaths.size);
    process.exit(1);
  }

  console.log(
    `OpenAPI routes match Rust Axum routes (${openapiPaths.size} paths, ${routeFiles.length} files).`,
  );

  // Web builds call the server on their own origin (ADR-0003): every API prefix must be forwarded by
  // the Vite dev proxy and by the Docker nginx config, or that part of the app breaks in one of them.
  const apiPrefixes = new Set([...openapiPaths].map((path) => `/${path.split("/")[1]}`));
  const { LISCA_API_PROXY_PREFIXES } = createRequire(import.meta.url)("./lisca-dev-ports.cjs") as {
    LISCA_API_PROXY_PREFIXES: string[];
  };
  const nginxConf = readFileSync(resolve(repoRoot, "docker/nginx.conf.template"), "utf8");
  const nginxPrefixes = new Set(
    [...nginxConf.matchAll(/location (\/[a-z-]+)\/ \{/g)].map((match) => match[1]!),
  );
  const unproxied = [...apiPrefixes].flatMap((prefix) => [
    ...(LISCA_API_PROXY_PREFIXES.includes(prefix) ? [] : [`${prefix} (Vite dev proxy)`]),
    ...(nginxPrefixes.has(prefix) ? [] : [`${prefix} (docker/nginx.conf.template)`]),
  ]);
  if (unproxied.length > 0) {
    console.error("API prefixes not forwarded to the server:");
    for (const entry of unproxied) console.error(`  - ${entry}`);
    process.exit(1);
  }
  console.log(`API prefixes proxied in dev and Docker (${apiPrefixes.size} prefixes).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

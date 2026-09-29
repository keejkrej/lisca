import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const here = import.meta.dirname;
const repoRoot = resolve(here, "..");

const openapiPath = resolve(repoRoot, "packages/contracts/openapi.json");
const openapi = JSON.parse(readFileSync(openapiPath, "utf8")) as {
  paths: Record<string, unknown>;
};

const openapiPaths = new Set(Object.keys(openapi.paths).toSorted());

/**
 * Axum routes that return raw bytes and are absent from the JSON HttpApi.
 * Web loads them as same-origin URLs; desktop loads them through `lisca_request`.
 * See ADR-0002.
 */
const RAW_BYTE_ROUTES = new Set(["/fs/file"]);

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

const routeFiles = findRouteFiles(repoRoot);

const routePattern = /\.route\s*\(\s*"([^"]+)"/g;

function extractRustPaths(filePath: string): string[] {
  const source = readFileSync(filePath, "utf8");
  const paths: string[] = [];
  for (const match of source.matchAll(routePattern)) {
    paths.push(match[1]!);
  }
  return paths;
}

const rustPaths = new Set<string>();
for (const filePath of routeFiles) {
  for (const path of extractRustPaths(filePath)) {
    rustPaths.add(path);
  }
}

const missingInRust = [...openapiPaths].filter((path) => !rustPaths.has(path));
const missingInOpenApi = [...rustPaths].filter(
  (path) => !openapiPaths.has(path) && !RAW_BYTE_ROUTES.has(path),
);
const missingRawRoutes = [...RAW_BYTE_ROUTES].filter((path) => !rustPaths.has(path));
const rawRoutesInOpenApi = [...RAW_BYTE_ROUTES].filter((path) => openapiPaths.has(path));

if (
  missingInRust.length > 0 ||
  missingInOpenApi.length > 0 ||
  missingRawRoutes.length > 0 ||
  rawRoutesInOpenApi.length > 0
) {
  console.error("OpenAPI path mismatch with Rust Axum routes.\n");
  if (missingInRust.length > 0) {
    console.error("In openapi.json but missing from Rust routes:");
    for (const path of missingInRust) {
      console.error(`  - ${path}`);
    }
    console.error("");
  }
  if (missingInOpenApi.length > 0) {
    console.error("In Rust routes but missing from openapi.json:");
    for (const path of missingInOpenApi) {
      console.error(`  - ${path}`);
    }
    console.error("");
  }
  if (missingRawRoutes.length > 0) {
    console.error("Raw byte routes missing from Rust routes:");
    for (const path of missingRawRoutes) {
      console.error(`  - ${path}`);
    }
    console.error("");
  }
  if (rawRoutesInOpenApi.length > 0) {
    console.error("Raw byte routes must stay out of the JSON HttpApi (ADR-0002):");
    for (const path of rawRoutesInOpenApi) {
      console.error(`  - ${path}`);
    }
    console.error("");
  }
  console.error(
    `Checked ${routeFiles.length} route files against ${openapiPaths.size} OpenAPI paths.`,
  );
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

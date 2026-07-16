import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const here = import.meta.dirname;
const repoRoot = resolve(here, "..");

const openapiPath = resolve(repoRoot, "packages/contracts/openapi.json");
const openapi = JSON.parse(readFileSync(openapiPath, "utf8")) as {
  paths: Record<string, unknown>;
};

const openapiPaths = new Set(Object.keys(openapi.paths).toSorted());

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
const missingInOpenApi = [...rustPaths].filter((path) => !openapiPaths.has(path));

if (missingInRust.length > 0 || missingInOpenApi.length > 0) {
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
  console.error(
    `Checked ${routeFiles.length} route files against ${openapiPaths.size} OpenAPI paths.`,
  );
  process.exit(1);
}

console.log(
  `OpenAPI routes match Rust Axum routes (${openapiPaths.size} paths, ${routeFiles.length} files).`,
);

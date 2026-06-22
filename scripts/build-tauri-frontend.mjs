#!/usr/bin/env bun
/**
 * Build a product's web frontend for a Tauri desktop bundle.
 *
 * Usage:
 *   bun scripts/build-tauri-frontend.mjs <product>
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PRODUCTS = new Set(["aligner", "annotator", "studio"]);

function usage() {
  console.error(`
Usage: bun scripts/build-tauri-frontend.mjs <product>

  product  aligner | annotator | studio
`);
}

function main() {
  const product = process.argv[2];
  if (!product || !PRODUCTS.has(product)) {
    usage();
    process.exit(product ? 1 : 0);
  }

  const webPkg = `@lisca/${product}-web`;
  const result = spawnSync("bun", ["--filter", webPkg, "build"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, VITE_DESKTOP: "1" },
  });

  process.exit(result.status ?? 1);
}

main();

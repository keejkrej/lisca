#!/usr/bin/env bun
/**
 * Stage web + Rust server artifacts and run Tauri build for a Lisca desktop app.
 *
 * Usage:
 *   bun scripts/package-tauri.mjs aligner
 *   bun lisca dist aligner
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { DESKTOP_PRODUCTS } = require("./lisca-desktop-products.cjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  console.error(`
Usage: bun scripts/package-tauri.mjs <product>

  product  aligner | annotator | studio

Example:
  bun scripts/package-tauri.mjs aligner
`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function stageArtifacts(product, cfg) {
  const desktopDir = path.join(root, "apps", product, "desktop");
  const resourcesDir = path.join(desktopDir, "src-tauri", "resources");
  const exeName = process.platform === "win32" ? `${cfg.serverBinary}.exe` : cfg.serverBinary;
  const serverSrc = path.join(root, "target", "release", exeName);
  const serverDest = path.join(resourcesDir, "server", exeName);

  fs.rmSync(resourcesDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(resourcesDir, "server"), { recursive: true });

  if (!fs.existsSync(serverSrc)) {
    console.error(`Missing server binary at ${serverSrc}. Run the server build first.`);
    process.exit(1);
  }

  fs.copyFileSync(serverSrc, serverDest);
  if (process.platform !== "win32") {
    fs.chmodSync(serverDest, 0o755);
  }

  const brandSrc = path.join(root, "assets", "brand");
  if (!fs.existsSync(brandSrc)) {
    console.error(`Missing brand assets at ${brandSrc}`);
    process.exit(1);
  }
  fs.cpSync(brandSrc, path.join(resourcesDir, "brand"), { recursive: true });

  return desktopDir;
}

function main() {
  const product = process.argv[2];
  if (!product || product === "-h" || product === "--help") {
    usage();
    process.exit(product ? 0 : 1);
  }

  const cfg = DESKTOP_PRODUCTS[product];
  if (!cfg) {
    console.error(`Unknown product "${product}". Use: aligner | annotator | studio`);
    process.exit(1);
  }

  console.log(`Building ${cfg.productName} for ${process.platform}...`);

  run("bun", [path.join(root, "scripts/build-tauri-frontend.mjs"), product], {
    cwd: root,
  });

  run("bun", ["--filter", cfg.serverPkg, "build"], { cwd: root });

  const desktopDir = stageArtifacts(product, cfg);

  run("bunx", ["tauri", "build"], {
    cwd: desktopDir,
    env: process.env,
  });

  const bundleSrc = path.join(root, "target", "release", "bundle");
  const bundleDest = path.join(desktopDir, "release");
  fs.rmSync(bundleDest, { recursive: true, force: true });
  if (fs.existsSync(bundleSrc)) {
    fs.cpSync(bundleSrc, bundleDest, { recursive: true });
  }

  console.log(`\nInstallers written to ${bundleDest}`);
}

main();

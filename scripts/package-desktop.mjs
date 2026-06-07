#!/usr/bin/env bun
/**
 * Stage web + Rust server artifacts and run electron-builder for a Lisca desktop app.
 *
 * Usage:
 *   bun scripts/package-desktop.mjs aligner
 *   bun lisca dist aligner
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { DESKTOP_PRODUCTS } = require("./electron/products.cjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  console.error(`
Usage: bun scripts/package-desktop.mjs <product>

  product  aligner | annotator | studio

Example:
  bun scripts/package-desktop.mjs aligner
`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function stageArtifacts(product, cfg) {
  const desktopDir = path.join(root, "apps", product, "desktop");
  const stagingDir = path.join(desktopDir, "staging");
  const webDist = path.join(root, "apps", product, "web", "dist");
  const exeName = process.platform === "win32" ? `${cfg.serverBinary}.exe` : cfg.serverBinary;
  const serverSrc = path.join(root, "target", "release", exeName);
  const serverDest = path.join(stagingDir, "server", exeName);

  fs.rmSync(stagingDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(stagingDir, "server"), { recursive: true });

  if (!fs.existsSync(webDist)) {
    console.error(`Missing web build at ${webDist}`);
    process.exit(1);
  }
  if (!fs.existsSync(serverSrc)) {
    console.error(`Missing server binary at ${serverSrc}. Run the server build first.`);
    process.exit(1);
  }

  fs.cpSync(webDist, path.join(stagingDir, "web"), { recursive: true });
  fs.copyFileSync(serverSrc, serverDest);
  if (process.platform !== "win32") {
    fs.chmodSync(serverDest, 0o755);
  }

  const brandSrc = path.join(root, "assets", "brand");
  if (!fs.existsSync(brandSrc)) {
    console.error(`Missing brand assets at ${brandSrc}`);
    process.exit(1);
  }
  fs.cpSync(brandSrc, path.join(stagingDir, "brand"), { recursive: true });

  stageSharedElectron(desktopDir);

  return desktopDir;
}

function stageSharedElectron(desktopDir) {
  const electronDir = path.join(desktopDir, "electron");
  const sharedDir = path.join(root, "scripts", "electron");
  for (const file of ["desktop-main.cjs", "brand.cjs"]) {
    fs.copyFileSync(path.join(sharedDir, file), path.join(electronDir, file));
  }
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

  run("bun", ["--filter", cfg.webPkg, "build"], {
    cwd: root,
    env: { ...process.env, VITE_DESKTOP: "1" },
  });

  run("bun", ["--filter", cfg.serverPkg, "build"], { cwd: root });

  const desktopDir = stageArtifacts(product, cfg);

  run("bunx", ["electron-builder", "--config", "electron-builder.config.cjs"], {
    cwd: desktopDir,
    env: process.env,
  });

  console.log(`\nInstallers written to ${path.join(desktopDir, "release")}`);
}

main();

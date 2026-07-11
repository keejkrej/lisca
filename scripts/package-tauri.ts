#!/usr/bin/env bun
/**
 * Stage web + Rust server artifacts and run Tauri build for a Lisca desktop app.
 *
 * Usage:
 *   bun scripts/package-tauri.ts aligner
 *   vp run dist:aligner
 */
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { DESKTOP_PRODUCTS, type DesktopProductConfig } from "./lisca-desktop-products";
import { type LiscaProduct } from "./lisca-dev-ports";

const root = resolve(import.meta.dirname, "..");

function usage(): void {
  console.error(`
Usage: bun scripts/package-tauri.ts <product>

  product  aligner | annotator | studio

Example:
  bun scripts/package-tauri.ts aligner
`);
}

function run(command: string, args: string[], options: { cwd?: string; env?: Record<string, string> } = {}): void {
  const result = Bun.spawnSync({
    cmd: [command, ...args],
    stdio: ["inherit", "inherit", "inherit"],
    cwd: options.cwd,
    env: options.env,
  });
  if (result.exitCode !== 0) {
    process.exit(result.exitCode ?? 1);
  }
}

function stageArtifacts(product: LiscaProduct, cfg: DesktopProductConfig): string {
  const desktopDir = join(root, "apps", product, "desktop");
  const resourcesDir = join(desktopDir, "src-tauri", "resources");
  const exeName = process.platform === "win32" ? `${cfg.serverBinary}.exe` : cfg.serverBinary;
  const serverSrc = join(root, "target", "release", exeName);
  const serverDest = join(resourcesDir, "server", exeName);

  rmSync(resourcesDir, { recursive: true, force: true });
  mkdirSync(join(resourcesDir, "server"), { recursive: true });

  if (!existsSync(serverSrc)) {
    console.error(`Missing server binary at ${serverSrc}. Run the server build first.`);
    process.exit(1);
  }

  copyFileSync(serverSrc, serverDest);
  if (process.platform !== "win32") {
    chmodSync(serverDest, 0o755);
  }

  const brandSrc = join(root, "assets", "brand");
  if (!existsSync(brandSrc)) {
    console.error(`Missing brand assets at ${brandSrc}`);
    process.exit(1);
  }
  cpSync(brandSrc, join(resourcesDir, "brand"), { recursive: true });

  return desktopDir;
}

const product = process.argv[2] as LiscaProduct | undefined;
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

run("bun", [join(root, "scripts/build-tauri-frontend.ts"), product], {
  cwd: root,
});

run("bun", ["--filter", cfg.serverPkg, "build"], { cwd: root });

const desktopDir = stageArtifacts(product, cfg);

run("bunx", ["tauri", "build"], {
  cwd: desktopDir,
  env: process.env as Record<string, string>,
});

const bundleSrc = join(root, "target", "release", "bundle");
const bundleDest = join(desktopDir, "release");
rmSync(bundleDest, { recursive: true, force: true });
if (existsSync(bundleSrc)) {
  cpSync(bundleSrc, bundleDest, { recursive: true });
}

console.log(`\nInstallers written to ${bundleDest}`);

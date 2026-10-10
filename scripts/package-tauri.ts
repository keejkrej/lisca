#!/usr/bin/env node
/**
 * Build the web frontend and the Tauri app with its embedded Rust backend.
 *
 * Usage:
 *   pnpm run dist:studio
 *   node --experimental-strip-types scripts/package-tauri.ts [product]
 *
 * Omitting `product` packages Studio, which bundles the Aligner and Annotator
 * flows and is the default development check.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { DESKTOP_PRODUCTS } from "./lisca-desktop-products.cjs";
import { runVpSync } from "./node-run.ts";
import { tauriUpdaterBuildConfig } from "./updater-manifest.ts";

type LiscaProduct = "aligner" | "annotator" | "studio";
type DesktopProductConfig = (typeof DESKTOP_PRODUCTS)[LiscaProduct];

const root = resolve(import.meta.dirname, "..");

function usage(): void {
  console.error(`
Usage: node --experimental-strip-types scripts/package-tauri.ts [product]

  product  aligner | annotator | studio (default: studio)

Example:
  pnpm run dist:aligner
`);
}

function stageArtifacts(product: LiscaProduct, cfg: DesktopProductConfig): string {
  const desktopDir = join(root, "apps", product, "desktop");
  const resourcesDir = join(desktopDir, "src-tauri", "resources");

  rmSync(resourcesDir, { recursive: true, force: true });
  mkdirSync(resourcesDir, { recursive: true });

  const brandSrc = join(root, "assets", "brand");
  if (!existsSync(brandSrc)) {
    console.error(`Missing brand assets at ${brandSrc}`);
    process.exit(1);
  }
  cpSync(brandSrc, join(resourcesDir, "brand"), { recursive: true });

  // ONNX weights stay off the installer. Smart tools are deferred to a hosted
  // service, and killing predict resolves a local cache or LISCA_KILL_MODEL.
  return desktopDir;
}

const arg = process.argv[2];
if (arg === "-h" || arg === "--help") {
  usage();
  process.exit(0);
}
const product = (arg ?? "studio") as LiscaProduct;

const cfg = DESKTOP_PRODUCTS[product];
if (!cfg) {
  console.error(`Unknown product "${product}". Use: aligner | annotator | studio`);
  process.exit(1);
}

console.log(`Building ${cfg.productName} for ${process.platform}...`);

runVpSync(["run", "--filter", cfg.webPkg, "build"], {
  cwd: root,
  env: { ...process.env, VITE_DESKTOP: "1" },
});

const desktopDir = stageArtifacts(product, cfg);

const releaseUpdater = process.env.LISCA_UPDATER_ARTIFACTS === "1";
runVpSync(
  ["exec", "tauri", "build", "--config", JSON.stringify(tauriUpdaterBuildConfig(releaseUpdater))],
  {
    cwd: desktopDir,
    env: process.env,
  },
);

const bundleSrc = join(root, "target", "release", "bundle");
const bundleDest = join(desktopDir, "release");
rmSync(bundleDest, { recursive: true, force: true });
if (existsSync(bundleSrc)) {
  cpSync(bundleSrc, bundleDest, { recursive: true });
}

console.log(`\nInstallers written to ${bundleDest}`);

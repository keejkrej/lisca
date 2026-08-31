#!/usr/bin/env node
/**
 * Build the web frontend and the Tauri app with its embedded Rust backend.
 *
 * Usage:
 *   vp run dist:aligner
 *   vp exec node --experimental-strip-types scripts/package-tauri.ts aligner
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { DESKTOP_PRODUCTS } from "./lisca-desktop-products.cjs";
import { runVpSync } from "./node-run.ts";

type LiscaProduct = "aligner" | "annotator" | "studio";
type DesktopProductConfig = (typeof DESKTOP_PRODUCTS)[LiscaProduct];

const root = resolve(import.meta.dirname, "..");

function usage(): void {
  console.error(`
Usage: vp exec node --experimental-strip-types scripts/package-tauri.ts <product>

  product  aligner | annotator | studio

Example:
  vp run dist:aligner
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

  if (product === "studio") {
    // Killing-assay ONNX (HF keejkrej/killing-assay-resnet18). Ownership is
    // the killing sidecar; this repo only stages the curl-at-package-time cache.
    const modelSrc = join(root, "models", "killing-assay-resnet18");
    const modelFile = join(modelSrc, "model.onnx");
    if (!existsSync(modelFile)) {
      console.error(
        `Missing Studio killing model at ${modelFile}. Download it before packaging (see models/killing-assay-resnet18/README.md).`,
      );
      process.exit(1);
    }
    cpSync(modelSrc, join(resourcesDir, "models", "killing-assay-resnet18"), {
      recursive: true,
    });
  }

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

runVpSync(["run", "--filter", cfg.webPkg, "build"], {
  cwd: root,
  env: { ...process.env, VITE_DESKTOP: "1" },
});

const desktopDir = stageArtifacts(product, cfg);

runVpSync(["exec", "tauri", "build"], {
  cwd: desktopDir,
  env: process.env,
});

const bundleSrc = join(root, "target", "release", "bundle");
const bundleDest = join(desktopDir, "release");
rmSync(bundleDest, { recursive: true, force: true });
if (existsSync(bundleSrc)) {
  cpSync(bundleSrc, bundleDest, { recursive: true });
}

console.log(`\nInstallers written to ${bundleDest}`);

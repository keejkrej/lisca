#!/usr/bin/env node
/**
 * Stage web + Rust server artifacts and run Tauri build for a Lisca desktop app.
 *
 * Usage:
 *   vp run dist:aligner
 *   vp exec node --experimental-strip-types scripts/package-tauri.ts aligner
 */
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { DESKTOP_PRODUCTS } from "./lisca-desktop-products.cjs";
import { runSync } from "./node-run.ts";

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

  if (product === "studio") {
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

runSync("vp", ["run", "--filter", cfg.webPkg, "build"], {
  cwd: root,
  env: { ...process.env, VITE_DESKTOP: "1" },
});

runSync("vp", ["run", "--filter", cfg.serverPkg, "build"], { cwd: root });

const desktopDir = stageArtifacts(product, cfg);

runSync("vp", ["exec", "tauri", "build"], {
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

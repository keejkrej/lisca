#!/usr/bin/env bun
/**
 * Build a product's web frontend for a Tauri desktop bundle.
 *
 * Usage:
 *   vp exec bun scripts/build-tauri-frontend.ts <product>
 */
import { resolve } from "node:path";

type LiscaProduct = "aligner" | "annotator" | "studio";

const root = resolve(import.meta.dirname, "..");

const PRODUCTS = new Set<LiscaProduct>(["aligner", "annotator", "studio"]);

function usage(): void {
  console.error(`
Usage: vp exec bun scripts/build-tauri-frontend.ts <product>

  product  aligner | annotator | studio
`);
}

const product = process.argv[2] as LiscaProduct | undefined;
if (!product || !PRODUCTS.has(product)) {
  usage();
  process.exit(product ? 1 : 0);
}

const webPkg = `@lisca/${product}-web`;
const result = Bun.spawnSync({
  cmd: ["vp", "run", "--filter", webPkg, "build"],
  cwd: root,
  stdio: ["inherit", "inherit", "inherit"],
  env: { ...process.env, VITE_DESKTOP: "1" },
});

process.exit(result.exitCode ?? 1);

#!/usr/bin/env node
/**
 * Build a product's web frontend for a Tauri desktop bundle.
 *
 * Usage:
 *   vp exec node --experimental-strip-types scripts/build-tauri-frontend.ts <product>
 */
import { resolve } from "node:path";
import { runSync } from "./node-run.ts";

type LiscaProduct = "aligner" | "annotator" | "studio";

const root = resolve(import.meta.dirname, "..");

const PRODUCTS = new Set<LiscaProduct>(["aligner", "annotator", "studio"]);

function usage(): void {
  console.error(`
Usage: vp exec node --experimental-strip-types scripts/build-tauri-frontend.ts <product>

  product  aligner | annotator | studio
`);
}

const product = process.argv[2] as LiscaProduct | undefined;
if (!product || !PRODUCTS.has(product)) {
  usage();
  process.exit(product ? 1 : 0);
}

const webPkg = `@lisca/${product}-web`;
runSync("vp", ["run", "--filter", webPkg, "build"], {
  cwd: root,
  env: { ...process.env, VITE_DESKTOP: "1" },
});

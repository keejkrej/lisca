#!/usr/bin/env node
/**
 * Create the ignored Tauri resource staging directory before `cargo check`.
 *
 * Tauri validates `bundle.resources` while compiling each desktop crate, even
 * though the server and brand resources are only staged by `package-tauri.ts`
 * for a release build. Keeping the directory ignored avoids committing empty
 * packaging state; the trade-off is that desktop typecheck creates one empty,
 * ignored directory before Cargo runs. Release packaging still replaces the
 * directory with the real resources.
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { DESKTOP_PRODUCTS } from "./lisca-desktop-products.cjs";

type LiscaProduct = keyof typeof DESKTOP_PRODUCTS;

const product = process.argv[2] as LiscaProduct | undefined;
if (!product || !Object.hasOwn(DESKTOP_PRODUCTS, product)) {
  console.error(
    "Usage: vp exec node --experimental-strip-types scripts/prepare-tauri-resources.ts <aligner|annotator|studio>",
  );
  process.exit(1);
}

const root = resolve(import.meta.dirname, "..");
mkdirSync(resolve(root, "apps", product, "desktop", "src-tauri", "resources"), {
  recursive: true,
});

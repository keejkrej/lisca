#!/usr/bin/env bun
/**
 * Copies built demo apps into the landing site dist so one static deploy serves:
 *   /                 → marketing page
 *   /aligner-demo/    → aligner browser demo
 *   /annotator-demo/  → annotator browser demo
 */
import { cpSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const landingDist = resolve(root, "apps/landing/web/dist");

const demos = [
  { folder: "aligner-demo", src: resolve(root, "apps/aligner/demo/dist") },
  { folder: "annotator-demo", src: resolve(root, "apps/annotator/demo/dist") },
];

if (!existsSync(landingDist)) {
  console.error(`Landing dist not found: ${landingDist}. Run landing build first.`);
  process.exit(1);
}

for (const demo of demos) {
  if (!existsSync(demo.src)) {
    console.error(`Demo dist not found: ${demo.src}. Build demos before assembling the site.`);
    process.exit(1);
  }
  const dest = resolve(landingDist, demo.folder);
  cpSync(demo.src, dest, { recursive: true });
  console.log(`Copied ${demo.folder} → ${dest}`);
}

console.log("Landing site assembly complete.");

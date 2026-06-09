#!/usr/bin/env bun
/**
 * Builds the marketing page plus both browser demos and assembles a single static dist.
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function runBuild(packageDir) {
  const result = spawnSync("bun", ["--bun", "run", "build"], {
    cwd: packageDir,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runBuild(resolve(root, "apps/aligner/demo"));
runBuild(resolve(root, "apps/annotator/demo"));
runBuild(resolve(root, "apps/landing/web"));

const assemble = spawnSync("bun", [resolve(root, "scripts/assemble-landing-site.mjs")], {
  stdio: "inherit",
});
process.exit(assemble.status ?? 1);

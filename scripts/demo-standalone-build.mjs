#!/usr/bin/env node
/**
 * Demo packages are consumed from source by landing and other apps. Their
 * standalone Vite sites only need building when LISCA_BUILD_DEMO_SITE=1.
 */
import { spawnSync } from "node:child_process";

if (process.env.LISCA_BUILD_DEMO_SITE !== "1") {
  console.log("[demo] skipping standalone site build (library consumed from source)");
  process.exit(0);
}

const result = spawnSync("bun", ["run", "build:site"], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);

#!/usr/bin/env bun
/**
 * Demo packages are consumed from source by landing and other apps. Their
 * standalone Vite sites only need building when LISCA_BUILD_DEMO_SITE=1.
 */
if (process.env.LISCA_BUILD_DEMO_SITE !== "1") {
  console.log("[demo] skipping standalone site build (library consumed from source)");
  process.exit(0);
}

const result = Bun.spawnSync({
  cmd: ["vp", "run", "build:site"],
  cwd: process.cwd(),
  stdio: ["inherit", "inherit", "inherit"],
});
process.exit(result.exitCode ?? 1);

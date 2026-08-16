#!/usr/bin/env node
/**
 * Demo packages are consumed from source by landing and other apps. Their
 * standalone Vite sites only need building when LISCA_BUILD_DEMO_SITE=1.
 */
import { runVpSync } from "./node-run.ts";

if (process.env.LISCA_BUILD_DEMO_SITE !== "1") {
  console.log("[demo] skipping standalone site build (library consumed from source)");
  process.exit(0);
}

runVpSync(["run", "build:site"], { cwd: process.cwd() });

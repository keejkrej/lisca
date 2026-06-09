#!/usr/bin/env bun
/**
 * Builds the marketing site as a single static bundle (landing + embedded demos).
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const result = spawnSync("bun", ["x", "turbo", "run", "build", "--filter=@lisca/landing-web"], {
  cwd: root,
  stdio: "inherit",
});

process.exit(result.status ?? 1);

#!/usr/bin/env node
/**
 * Run a desktop shell (zig build dev) alongside the matching *-server dev task.
 * The shell skips spawning its own server process; cargo watch owns the backend.
 *
 * Usage (from apps/*-desktop):
 *   node ../../scripts/desktop-dev.mjs @lisca/studio-server
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverFilter = process.argv[2];

if (!serverFilter) {
  console.error("Usage: node scripts/desktop-dev.mjs <server-pnpm-filter>");
  console.error("Example: node scripts/desktop-dev.mjs @lisca/studio-server");
  process.exit(1);
}

const desktopDir = process.cwd();
const children = [];

function spawnLogged(command, args, options) {
  const child = spawn(command, args, options);
  children.push(child);
  return child;
}

const server = spawnLogged("pnpm", ["--filter", serverFilter, "dev"], {
  cwd: root,
  stdio: "inherit",
});

const shell = spawnLogged("zig", ["build", "dev"], {
  cwd: desktopDir,
  stdio: "inherit",
  env: { ...process.env, LISCA_SKIP_SERVER: "1" },
});

let exiting = false;

function shutdown(code = 0) {
  if (exiting) return;
  exiting = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}

server.on("exit", (code, signal) => {
  if (exiting) return;
  if (signal) shutdown(1);
  else shutdown(code ?? 1);
});

shell.on("exit", (code, signal) => {
  if (exiting) return;
  if (signal) shutdown(1);
  else shutdown(code ?? 0);
});

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

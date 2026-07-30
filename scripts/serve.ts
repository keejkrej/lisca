#!/usr/bin/env bun
/**
 * Build the web frontend + Rust backend for a product, then serve both on a
 * single public port so you can access it from another machine on the LAN.
 *
 *   vp run serve:aligner [--host 0.0.0.0] [--port 8765] [--skip-build]
 *
 * A tiny HTTP proxy serves the static dist/ for non-API routes and forwards
 * /fs, /align, /annotate, /studio, /profile, /memory, /tasks to the Rust backend
 * (same layout as the Docker nginx config).
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { LISCA_API_PROXY_PREFIXES } from "./lisca-dev-ports.cjs";

type LiscaProduct = "aligner" | "annotator" | "studio";

const root = resolve(import.meta.dirname, "..");

const product = process.argv[2] as LiscaProduct ?? "aligner";
const skipBuild = process.argv.includes("--skip-build");
const hostArg = process.argv.find((a) => a.startsWith("--host="));
const portArg = process.argv.find((a) => a.startsWith("--port="));

const PORTS: Record<LiscaProduct, number> = { aligner: 8765, annotator: 8766, studio: 8767 };
const publicPort = portArg ? Number(portArg.slice(7)) : PORTS[product] ?? 8765;
const host = hostArg ? hostArg.slice(7) : "0.0.0.0";

if (!(product in PORTS)) {
  console.error(`Unknown product "${product}". Use: aligner | annotator | studio`);
  process.exit(1);
}

const distDir = resolve(root, "apps", product, "web", "dist");
const serverBinary = resolve(
  root,
  "target",
  "release",
  process.platform === "win32" ? `${product}-server.exe` : `${product}-server`,
);

function run(cmd: string, args: string[]): void {
  const r = Bun.spawnSync({ cmd: [cmd, ...args], cwd: root, stdio: ["inherit", "inherit", "inherit"] });
  if (r.exitCode !== null && r.exitCode !== 0) process.exit(r.exitCode ?? 1);
}

if (!skipBuild) {
  console.log(`[serve] building @lisca/${product}-web…`);
  run("vp", ["run", "--filter", `@lisca/${product}-web`, "build"]);
  console.log(`[serve] building ${product}-server (release)…`);
  run("cargo", ["build", "--release", "-p", `${product}-server`]);
}

if (!existsSync(distDir)) {
  console.error(`[serve] missing ${distDir} — run without --skip-build first.`);
  process.exit(1);
}
if (!existsSync(serverBinary)) {
  console.error(`[serve] missing ${serverBinary} — run without --skip-build first.`);
  process.exit(1);
}

const backendPort = publicPort + 1000;

console.log(`[serve] ${product}-server on 127.0.0.1:${backendPort}`);
console.log(`[serve] public on ${host}:${publicPort} (static + API proxy)`);

const server = Bun.spawn({
  cmd: [serverBinary],
  cwd: root,
  env: { ...process.env, PORT: String(backendPort), HOST: "127.0.0.1" },
  stdio: ["inherit", "inherit", "inherit"],
});

const apiPrefixes = LISCA_API_PROXY_PREFIXES;

const httpServer = Bun.serve({
  port: publicPort,
  hostname: host,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // API routes -> proxy to Rust backend
    if (apiPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      try {
        const target = new URL(req.url);
        target.port = String(backendPort);
        target.hostname = "127.0.0.1";
        return await fetch(target, req);
      } catch {
        return new Response("Backend unavailable", { status: 502 });
      }
    }

    // Static files from dist/
    const filePath = join(distDir, decodeURIComponent(pathname));
    if (!filePath.startsWith(distDir)) {
      return new Response("Forbidden", { status: 403 });
    }
    let file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }
    // SPA fallback
    file = Bun.file(join(distDir, "index.html"));
    if (await file.exists()) {
      return new Response(file);
    }
    return new Response("Not found", { status: 404 });
  },
});

console.log(`[serve] listening on http://${host}:${publicPort}`);

const cleanup = () => {
  if (server.killed === false) server.kill("SIGTERM");
  httpServer.stop(true);
  process.exit(0);
};
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

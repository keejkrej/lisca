#!/usr/bin/env bun
/**
 * Build the web frontend + Rust backend for a product, then serve both on a
 * single public port so you can access it from another machine on the LAN.
 *
 *   vp run serve:aligner [--host 0.0.0.0] [--port 8765] [--skip-build]
 *
 * A tiny HTTP proxy serves the static dist/ for non-API routes and forwards
 * /fs, /align, /annotate, /studio, /profile, /memory to the Rust backend
 * (same layout as the Docker nginx config).
 */
import { spawn, spawnSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import http from "node:http";

const require = createRequire(import.meta.url);
const { LISCA_API_PROXY_PREFIXES } = require("./lisca-dev-ports.cjs");

const root = resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const product = process.argv[2] ?? "aligner";
const skipBuild = process.argv.includes("--skip-build");
const hostArg = process.argv.find((a) => a.startsWith("--host="));
const portArg = process.argv.find((a) => a.startsWith("--port="));

const PORTS = { aligner: 8765, annotator: 8766, studio: 8767 };
const publicPort = portArg ? Number(portArg.slice(7)) : PORTS[product] ?? 8765;
const host = hostArg ? hostArg.slice(7) : "0.0.0.0";

if (!PORTS[product]) {
  console.error(`Unknown product "${product}". Use: aligner | annotator | studio`);
  process.exit(1);
}

const distDir = resolve(root, "apps", product, "web", "dist");
const serverBinary = resolve(root, "target", "release", process.platform === "win32" ? `${product}-server.exe` : `${product}-server`);

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
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

const server = spawn(serverBinary, [], {
  cwd: root,
  env: { ...process.env, PORT: String(backendPort), HOST: "127.0.0.1" },
  stdio: "inherit",
});

const apiPrefixes = LISCA_API_PROXY_PREFIXES;

const proxy = http.createServer((req, res) => {
  const url = req.url ?? "/";
  const pathname = url.split("?")[0];

  // API routes -> proxy to Rust backend
  for (let i = 0; i < apiPrefixes.length; i++) {
    const prefix = apiPrefixes[i];
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      const target = new URL(url, `http://127.0.0.1:${backendPort}`);
      const proxyReq = http.request(target, { method: req.method, headers: req.headers }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxyReq.on("error", () => {
        res.writeHead(502);
        res.end("Backend unavailable");
      });
      req.pipe(proxyReq);
      return;
    }
  }

  // Static files from dist/
  let filePath = normalize(join(distDir, pathname));
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    serveFile(filePath, res);
    return;
  }
  // SPA fallback
  const fallback = join(distDir, "index.html");
  if (existsSync(fallback)) {
    serveFile(fallback, res);
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});

function serveFile(filePath, res) {
  const ext = filePath.slice(filePath.lastIndexOf(".") + 1);
  const types = { html: "text/html", js: "application/javascript", css: "text/css", json: "application/json", png: "image/png", jpg: "image/jpeg", svg: "image/svg+xml", ico: "image/x-icon", woff2: "font/woff2", wasm: "application/wasm", onnx: "application/octet-stream" };
  res.writeHead(200, { "Content-Type": types[ext] ?? "application/octet-stream" });
  createReadStream(filePath).pipe(res);
}

proxy.listen(publicPort, host, () => {
  console.log(`[serve] listening on http://${host}:${publicPort}`);
});

const cleanup = () => {
  if (!server.killed) server.kill("SIGTERM");
  proxy.close();
  process.exit(0);
};
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

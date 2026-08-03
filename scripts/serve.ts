#!/usr/bin/env node
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
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { LISCA_API_PROXY_PREFIXES } from "./lisca-dev-ports.cjs";
import { runSync, spawnInherit } from "./node-run.ts";

type LiscaProduct = "aligner" | "annotator" | "studio";

const root = resolve(import.meta.dirname, "..");

const product = (process.argv[2] as LiscaProduct) ?? "aligner";
const skipBuild = process.argv.includes("--skip-build");
const hostArg = process.argv.find((a) => a.startsWith("--host="));
const portArg = process.argv.find((a) => a.startsWith("--port="));

const PORTS: Record<LiscaProduct, number> = { aligner: 8765, annotator: 8766, studio: 8767 };
const publicPort = portArg ? Number(portArg.slice(7)) : (PORTS[product] ?? 8765);
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

if (!skipBuild) {
  console.log(`[serve] building @lisca/${product}-web…`);
  runSync("vp", ["run", "--filter", `@lisca/${product}-web`, "build"], { cwd: root });
  console.log(`[serve] building ${product}-server (release)…`);
  runSync("cargo", ["build", "--release", "-p", `${product}-server`], { cwd: root });
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

const server = spawnInherit(serverBinary, [], {
  cwd: root,
  env: { ...process.env, PORT: String(backendPort), HOST: "127.0.0.1" },
});

const apiPrefixes = LISCA_API_PROXY_PREFIXES;

function contentType(filePath: string): string {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

async function proxyApi(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  try {
    const target = new URL(req.url ?? "/", `http://127.0.0.1:${backendPort}`);
    target.port = String(backendPort);
    target.hostname = "127.0.0.1";
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const item of value) headers.append(key, item);
      } else {
        headers.set(key, value);
      }
    }
    headers.delete("host");
    const body =
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : await new Promise<Buffer>((resolvePromise, reject) => {
            const chunks: Buffer[] = [];
            req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            req.on("end", () => resolvePromise(Buffer.concat(chunks)));
            req.on("error", reject);
          });
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      // @ts-expect-error duplex needed for some node fetch bodies
      duplex: body ? "half" : undefined,
    });
    res.statusCode = upstream.status;
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === "transfer-encoding") return;
      res.setHeader(key, value);
    });
    const ab = await upstream.arrayBuffer();
    res.end(Buffer.from(ab));
  } catch {
    res.statusCode = 502;
    res.end("Backend unavailable");
  }
  void pathname;
}

async function serveStatic(res: ServerResponse, pathname: string): Promise<void> {
  const decoded = decodeURIComponent(pathname);
  const candidates = [
    join(distDir, decoded === "/" ? "index.html" : decoded),
    join(distDir, "index.html"),
  ];
  for (const filePath of candidates) {
    if (!filePath.startsWith(distDir)) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }
    if (!existsSync(filePath) || !statSync(filePath).isFile()) continue;
    res.statusCode = 200;
    res.setHeader("Content-Type", contentType(filePath));
    await pipeline(createReadStream(filePath), res);
    return;
  }
  res.statusCode = 404;
  res.end("Not found");
}

const httpServer = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? "/", `http://${host}:${publicPort}`);
    const pathname = url.pathname;
    if (apiPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      await proxyApi(req, res, pathname);
      return;
    }
    await serveStatic(res, pathname);
  })().catch((error) => {
    console.error(error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end("Internal error");
    }
  });
});

httpServer.listen(publicPort, host, () => {
  console.log(`[serve] listening on http://${host}:${publicPort}`);
});

const cleanup = () => {
  if (!server.killed) server.kill("SIGTERM");
  httpServer.close();
  process.exit(0);
};
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

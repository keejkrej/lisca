import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  LISCA_API_PROXY_PREFIXES,
  LISCA_APP_PORTS,
  LISCA_DEV_BACKEND_PORT_OFFSET,
  liscaDevBackendPort,
} from "./lisca-dev-ports.cjs";
import { DESKTOP_PRODUCTS } from "./lisca-desktop-products.cjs";
import { isBenignDevWsProxyError, isLiscaApiProxyPath } from "./lisca-dev-proxy-shared.cjs";

const root = path.resolve(import.meta.dirname, "..");

async function waitForTcpPort(port: number, timeoutMs = 10_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const open = await new Promise<boolean>((resolve) => {
      const socket = net.connect({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.end();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
    });
    if (open) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`port ${port} did not open within ${timeoutMs}ms`);
}

describe("lisca dev ports", () => {
  it("assigns unique public and backend ports per product", () => {
    const publicPorts = Object.values(LISCA_APP_PORTS).map((entry) => entry.publicPort);
    const backendPorts = Object.values(LISCA_APP_PORTS).map((entry) => entry.backendPort);

    expect(new Set(publicPorts).size).toBe(publicPorts.length);
    expect(new Set(backendPorts).size).toBe(backendPorts.length);
  });

  it("offsets backend ports by 1000", () => {
    for (const [, ports] of Object.entries(LISCA_APP_PORTS)) {
      expect(ports.backendPort).toBe(ports.publicPort + LISCA_DEV_BACKEND_PORT_OFFSET);
      expect(liscaDevBackendPort(ports.publicPort)).toBe(ports.backendPort);
    }
  });

  it("keeps desktop products aligned with shared port map", () => {
    for (const scope of ["aligner", "annotator", "studio"] as const) {
      const desktop = DESKTOP_PRODUCTS[scope];
      const ports = LISCA_APP_PORTS[scope];
      expect(desktop.port).toBe(ports.publicPort);
      expect(desktop.backendPort).toBe(ports.backendPort);
    }
  });
});

describe("lisca API proxy path matching", () => {
  for (const prefix of LISCA_API_PROXY_PREFIXES) {
    it(`matches ${prefix}`, () => {
      expect(isLiscaApiProxyPath(prefix)).toBe(true);
      expect(isLiscaApiProxyPath(`${prefix}/nested`)).toBe(true);
      expect(isLiscaApiProxyPath(`${prefix}?q=1`)).toBe(true);
    });
  }

  it("does not match UI routes", () => {
    expect(isLiscaApiProxyPath("/")).toBe(false);
    expect(isLiscaApiProxyPath("/index.bundle")).toBe(false);
    expect(isLiscaApiProxyPath("/_expo/static/js/web/entry.js")).toBe(false);
    expect(isLiscaApiProxyPath("/hot")).toBe(false);
  });
});

describe("benign vite ws proxy errors", () => {
  it("suppresses EPIPE and ECONNRESET", () => {
    expect(isBenignDevWsProxyError("ws proxy socket error:\nError: write EPIPE")).toBe(true);
    expect(isBenignDevWsProxyError("ws proxy error:\nError: read ECONNRESET")).toBe(true);
  });

  it("keeps actionable proxy failures", () => {
    expect(isBenignDevWsProxyError("ws proxy error:\nError: connect ECONNREFUSED")).toBe(false);
    expect(isBenignDevWsProxyError("http proxy error: connect ECONNREFUSED")).toBe(false);
  });
});

describe("live rust server smoke", () => {
  const repoRoot = root;
  const serverBinary = path.join(repoRoot, "target/debug/aligner-server");
  let child: ChildProcess | undefined;
  let port = 0;

  afterEach(async () => {
    if (child && !child.killed) {
      child.kill("SIGTERM");
      await new Promise<void>((resolve) => child?.once("exit", () => resolve()));
    }
  });

  async function reserveLivePort(): Promise<number> {
    const probe = net.createServer();
    await new Promise<void>((resolve, reject) => {
      probe.once("error", reject);
      probe.listen(0, "127.0.0.1", () => resolve());
    });
    const reserved = (probe.address() as net.AddressInfo).port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    return reserved;
  }

  it("serves /fs/list when the debug binary is present", async () => {
    const { access } = await import("node:fs/promises");
    try {
      await access(serverBinary);
    } catch {
      return;
    }

    port = await reserveLivePort();
    child = spawn(serverBinary, [], {
      cwd: repoRoot,
      env: { ...process.env, PORT: String(port) },
      stdio: "ignore",
    });
    await waitForTcpPort(port, 30_000);

    const response = await fetch(`http://127.0.0.1:${port}/fs/list`);
    expect(response.status).toBe(200);
    const json = (await response.json()) as { entries?: unknown[] };
    expect(Array.isArray(json.entries)).toBe(true);
  }, 60_000);
});

describe("vite dev config", () => {
  it("proxies every API prefix to the backend port", async () => {
    const { createLiscaViteConfig } = await import("../packages/web-app/vite.ts");
    for (const [scope, ports] of Object.entries(LISCA_APP_PORTS)) {
      const config = createLiscaViteConfig({ port: ports.publicPort });
      const proxy = config.server?.proxy;
      expect(proxy).toBeDefined();
      for (const prefix of LISCA_API_PROXY_PREFIXES) {
        const entry = proxy?.[prefix];
        expect(entry, `${scope} missing proxy for ${prefix}`).toBeDefined();
        expect(entry?.target).toBe(`http://127.0.0.1:${ports.backendPort}`);
      }
    }
  });
});
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const {
  LISCA_API_PROXY_PREFIXES,
  LISCA_APP_PORTS,
  LISCA_DEV_BACKEND_PORT_OFFSET,
  LISCA_MOBILE_EXPO_TO_RUST,
  LISCA_MOBILE_PORTS,
  liscaDevBackendPort,
  liscaMobileExpoPort,
} = require("./lisca-dev-ports.cjs");
const { DESKTOP_PRODUCTS } = require("./electron/products.cjs");
const {
  isBenignDevWsProxyError,
  isLiscaApiProxyPath,
} = require("./lisca-dev-proxy-shared.cjs");

function listenHttp(
  handler: (req: IncomingMessage, res: ServerResponse) => void,
): Promise<{ server: Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createServer(handler);
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("expected TCP address"));
        return;
      }
      resolve({ server, port: address.port });
    });
  });
}

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

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  return response.text();
}

async function reservePort(): Promise<number> {
  const probe = net.createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => resolve());
  });
  const reserved = (probe.address() as net.AddressInfo).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return reserved;
}

describe("lisca dev LAN host", () => {
  const {
    isUsableDevHost,
    resolveDevLanHost,
  } = require("./lisca-dev-lan-host.cjs");

  it("prefers explicit LISCA_DEV_HOST", () => {
    expect(resolveDevLanHost({ LISCA_DEV_HOST: "10.0.0.5" })).toBe("10.0.0.5");
  });

  it("falls back to EXPO_PUBLIC_LISCA_HTTP_HOST", () => {
    expect(resolveDevLanHost({ EXPO_PUBLIC_LISCA_HTTP_HOST: "192.168.2.1" })).toBe("192.168.2.1");
  });

  it("returns a non-empty address when interfaces exist", () => {
    expect(resolveDevLanHost({})).toMatch(/\d+\.\d+\.\d+\.\d+/);
  });

  it("skips VM bridge and link-local addresses", () => {
    expect(isUsableDevHost("192.168.64.1")).toBe(false);
    expect(isUsableDevHost("169.254.110.149")).toBe(false);
    expect(isUsableDevHost("10.181.67.18")).toBe(true);
  });

  it("prefers Wi-Fi over a Parallels bridge100 address", () => {
    const os = require("node:os");
    const original = os.networkInterfaces;
    os.networkInterfaces = () => ({
      bridge100: [{ family: "IPv4", internal: false, address: "192.168.64.1" }],
      en1: [{ family: "IPv4", internal: false, address: "10.181.67.18" }],
    });
    try {
      expect(resolveDevLanHost({})).toBe("10.181.67.18");
    } finally {
      os.networkInterfaces = original;
    }
  });

  it("uses iPhone hotspot bridge addresses when present", () => {
    const os = require("node:os");
    const original = os.networkInterfaces;
    os.networkInterfaces = () => ({
      bridge100: [{ family: "IPv4", internal: false, address: "172.20.10.1" }],
    });
    try {
      expect(resolveDevLanHost({})).toBe("172.20.10.1");
    } finally {
      os.networkInterfaces = original;
    }
  });
});

describe("lisca dev ports", () => {
  it("assigns unique public, backend, and mobile ports per product", () => {
    const publicPorts = Object.values(LISCA_APP_PORTS).map((entry) => entry.publicPort);
    const backendPorts = Object.values(LISCA_APP_PORTS).map((entry) => entry.backendPort);
    const mobilePorts = Object.values(LISCA_MOBILE_PORTS);

    expect(new Set(publicPorts).size).toBe(publicPorts.length);
    expect(new Set(backendPorts).size).toBe(backendPorts.length);
    expect(new Set(mobilePorts).size).toBe(mobilePorts.length);
  });

  it("offsets backend and expo ports by 1000", () => {
    for (const [scope, ports] of Object.entries(LISCA_APP_PORTS)) {
      expect(ports.backendPort).toBe(ports.publicPort + LISCA_DEV_BACKEND_PORT_OFFSET);
      expect(liscaDevBackendPort(ports.publicPort)).toBe(ports.backendPort);
      expect(liscaMobileExpoPort(LISCA_MOBILE_PORTS[scope as keyof typeof LISCA_MOBILE_PORTS])).toBe(
        LISCA_MOBILE_PORTS[scope as keyof typeof LISCA_MOBILE_PORTS] + LISCA_DEV_BACKEND_PORT_OFFSET,
      );
    }
  });

  it("maps expo dev ports to rust API ports", () => {
    expect(LISCA_MOBILE_EXPO_TO_RUST).toEqual({
      9081: 8765,
      9082: 8766,
      9083: 8767,
    });
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

describe("mobile dev proxy routing", () => {
  let rust: Server;
  let expo: Server;
  let proxy: ChildProcess;
  let rustPort = 0;
  let expoPort = 0;
  let publicPort = 0;

  beforeEach(async () => {
    ({ server: rust, port: rustPort } = await listenHttp((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("rust");
    }));
    ({ server: expo, port: expoPort } = await listenHttp((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("expo");
    }));

    const probe = net.createServer();
    await new Promise<void>((resolve, reject) => {
      probe.once("error", reject);
      probe.listen(0, "127.0.0.1", () => resolve());
    });
    publicPort = (probe.address() as net.AddressInfo).port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));

    proxy = spawn(
      process.execPath,
      [
        path.join(root, "scripts/lisca-mobile-dev-proxy.cjs"),
        "--listen",
        String(publicPort),
        "--expo",
        String(expoPort),
        "--rust",
        String(rustPort),
      ],
      { cwd: root, stdio: "ignore" },
    );
    await waitForTcpPort(publicPort);
  });

  afterEach(async () => {
    if (proxy && !proxy.killed) proxy.kill("SIGTERM");
    await Promise.all([
      new Promise<void>((resolve) => rust.close(() => resolve())),
      new Promise<void>((resolve) => expo.close(() => resolve())),
    ]);
  });

  for (const prefix of LISCA_API_PROXY_PREFIXES) {
    it(`routes ${prefix} to rust`, async () => {
      const body = await fetchText(`http://127.0.0.1:${publicPort}${prefix}`);
      expect(body).toBe("rust");
    });
  }

  it("routes UI traffic to expo", async () => {
    expect(await fetchText(`http://127.0.0.1:${publicPort}/`)).toBe("expo");
    expect(await fetchText(`http://127.0.0.1:${publicPort}/index.bundle`)).toBe("expo");
  });
});

describe("live rust server smoke", () => {
  const repoRoot = root;
  const serverBinary = path.join(repoRoot, "target/debug/aligner-server");
  let child: ChildProcess | undefined;
  let port = 0;
  let rustPort = 0;

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

  it("proxies /fs/list through the mobile dev proxy to a live server", async () => {
    const { access } = await import("node:fs/promises");
    try {
      await access(serverBinary);
    } catch {
      return;
    }

    rustPort = await reserveLivePort();
    child = spawn(serverBinary, [], {
      cwd: repoRoot,
      env: { ...process.env, PORT: String(rustPort) },
      stdio: "ignore",
    });
    await waitForTcpPort(rustPort, 30_000);

    const { server: expo, port: expoPort } = await listenHttp((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("expo");
    });
    const publicPort = await reserveLivePort();
    const proxy = spawn(
      process.execPath,
      [
        path.join(root, "scripts/lisca-mobile-dev-proxy.cjs"),
        "--listen",
        String(publicPort),
        "--expo",
        String(expoPort),
        "--rust",
        String(rustPort),
      ],
      { cwd: root, stdio: "ignore" },
    );
    await waitForTcpPort(publicPort, 10_000);

    try {
      const response = await fetch(`http://127.0.0.1:${publicPort}/fs/list`);
      expect(response.status).toBe(200);
      const json = (await response.json()) as { entries?: unknown[] };
      expect(Array.isArray(json.entries)).toBe(true);
    } finally {
      if (!proxy.killed) proxy.kill("SIGTERM");
      await new Promise<void>((resolve) => expo.close(() => resolve()));
    }
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

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  PRODUCTS,
  PRODUCT_TITLES,
  isLoopbackTarget,
  isProductId,
  mcpStateDir,
  productBaseUrl,
  productPort,
  repoRoot,
  targetBinary,
  type ProductId,
} from "./config.ts";
import { probeProduct } from "./http.ts";
import { errorFrom, jsonResult, textResult, type LiscaTool } from "./tool.ts";

const STARTUP_TIMEOUT_MS = 30_000;
const DEFAULT_BUILD_TIMEOUT_MS = 15 * 60_000;

/** Pids of servers started by this process, so server_stop can stop them. */
const spawned = new Map<ProductId, number>();

export function serverLiscaTools(): LiscaTool[] {
  return [
    {
      name: "server_status",
      title: "Product server status",
      description:
        "Report which Lisca product servers are reachable right now: Aligner, Annotator, and Studio. " +
        "Each row shows its JSON API URL, a health probe, and whether the server binary is built. " +
        "The contract tools (align_*, annotate_*, studio_*, tasks_*, fs_*) need the matching server running.",
      inputSchema: {
        type: "object",
        properties: {
          product: {
            type: "string",
            enum: [...PRODUCTS],
            description: "Restrict the report to one product. Omit to report all three.",
          },
        },
      },
      handler: async (args) => {
        try {
          const products = args.product === undefined ? [...PRODUCTS] : [args.product as ProductId];
          const report = [];
          for (const product of products) {
            const probe = await probeProduct(product);
            const url = productBaseUrl(product);
            report.push({
              product,
              title: PRODUCT_TITLES[product],
              url,
              remote: !isLoopbackTarget(url),
              running: probe.running,
              latencyMs: probe.latencyMs ?? null,
              binary: binaryReport(product),
            });
          }
          const running = report.filter((row) => row.running).map((row) => row.product);
          const remoteRows = report.filter((row) => row.remote).map((row) => row.product);
          const hints: string[] = [];
          if (running.length === 0) {
            hints.push(
              "No product server is running. Call server_start to boot one (local checkouts) or start the remote deployment.",
            );
          }
          if (remoteRows.length > 0) {
            hints.push(
              `Remote target${remoteRows.length === 1 ? "" : "s"} (${remoteRows.join(", ")}): server_start and server_stop manage local binaries only — manage remote deployment${remoteRows.length === 1 ? "" : "s"} with their own tooling.`,
            );
          }
          return jsonResult({
            servers: report,
            running,
            hint: hints.length > 0 ? hints.join(" ") : undefined,
          });
        } catch (cause) {
          return errorFrom(cause);
        }
      },
    },
    {
      name: "server_start",
      title: "Start a product server",
      description:
        "Start a Lisca product server binary (Aligner, Annotator, or Studio) in the background, then wait until " +
        "its JSON API answers. Uses target/release first, then target/debug; set build=true to `cargo build` the " +
        "binary first when neither exists. Detached from this MCP server: it keeps running after the session. " +
        "Logs go to target/mcp/<product>-server.log. Only manages servers on this machine: when a product's " +
        "URL points at a remote deployment (LISCA_MCP_<PRODUCT>_URL or LISCA_MCP_HOST), it refuses and " +
        "leaves that deployment to its own tooling.",
      inputSchema: {
        type: "object",
        properties: {
          product: {
            type: "string",
            enum: [...PRODUCTS],
            description: "Which product server to start.",
          },
          build: {
            type: "boolean",
            description: `When no binary exists, build it first (cargo build --release -p <product>-server). Default false.`,
          },
          buildTimeoutMs: {
            type: "integer",
            minimum: 30_000,
            description: `Budget for the optional build. Default ${DEFAULT_BUILD_TIMEOUT_MS}.`,
          },
        },
        required: ["product"],
      },
      handler: async (args) => {
        try {
          const product = requireProductId(args.product);
          const url = productBaseUrl(product);
          if (!isLoopbackTarget(url)) {
            return errorFrom(
              new Error(
                `${PRODUCT_TITLES[product]} is configured at ${url}, which is not on this machine, so lisca-mcp cannot ` +
                  `start a binary for it here. Start the product in its remote deployment (container or host) with ` +
                  `your deployment tooling, or clear LISCA_MCP_${product.toUpperCase()}_URL / LISCA_MCP_HOST to manage local servers again.`,
              ),
            );
          }
          const probe = await probeProduct(product);
          if (probe.running) {
            return textResult(
              `${PRODUCT_TITLES[product]} server is already running at ${productBaseUrl(product)} (latency ${probe.latencyMs} ms).`,
            );
          }
          const binary = resolveServerBinary(product);
          if (!binary && !args.build) {
            return errorFrom(
              new Error(
                `No ${product}-server binary found under target/release or target/debug. ` +
                  `Call server_start with build=true to build it first (cargo build --release -p ${product}-server).`,
              ),
            );
          }
          if (!binary) {
            const build = spawnSync("cargo", ["build", "--release", "-p", `${product}-server`], {
              cwd: repoRoot(),
              timeout: numberArg(args.buildTimeoutMs, DEFAULT_BUILD_TIMEOUT_MS),
              encoding: "utf8",
            });
            if (build.status !== 0) {
              return errorFrom(
                new Error(
                  `cargo build --release -p ${product}-server failed (exit ${build.status}):\n${tail(build.stderr ?? build.stdout ?? "", 2000)}`,
                ),
              );
            }
          }
          const chosen = resolveServerBinary(product);
          if (!chosen) {
            return errorFrom(
              new Error(`Build finished but no ${product}-server binary appeared under target/.`),
            );
          }
          return await launchServer(product, chosen);
        } catch (cause) {
          return errorFrom(cause);
        }
      },
    },
    {
      name: "server_stop",
      title: "Stop a product server",
      description:
        "Stop a Lisca product server that was started by this MCP server (or by a previous session's pidfile). " +
        "Servers not started through lisca-mcp are left alone with a notice — stop those by hand, and remote " +
        "deployments with their own tooling.",
      inputSchema: {
        type: "object",
        properties: {
          product: {
            type: "string",
            enum: [...PRODUCTS],
            description: "Which product server to stop.",
          },
        },
        required: ["product"],
      },
      handler: async (args) => {
        try {
          const product = requireProductId(args.product);
          const url = productBaseUrl(product);
          if (!isLoopbackTarget(url)) {
            return errorFrom(
              new Error(
                `${PRODUCT_TITLES[product]} is configured at ${url}, which is not on this machine; lisca-mcp ` +
                  `only stops servers it started locally. Stop the remote instance with its own deployment tooling.`,
              ),
            );
          }
          const pid = readSpawnedPid(product);
          if (pid === null) {
            const probe = await probeProduct(product);
            return textResult(
              probe.running
                ? `A ${PRODUCT_TITLES[product]} server is running at ${productBaseUrl(product)}, but it was not started by lisca-mcp — stop it yourself.`
                : `No ${PRODUCT_TITLES[product]} server is running.`,
            );
          }
          process.kill(pid, "SIGTERM");
          const gone = await waitUntil(
            async () => !(await probeProduct(product, 300)).running,
            10_000,
            250,
          );
          if (!gone) {
            try {
              process.kill(pid, "SIGKILL");
            } catch {
              // already dead
            }
          }
          spawned.delete(product);
          rmSync(pidFile(product), { force: true });
          return textResult(`Stopped ${PRODUCT_TITLES[product]} server (pid ${pid}).`);
        } catch (cause) {
          return errorFrom(cause);
        }
      },
    },
  ];
}

async function launchServer(product: ProductId, binary: string): Promise<CallToolResult> {
  mkdirSync(mcpStateDir(), { recursive: true });
  const logPath = path.join(mcpStateDir(), `${product}-server.log`);
  const log = { fd: openSync(logPath, "w") };
  const child = spawn(binary, [], {
    cwd: repoRoot(),
    detached: true,
    stdio: ["ignore", log.fd, log.fd],
    env: {
      ...process.env,
      PORT: String(productPort(product)),
    },
  });
  child.unref();
  if (child.pid === undefined) {
    throw new Error(`The ${product} server exited before reporting a pid.`);
  }
  spawned.set(product, child.pid);
  writeFileSync(pidFile(product), `${child.pid}\n`);
  const ready = await waitUntil(
    async () => (await probeProduct(product, 1000)).running,
    STARTUP_TIMEOUT_MS,
    500,
  );
  const result: Record<string, unknown> = {
    product,
    title: PRODUCT_TITLES[product],
    pid: child.pid,
    url: productBaseUrl(product),
    binary,
    logPath,
  };
  if (!ready) {
    result.warning =
      `Server did not answer /fs/home within ${STARTUP_TIMEOUT_MS / 1000}s. ` +
      `Check ${logPath}; it may still be starting.`;
  }
  return jsonResult(result);
}

function pidFile(product: ProductId): string {
  return path.join(mcpStateDir(), `${product}-server.pid`);
}

function readSpawnedPid(product: ProductId): number | null {
  const mine = spawned.get(product);
  if (mine !== undefined && processExists(mine)) {
    return mine;
  }
  try {
    const pid = Number.parseInt(readFileSync(pidFile(product), "utf8").trim(), 10);
    if (Number.isInteger(pid) && processExists(pid)) {
      return pid;
    }
  } catch {
    // no pidfile
  }
  return null;
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitUntil(
  condition: () => Promise<boolean>,
  timeoutMs: number,
  intervalMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await condition()) {
      return true;
    }
    await sleep(intervalMs);
  }
  return await condition();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireProductId(value: unknown): ProductId {
  if (!isProductId(value)) {
    throw new Error(`product must be one of ${PRODUCTS.join(", ")} (got ${JSON.stringify(value)})`);
  }
  return value;
}

function numberArg(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveServerBinary(product: ProductId): string | null {
  for (const release of [true, false]) {
    const binary = targetBinary(`${product}-server`, release);
    if (existsSync(binary)) {
      return binary;
    }
  }
  return null;
}

function binaryReport(product: ProductId) {
  return {
    release: existsSync(targetBinary(`${product}-server`, true)),
    debug: existsSync(targetBinary(`${product}-server`, false)),
  };
}

function tail(text: string, chars: number): string {
  return text.length > chars ? `${text.slice(-chars)}…` : text;
}

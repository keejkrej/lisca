import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import solid from "vite-plugin-solid";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  defineConfig,
  createLogger,
  type Logger,
  type PluginOption,
  type ProxyOptions,
  type UserConfig,
} from "vite";

const require = createRequire(fileURLToPath(new URL(".", import.meta.url)));
const {
  LISCA_API_PROXY_PREFIXES,
  liscaDevBackendPort,
  LISCA_DEV_BACKEND_PORT_OFFSET,
} = require("../../scripts/lisca-dev-ports.cjs");
const {
  isBenignDevProxyError,
  isBenignProxySocketError,
} = require("../../scripts/lisca-dev-proxy-shared.cjs");

export { liscaDevBackendPort, LISCA_DEV_BACKEND_PORT_OFFSET };

/** Solid plugin for all Lisca web apps. Replaces the former React + React Compiler plugin. */
export function liscaSolidPlugin(): PluginOption {
  return solid();
}

const brandPublicDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../assets/brand");
const modelsDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../models");

function contentTypeForPath(path: string): string {
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".onnx")) return "application/octet-stream";
  return "application/octet-stream";
}

function liscaModelsPlugin(): PluginOption {
  return {
    name: "lisca-models",
    configureServer(server) {
      server.middlewares.use("/models", (req, res, next) => {
        const requestPath = req.url?.split("?")[0] ?? "";
        if (!requestPath || requestPath.includes("..")) {
          next();
          return;
        }

        const filePath = normalize(join(modelsDir, requestPath));
        if (!filePath.startsWith(modelsDir) || !existsSync(filePath)) {
          next();
          return;
        }

        const stats = statSync(filePath);
        if (!stats.isFile()) {
          next();
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", contentTypeForPath(filePath));
        res.setHeader("Content-Length", String(stats.size));
        const stream = createReadStream(filePath);
        stream.on("error", (error) => {
          if (isBenignProxySocketError(error)) {
            if (!res.writableEnded) res.end();
            return;
          }
          next(error);
        });
        res.on("close", () => {
          stream.destroy();
        });
        stream.pipe(res).on("error", (error) => {
          if (isBenignProxySocketError(error)) {
            stream.destroy();
          }
        });
      });
    },
  };
}

function createLiscaDevLogger(): Logger {
  const logger = createLogger();
  const logError = logger.error.bind(logger);
  logger.error = (message, options) => {
    const text =
      typeof message === "string"
        ? message
        : message instanceof Error
          ? `${message.message}\n${message.stack ?? ""}`
          : String(message);
    if (isBenignDevProxyError(text)) return;
    logError(message, options);
  };
  return logger;
}

function liscaDevProxy(backendPort: number): Record<string, ProxyOptions> {
  const target = `http://127.0.0.1:${backendPort}`;
  const proxy: Record<string, ProxyOptions> = {};
  for (const prefix of LISCA_API_PROXY_PREFIXES) {
    proxy[prefix] = {
      target,
      changeOrigin: true,
      configure: (proxyServer) => {
        proxyServer.on("error", (error, _req, res) => {
          if (!isBenignProxySocketError(error)) return;
          if (res && "writableEnded" in res && !res.writableEnded) {
            res.end();
          }
        });
        proxyServer.on("proxyReqWs", (_proxyReq, _req, socket) => {
          socket.on("error", (error) => {
            if (!isBenignProxySocketError(error)) return;
          });
        });
      },
    };
  }
  return proxy;
}

/**
 * Shared Vite configuration for every Lisca web app. Apps supply the public dev
 * port (8765/8766/8767); API traffic is proxied to the Rust backend on port + 1000.
 */
export function createLiscaViteConfig(options: {
  port: number;
  base?: string;
  backendPort?: number;
}): UserConfig {
  const backendPort = options.backendPort ?? liscaDevBackendPort(options.port);

  return defineConfig({
    base: options.base ?? (process.env.VITE_DESKTOP === "1" ? "./" : "/"),
    publicDir: brandPublicDir,
    customLogger: createLiscaDevLogger(),
    resolve: {
      dedupe: ["solid-js"],
    },
    plugins: [
      tanstackRouter({ target: "solid", autoCodeSplitting: true }),
      liscaSolidPlugin(),
      tailwindcss(),
      liscaModelsPlugin(),
    ],
    server: {
      host: true,
      port: options.port,
      strictPort: true,
      proxy: liscaDevProxy(backendPort),
    },
  });
}

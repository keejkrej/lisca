import tailwindcss from "@tailwindcss/vite";
import solid from "vite-plugin-solid";
import { copyFileSync, createReadStream, existsSync, statSync } from "node:fs";
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

export type LiscaViteProduct = "aligner" | "annotator" | "studio";

const PRODUCT_FAVICON_FILES = ["favicon.ico", "favicon.png", "icon.png", "icon.ico"] as const;

function contentTypeForPublicFile(name: string): string {
  if (name.endsWith(".ico")) return "image/x-icon";
  if (name.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

/** Overlay product-specific favicons on top of the shared `assets/brand` public dir. */
function liscaProductFaviconPlugin(product: LiscaViteProduct): PluginOption {
  const dir = resolve(brandPublicDir, "apps", product);
  return {
    name: "lisca-product-favicon",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url?.split("?")[0] ?? "").replace(/^\//, "");
        if (!PRODUCT_FAVICON_FILES.includes(name as (typeof PRODUCT_FAVICON_FILES)[number])) {
          next();
          return;
        }
        const filePath = join(dir, name);
        if (!existsSync(filePath) || !statSync(filePath).isFile()) {
          next();
          return;
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", contentTypeForPublicFile(name));
        res.setHeader("Content-Length", String(statSync(filePath).size));
        createReadStream(filePath).pipe(res);
      });
    },
    writeBundle(options) {
      const outDir = options.dir;
      if (!outDir) return;
      for (const name of PRODUCT_FAVICON_FILES) {
        const src = join(dir, name);
        if (!existsSync(src)) continue;
        copyFileSync(src, join(outDir, name));
      }
    },
  };
}

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
    const value: unknown = message;
    const text =
      typeof value === "string"
        ? value
        : value instanceof Error
          ? `${value.message}\n${value.stack ?? ""}`
          : String(value);
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
  plugins?: PluginOption[];
  /** When set, favicon/icon files come from `assets/brand/apps/<product>/`. */
  product?: LiscaViteProduct;
}): UserConfig {
  const backendPort = options.backendPort ?? liscaDevBackendPort(options.port);
  const productFavicon = options.product ? liscaProductFaviconPlugin(options.product) : null;

  return defineConfig({
    base: options.base ?? (process.env.VITE_DESKTOP === "1" ? "./" : "/"),
    publicDir: brandPublicDir,
    customLogger: createLiscaDevLogger(),
    resolve: {
      dedupe: ["solid-js"],
    },
    plugins: [
      ...(options.plugins ?? []),
      liscaSolidPlugin(),
      tailwindcss(),
      liscaModelsPlugin(),
      ...(productFavicon ? [productFavicon] : []),
    ],
    server: {
      host: true,
      port: options.port,
      strictPort: true,
      proxy: liscaDevProxy(backendPort),
    },
  });
}

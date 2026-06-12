import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, createLogger, type Logger, type PluginOption, type ProxyOptions, type UserConfig } from "vite";

const require = createRequire(fileURLToPath(new URL(".", import.meta.url)));
const reactCompilerPlugin = require("babel-plugin-react-compiler");
const { LISCA_API_PROXY_PREFIXES, liscaDevBackendPort } = require("../../scripts/lisca-dev-ports.cjs");
const { isBenignDevWsProxyError } = require("../../scripts/lisca-dev-proxy-shared.cjs");

/** @deprecated Import from `scripts/lisca-dev-ports.cjs`. */
export const LISCA_DEV_BACKEND_PORT_OFFSET = 1000;

export { liscaDevBackendPort };

/** React plugin with React Compiler auto-memoization enabled for all Lisca web apps. */
export function liscaReactPlugin(): PluginOption {
  return react({
    babel: {
      plugins: [[reactCompilerPlugin, {}]],
    },
  });
}

const brandPublicDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../assets/brand");

function createLiscaDevLogger(): Logger {
  const logger = createLogger();
  const logError = logger.error.bind(logger);
  logger.error = (message, options) => {
    if (typeof message === "string" && isBenignDevWsProxyError(message)) return;
    logError(message, options);
  };
  return logger;
}

function liscaDevProxy(backendPort: number): Record<string, ProxyOptions> {
  const target = `http://127.0.0.1:${backendPort}`;
  const proxy: Record<string, ProxyOptions> = {};
  for (const prefix of LISCA_API_PROXY_PREFIXES) {
    proxy[prefix] =
      prefix === "/ws"
        ? { target, ws: true, changeOrigin: true }
        : { target, changeOrigin: true };
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
    plugins: [
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      liscaReactPlugin(),
      tailwindcss(),
    ],
    server: {
      host: true,
      port: options.port,
      strictPort: true,
      proxy: liscaDevProxy(backendPort),
    },
  });
}

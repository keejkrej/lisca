import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type PluginOption, type UserConfig } from "vite";

const require = createRequire(fileURLToPath(new URL(".", import.meta.url)));
const reactCompilerPlugin = require("babel-plugin-react-compiler");

/** React plugin with React Compiler auto-memoization enabled for all Lisca web apps. */
export function liscaReactPlugin(): PluginOption {
  return react({
    babel: {
      plugins: [[reactCompilerPlugin, {}]],
    },
  });
}

const brandPublicDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../assets/brand");

/**
 * Shared Vite configuration for every Lisca web app. Apps supply only their dev
 * server port; the plugin set, brand assets, and desktop base path are uniform.
 */
export function createLiscaViteConfig(options: { port: number }): UserConfig {
  return defineConfig({
    base: process.env.VITE_DESKTOP === "1" ? "./" : "/",
    publicDir: brandPublicDir,
    plugins: [
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      liscaReactPlugin(),
      tailwindcss(),
    ],
    server: {
      host: true,
      port: options.port,
      strictPort: true,
    },
  });
}

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { liscaReactPlugin } from "@lisca/web-app/vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type UserConfig } from "vite";

const brandPublicDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../assets/brand");

export function createLiscaDemoViteConfig(options: { port: number }): UserConfig {
  return defineConfig({
    base: "./",
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

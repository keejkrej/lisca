import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { liscaSolidPlugin } from "@lisca/web-app/vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type PluginOption } from "vite";

const brandPublicDir = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../assets/brand",
);

/** Dev fallback when bundled assets under assets/brand/demo-images/ibidi are missing. */
const ibidiDemoImageProxy = {
  "/demo-images/ibidi": {
    target: "https://ibidi.com/img/cms/applications/micropatterning",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/demo-images\/ibidi/, ""),
  },
} as const;

function localPlugin(plugin: unknown): PluginOption {
  return plugin as PluginOption;
}

export default defineConfig({
  base: "/",
  publicDir: brandPublicDir,
  plugins: [
    localPlugin(tanstackRouter({ target: "solid", autoCodeSplitting: true })),
    localPlugin(liscaSolidPlugin()),
    localPlugin(tailwindcss()),
  ],
  server: {
    host: true,
    port: 5180,
    strictPort: true,
    proxy: ibidiDemoImageProxy,
  },
  preview: {
    port: 5180,
    strictPort: true,
    proxy: ibidiDemoImageProxy,
  },
});

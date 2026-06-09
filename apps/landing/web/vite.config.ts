import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const brandPublicDir = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../assets/brand",
);

export default defineConfig({
  base: "/",
  publicDir: brandPublicDir,
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5180,
    strictPort: true,
    proxy: {
      "/aligner-demo": {
        target: "http://localhost:5175",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/aligner-demo\/?/, "/") || "/",
      },
      "/annotator-demo": {
        target: "http://localhost:5176",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/annotator-demo\/?/, "/") || "/",
      },
    },
  },
});

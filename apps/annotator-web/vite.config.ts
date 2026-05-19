import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const brandPublicDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../assets/brand");

export default defineConfig({
  publicDir: brandPublicDir,
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
  },
});

import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["../ui/test/browser-setup.ts"],
  },
});

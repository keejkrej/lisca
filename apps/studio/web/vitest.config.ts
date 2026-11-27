import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["../../../packages/ui/test/browser-setup.ts"],
    server: {
      deps: { inline: true },
    },
  },
});

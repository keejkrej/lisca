import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["./test/browser-setup.ts"],
  },
});

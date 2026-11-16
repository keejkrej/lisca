import solid from "vite-plugin-solid";
import { defineConfig } from "vite-plus";

export default defineConfig({
  // vite-plus resolves the solid-refresh virtual module as file:///@solid-refresh.
  plugins: [solid({ hot: false })],
  test: {
    environment: "jsdom",
    setupFiles: ["../../../packages/ui/test/browser-setup.ts"],
    server: {
      deps: { inline: true },
    },
  },
});

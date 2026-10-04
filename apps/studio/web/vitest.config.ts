import solid from "vite-plugin-solid";
import { defineConfig } from "vite-plus";

export default defineConfig({
  // vite-plus resolves the solid-refresh virtual module as file:///@solid-refresh.
  plugins: [solid({ hot: false })],
  test: {
    environment: "jsdom",
    server: {
      deps: { inline: true },
    },
  },
});

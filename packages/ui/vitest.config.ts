import solid from "vite-plugin-solid";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: "jsdom",
    server: {
      deps: {
        inline: [/phosphor-icons-solid/],
      },
    },
  },
});

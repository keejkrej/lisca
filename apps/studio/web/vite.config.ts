import { createLiscaViteConfig } from "@lisca/web-app/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default createLiscaViteConfig({
  port: 8767,
  plugins: [tanstackRouter({ target: "solid", autoCodeSplitting: true })],
});

import { createLiscaViteConfig } from "@lisca/web-app/vite";

export function createLiscaDemoViteConfig(options: { port: number }) {
  return createLiscaViteConfig({ port: options.port, base: "./" });
}

import { createLiscaViteConfig, type LiscaViteProduct } from "@lisca/web-app/vite";

export function createLiscaDemoViteConfig(options: { port: number; product: LiscaViteProduct }) {
  return createLiscaViteConfig({
    port: options.port,
    base: "./",
    product: options.product,
  });
}

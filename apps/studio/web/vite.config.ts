import { createLiscaViteConfig } from "@lisca/web-app/vite";
import type { UserConfig } from "vite";

const base = createLiscaViteConfig({ port: 5175 });

// Root workspace overrides pin react@19.1; studio's canary types import resolves here at build time.
export default {
  ...base,
  resolve: {
    ...base.resolve,
    alias: {
      ...(typeof base.resolve?.alias === "object" && !Array.isArray(base.resolve.alias)
        ? base.resolve.alias
        : {}),
      "react/canary": "react",
    },
  },
} satisfies UserConfig;

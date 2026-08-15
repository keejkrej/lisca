import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@lisca\/contracts$/,
        replacement: path.resolve(import.meta.dirname, "../contracts/src/index.ts"),
      },
      {
        find: /^@lisca\/analysis$/,
        replacement: path.resolve(import.meta.dirname, "../analysis/src/index.ts"),
      },
    ],
  },
});

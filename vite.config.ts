import * as path from "node:path";
import { defineConfig } from "vite-plus";

export default defineConfig({
  // Vitest configuration for workspace-level test runs.
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/target/**", "**/.deploy/**"],
    resolve: {
      alias: [
        {
          find: /^@lisca\/contracts$/,
          replacement: path.resolve(import.meta.dirname, "./packages/contracts/src/index.ts"),
        },
      ],
    },
  },

  // Oxlint configuration migrated from .oxlintrc.json.
  lint: {
    ignorePatterns: [
      "**/dist/**",
      "**/target/**",
      "**/node_modules/**",
      "**/coverage/**",
      "*.tsbuildinfo",
      "**/routeTree.gen.ts",
    ],
    plugins: ["eslint", "oxc", "unicorn", "typescript"],
    jsPlugins: ["oxlint-plugin-eslint", "./scripts/oxlint-plugin-lisca-boundaries.mjs"],
    categories: {
      correctness: "warn",
      suspicious: "warn",
      perf: "warn",
    },
    rules: {
      "import/extensions": [
        "error",
        {
          js: "never",
          jsx: "never",
          ts: "never",
          tsx: "never",
          ignorePackages: true,
        },
      ],
      "lisca-boundaries/imports": "error",
    },
    env: {
      builtin: true,
      browser: true,
    },
  },

  // Oxfmt configuration migrated from .oxfmtrc.json.
  fmt: {
    ignorePatterns: [
      "**/dist/**",
      "**/target/**",
      "**/coverage/**",
      "**/routeTree.gen.ts",
      "bun.lock",
    ],
    sortPackageJson: {},
  },
});

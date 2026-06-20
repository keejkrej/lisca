import * as path from "node:path";
import { defineConfig } from "vite-plus";

export default defineConfig({
  // Vitest configuration for workspace-level test runs.
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/target/**", "**/.turbo/**", "**/.deploy/**"],
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
      "**/.turbo/**",
      "**/node_modules/**",
      "**/coverage/**",
      "*.tsbuildinfo",
      "**/routeTree.gen.ts",
    ],
    plugins: ["eslint", "oxc", "react", "unicorn", "typescript"],
    jsPlugins: ["oxlint-plugin-eslint"],
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
      "react-in-jsx-scope": "off",
      "react/jsx-no-constructed-context-values": "off",
      "eslint-js/no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='useMemo']",
          message: "React Compiler handles memoization — do not use useMemo.",
        },
        {
          selector: "CallExpression[callee.name='useCallback']",
          message: "React Compiler handles memoization — do not use useCallback.",
        },
        {
          selector: "CallExpression[callee.name='memo']",
          message: "React Compiler handles memoization — do not use memo().",
        },
        {
          selector:
            "CallExpression[callee.object.name='React'][callee.property.name=/^(useMemo|useCallback|memo)$/]",
          message:
            "React Compiler handles memoization — do not use React.useMemo/useCallback/memo.",
        },
      ],
    },
    env: {
      builtin: true,
      browser: true,
    },
    settings: {
      react: {
        version: "19.1.0",
      },
    },
  },

  // Oxfmt configuration migrated from .oxfmtrc.json.
  fmt: {
    ignorePatterns: [
      "**/dist/**",
      "**/target/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/routeTree.gen.ts",
      "bun.lock",
    ],
    sortPackageJson: {},
  },
});

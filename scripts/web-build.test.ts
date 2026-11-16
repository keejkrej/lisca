import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vite-plus/test";

import { createLiscaViteConfig } from "../packages/web-app/vite";

const require = createRequire(import.meta.url);
const viteRequire = createRequire(require.resolve("vite/package.json"));

describe("production web chunks", () => {
  it("initializes shared state before modules consumed by both startup and lazy routes", async () => {
    const { rolldown } = await import(viteRequire.resolve("@voidzero-dev/vite-plus-core/rolldown"));
    const config = createLiscaViteConfig({ port: 0 });
    const output = config.build?.rolldownOptions?.output;
    const modules: Record<string, string> = {
      entry:
        'import "setup"; export { initialized } from "shared"; export const lazy = () => import("lazy");',
      setup: "globalThis.__liscaChunkState = { equals: (left, right) => left === right };",
      shared: "export const initialized = globalThis.__liscaChunkState.equals(1, 1);",
      lazy: 'export { initialized } from "shared";',
    };
    const directory = mkdtempSync(join(tmpdir(), "lisca-module-order-"));
    const bundle = await rolldown({
      input: "entry",
      plugins: [
        {
          name: "module-order-fixture",
          resolveId: (id: string) => (id in modules ? id : null),
          load: (id: string) => modules[id],
        },
      ],
    });
    try {
      await bundle.write({
        ...(Array.isArray(output) ? output[0] : output),
        dir: directory,
        format: "es",
        entryFileNames: "[name].mjs",
        chunkFileNames: "[name]-[hash].mjs",
      });
      const entry = pathToFileURL(join(directory, "entry.mjs")).href;
      const result = execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "--eval",
          `const entry = await import(${JSON.stringify(entry)}); console.log(entry.initialized, (await entry.lazy()).initialized);`,
        ],
        { encoding: "utf8" },
      );
      expect(result.trim()).toBe("true true");
    } finally {
      await bundle.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

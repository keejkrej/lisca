// @vitest-environment node
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vite-plus/test";

describe("Studio route development transforms", () => {
  it("splits page components without reading hot-reload bindings before initialization", async () => {
    const root = resolve(import.meta.dirname, "..");
    // A separate Node process keeps Vitest's dependency transforms out of Vite's plugins.
    const { stdout } = await promisify(execFile)(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `
      import { createServer } from "vite";
      import { resolve } from "node:path";
      const server = await createServer({
        configFile: resolve("vite.config.ts"),
        optimizeDeps: { noDiscovery: true, include: [], entries: [] },
        server: { port: 0, strictPort: false, open: false },
      });
      try {
        await server.listen();
        const results = [];
        for (const route of ["help-us", "onboarding"]) {
          const transformed = await server.transformRequest("/src/routes/" + route + ".tsx");
          results.push({ route,
            split: /component:\\s*lazyRouteComponent\\(/.test(transformed?.code ?? ""),
            warning: transformed?.code.includes("will not be code-split") ?? false,
          });
        }
        console.log("ROUTE_RESULTS=" + JSON.stringify(results));
      } finally {
        void server.close();
      }
      // The disposable process owns all dev-server sockets and watcher handles.
      process.exit(0);
    `,
      ],
      { cwd: root, timeout: 25_000 },
    );
    const resultLine = stdout.split("\n").find((line) => line.startsWith("ROUTE_RESULTS="));
    expect(resultLine).toBeDefined();
    expect(JSON.parse(resultLine!.slice("ROUTE_RESULTS=".length))).toEqual([
      { route: "help-us", split: true, warning: false },
      { route: "onboarding", split: true, warning: false },
    ]);
  }, 30_000);
});

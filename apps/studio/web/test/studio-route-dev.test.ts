// @vitest-environment node
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vite-plus/test";

describe("Studio route development transforms", () => {
  it("transforms Effect UI route modules cleanly without runtime or import errors", async () => {
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
        const routes = [
          { route: "help-us", exportName: "HelpUsPage" },
          { route: "onboarding", exportName: "OnboardingPage" },
        ];
        const results = [];
        for (const { route, exportName } of routes) {
          const transformed = await server.transformRequest("/src/routes/" + route + ".ts");
          const code = transformed?.code ?? "";
          results.push({
            route,
            transformed: code.length > 0,
            exportsPage: new RegExp("export\\\\s+const\\\\s+" + exportName + "\\\\b").test(code),
            hasSolidArtifacts: /solid-js|@tanstack\\/solid-router|will not be code-split/.test(code),
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
      { route: "help-us", transformed: true, exportsPage: true, hasSolidArtifacts: false },
      { route: "onboarding", transformed: true, exportsPage: true, hasSolidArtifacts: false },
    ]);
  }, 30_000);
});

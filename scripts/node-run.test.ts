import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runVpSync } from "./node-run.ts";

describe("runVpSync", () => {
  it("runs the local Vite+ entry point through Node", () => {
    const output = runVpSync(["--version"], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      capture: true,
    });

    expect(output).toMatch(/^vp v\d+\.\d+\.\d+/);
  });

  it("keeps package-manager shims out of Node child-process calls", () => {
    const scriptsRoot = fileURLToPath(new URL(".", import.meta.url));
    const offenders = globSync("*.ts", { cwd: scriptsRoot })
      .filter((path) => !path.endsWith(".test.ts"))
      .filter((path) =>
        /runSync\(\s*["']vp["']/.test(readFileSync(`${scriptsRoot}/${path}`, "utf8")),
      );

    expect(offenders).toEqual([]);
  });
});

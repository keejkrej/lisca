import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { cliLiscaTools, runCommand } from "../src/tools-cli.ts";

const tools = cliLiscaTools();
const fixtureTool = tools.find((tool) => tool.name === "cli_fixture_workspace")!;
const analyzeTool = tools.find((tool) => tool.name === "cli_analyze")!;
const cropTool = tools.find((tool) => tool.name === "cli_crop")!;

let tempRoots: string[] = [];

function tempRoot(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "lisca-mcp-cli-"));
  tempRoots.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempRoots) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempRoots = [];
});

function textOf(result: { content: { type: string; text?: string }[]; isError?: boolean }): string {
  const block = result.content.find((entry) => entry.type === "text");
  return (block as { text: string }).text;
}

describe("runCommand", () => {
  it("captures stdout, exit code, and duration", async () => {
    const result = await runCommand([process.execPath, "-e", "console.log('hi')"], {
      cwd: process.cwd(),
      timeoutMs: 10_000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("hi");
    expect(result.timedOut).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("kills the process on timeout", async () => {
    const result = await runCommand([process.execPath, "-e", "setTimeout(() => {}, 60000)"], {
      cwd: process.cwd(),
      timeoutMs: 300,
    });
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).not.toBe(0);
    expect(result.durationMs).toBeLessThan(10_000);
  });

  it("reports spawn errors for missing commands", async () => {
    const result = await runCommand(["lisca-definitely-not-a-binary"], {
      cwd: process.cwd(),
      timeoutMs: 5_000,
    });
    expect(result.exitCode).toBeNull();
    expect(result.stderr).toMatch(/spawn error/);
  });
});

describe("cli_analyze", () => {
  it("refuses to run without a workspace or a built binary", async () => {
    const missingWorkspace = await analyzeTool.handler({ command: "pipeline", workspace: "" });
    expect(missingWorkspace.isError).toBe(true);
  });
});

describe("cli_crop", () => {
  it("requires workspace and source", async () => {
    const result = await cropTool.handler({ workspace: "" });
    expect(result.isError).toBe(true);
  });
});

describe("cli_fixture_workspace", () => {
  it("materializes a fixture workspace end to end through pnpm", async () => {
    const out = path.join(tempRoot(), "fixture-ws");
    const result = await fixtureTool.handler({
      assay: "transfection",
      stage: "cropped",
      out,
    });
    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toMatch(/exit code 0/);
    const { existsSync, statSync } = await import("node:fs");
    expect(existsSync(path.join(out, "assay.json"))).toBe(true);
    expect(existsSync(path.join(out, "roi", "Pos1", "index.json"))).toBe(true);
    expect(statSync(out).isDirectory()).toBe(true);
  }, 180_000);

  it("rejects unknown assays through the fixture CLI", async () => {
    const result = await fixtureTool.handler({
      assay: "killing-engagement",
      stage: "source",
      out: path.join(tempRoot(), "nope"),
    });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/killing-engagement/);
  });
});

describe("fixture spawn uses the repo root", () => {
  it("runs pnpm run fixture:workspace from the monorepo", async () => {
    // The repo root is derived from this file's location, so the spawned pnpm
    // resolves the workspace script no matter where vitest was invoked from.
    const out = path.join(tempRoot(), "fixture-source");
    const result = await fixtureTool.handler({
      assay: "transfection",
      stage: "source",
      out,
    });
    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toContain("fixture:workspace");
  });
});

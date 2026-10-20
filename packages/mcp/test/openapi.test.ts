import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { contractTools, loadOpenApiDocument } from "../src/openapi.ts";
import { OPERATION_DESCRIPTIONS } from "../src/descriptions.ts";

const CONTRACTS_DIR = path.resolve(import.meta.dirname, "../../contracts");

let tempDirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "lisca-mcp-openapi-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

describe("contractTools", () => {
  it("turns every HttpApi operation into a tool", () => {
    const doc = loadOpenApiDocument(path.join(CONTRACTS_DIR, "openapi.json"));
    const tools = contractTools(doc);
    expect(tools.length).toBeGreaterThanOrEqual(46);
    expect(tools.map((tool) => tool.name)).toContain("align_scan_source");
    expect(tools.map((tool) => tool.name)).toContain("studio_start_analysis");
    expect(tools.map((tool) => tool.name)).toContain("fs_list_directory");
  });

  it("names tools after operationIds and keeps them unique", () => {
    const doc = loadOpenApiDocument(path.join(CONTRACTS_DIR, "openapi.json"));
    const names = contractTools(doc).map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("derefs schemas and drops $refs and allOf", () => {
    const doc = loadOpenApiDocument(path.join(CONTRACTS_DIR, "openapi.json"));
    const tools = contractTools(doc);
    const raw = JSON.stringify(tools);
    expect(raw).not.toContain('"$ref"');
    expect(raw).not.toContain("allOf");
  });

  it("merges query parameters and request body into one input schema", () => {
    const doc = loadOpenApiDocument(path.join(CONTRACTS_DIR, "openapi.json"));
    const tools = contractTools(doc);
    const scan = tools.find((tool) => tool.operationId === "align.scanSource");
    expect(scan?.method).toBe("POST");
    expect(scan?.path).toBe("/align/scan-source");
    expect(Object.keys(scan?.inputSchema.properties ?? {})).toEqual(["source", "product"]);
    expect(scan?.inputSchema.required).toEqual(["source"]);
    expect(scan?.queryNames).toEqual([]);

    const alignState = tools.find((tool) => tool.operationId === "align.loadAlignState");
    expect(alignState?.method).toBe("GET");
    expect(alignState?.queryNames).toEqual(["workspacePath", "pos"]);
    expect(Object.keys(alignState?.inputSchema.properties ?? {})).toEqual([
      "workspacePath",
      "pos",
      "product",
    ]);
    expect(alignState?.inputSchema.required).toEqual(["workspacePath", "pos"]);
  });

  it("offers a product selector only where multiple servers serve the route", () => {
    const doc = loadOpenApiDocument(path.join(CONTRACTS_DIR, "openapi.json"));
    const tools = contractTools(doc);
    const byId = new Map(tools.map((tool) => [tool.operationId, tool]));

    expect(byId.get("fs.listDirectory")?.products).toEqual(["aligner", "annotator", "studio"]);
    expect(byId.get("fs.listDirectory")?.inputSchema.properties.product?.enum).toEqual([
      "aligner",
      "annotator",
      "studio",
    ]);
    expect(byId.get("align.loadFrame")?.products).toEqual(["aligner", "studio"]);
    expect(byId.get("annotate.scanRoiWorkspace")?.products).toEqual(["annotator", "studio"]);
    expect(byId.get("align.cropRoi")?.products).toEqual(["studio"]);
    expect(byId.get("align.cropRoi")?.inputSchema.properties.product).toBeUndefined();
    expect(byId.get("tasks.listTasks")?.products).toEqual(["annotator", "studio"]);
    expect(byId.get("studio.startAnalysis")?.products).toEqual(["studio"]);
    expect(byId.get("memory.getRecentMemory")?.products).toEqual(["studio"]);
  });

  it("describes every operation in domain language", () => {
    const doc = loadOpenApiDocument(path.join(CONTRACTS_DIR, "openapi.json"));
    const tools = contractTools(doc);
    for (const tool of tools) {
      expect(OPERATION_DESCRIPTIONS[tool.operationId], tool.operationId).toBeDefined();
    }
    expect(Object.keys(OPERATION_DESCRIPTIONS).length).toBe(tools.length);
  });

  it("fails with a helpful message when the OpenAPI document is missing", () => {
    expect(() => loadOpenApiDocument(path.join(tempDir(), "openapi.json"))).toThrow(
      /openapi\.json/,
    );
  });
});

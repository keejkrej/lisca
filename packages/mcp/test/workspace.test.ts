import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { materializeFixture } from "@lisca/fixtures";
import { workspaceLiscaTools } from "../src/tools-workspace.ts";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const tools = workspaceLiscaTools();
const overview = tools.find((tool) => tool.name === "workspace_overview")!;
const readFile = tools.find((tool) => tool.name === "workspace_read_file")!;
const readPlot = tools.find((tool) => tool.name === "workspace_read_plot")!;

let tempRoots: string[] = [];

function tempRoot(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "lisca-mcp-workspace-"));
  tempRoots.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempRoots) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempRoots = [];
});

function resultJson(result: CallToolResult): any {
  expect(result.isError).toBeFalsy();
  const text = (result.content ?? []).find((block) => block.type === "text");
  return JSON.parse((text as { text: string }).text);
}

describe("workspace_overview", () => {
  it("summarizes a materialized analyzed workspace", async () => {
    const root = tempRoot();
    const workspace = path.join(root, "analyzed");
    materializeFixture({ assay: "transfection", stage: "analyzed", out: workspace });

    const report = resultJson(await overview.handler({ workspacePath: workspace }));
    expect(report.exists).toBe(true);
    expect(report.assayJson).toMatchObject({ type: "transfection" });
    expect(report.stages.alignedPositions).toEqual([1, 2]);
    expect(report.stages.croppedPositions).toEqual([1, 2]);
    expect(report.stages.annotationLabels).toBe(2);
    expect(report.stages.annotatedFrames).toBe(4);
    expect(report.stages.analysisPositions).toEqual([1, 2]);
    expect(report.stages.resultPlots.map((plot: { path: string }) => plot.path)).toEqual(
      expect.arrayContaining([expect.stringMatching(/(^|\/)auc\.png$/)]),
    );
  });

  it("reports a missing workspace without throwing", async () => {
    const report = resultJson(
      await overview.handler({ workspacePath: path.join(tempRoot(), "nope") }),
    );
    expect(report.exists).toBe(false);
  });
});

describe("workspace_read_file", () => {
  it("pretty-prints JSON", async () => {
    const root = tempRoot();
    const filePath = path.join(root, "assay.json");
    writeFileSync(filePath, '{"type":"transfection"}');
    const report = resultJson(await readFile.handler({ path: filePath }));
    expect(report.kind).toBe("json");
    expect(report.parsed).toEqual({ type: "transfection" });
  });

  it("parses CSV with quotes and caps rows", async () => {
    const root = tempRoot();
    const filePath = path.join(root, "table.csv");
    writeFileSync(
      filePath,
      ["position,roi,label", '1,2,"dead, late"', '2,3,"alive ""early"""'].join("\n") + "\n",
    );
    const report = resultJson(await readFile.handler({ path: filePath, maxRows: 1 }));
    expect(report.kind).toBe("csv");
    expect(report.columns).toEqual(["position", "roi", "label"]);
    expect(report.rows).toEqual([["1", "2", "dead, late"]]);
    expect(report.rowCount).toBe(2);
    expect(report.truncated).toBe(true);

    const full = resultJson(await readFile.handler({ path: filePath }));
    expect(full.rows[1]).toEqual(["2", "3", 'alive "early"']);
  });

  it("resolves workspace-relative paths", async () => {
    const root = tempRoot();
    const workspace = path.join(root, "w");
    const nested = path.join(workspace, "annotations", "labels.json");
    mkdirSync(path.dirname(nested), { recursive: true });
    writeFileSync(nested, '{"labels":[{"id":1}]}');
    const report = resultJson(
      await readFile.handler({ path: "annotations/labels.json", workspacePath: workspace }),
    );
    expect(report.parsed).toEqual({ labels: [{ id: 1 }] });
  });

  it("errors for missing files and non-JSON bodies", async () => {
    const missing = await readFile.handler({ path: path.join(tempRoot(), "gone.json") });
    expect(missing.isError).toBe(true);
    expect((missing.content[0] as { text: string }).text).toMatch(/No file/);
  });
});

describe("workspace_read_plot", () => {
  it("returns results figures as image blocks", async () => {
    const root = tempRoot();
    const workspace = path.join(root, "cropped");
    materializeFixture({ assay: "transfection", stage: "analyzed", out: workspace });
    const result = await readPlot.handler({ path: "results/auc.png", workspacePath: workspace });
    expect(result.isError).toBeFalsy();
    const image = (result.content ?? []).find((block) => block.type === "image");
    expect(image).toBeDefined();
  });

  it("rejects non-PNG files", async () => {
    const root = tempRoot();
    const filePath = path.join(root, "notes.txt");
    writeFileSync(filePath, "not a png");
    const result = await readPlot.handler({ path: filePath });
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toMatch(/not a PNG/);
  });
});

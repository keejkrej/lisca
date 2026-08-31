import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  KILLING_PLOTS,
  TRANSFECTION_AUC_CSV_COLUMNS,
  TRANSFECTION_FIT_CSV_COLUMNS,
  TRANSFECTION_PLOTS,
  TRANSFECTION_TRACE_CSV_COLUMNS,
} from "@lisca/analysis";
import {
  AssayJsonFileSchema,
  RoiIndexFileSchema,
  SavedAlignStateSchema,
  decodeJson,
} from "@lisca/contracts";
import { describe, expect, it } from "vitest";

import { parseFixtureArgs, runFixtureCli } from "../src/cli";
import {
  FIXTURE_ASSAYS,
  FIXTURE_LAYOUT,
  expectedKeyPaths,
  materializeFixture,
  sourceFileName,
  type FixtureAssay,
  type FixtureStage,
} from "../src/materialize";

function tempOut(label: string): string {
  return mkdtempSync(join(tmpdir(), `lisca-fixture-${label}-`));
}

function read(out: string, rel: string): string {
  return readFileSync(join(out, rel), "utf8");
}

function readBytes(out: string, rel: string): Buffer {
  return readFileSync(join(out, rel));
}

describe("parseFixtureArgs", () => {
  it("parses long flags and --force", () => {
    const parsed = parseFixtureArgs([
      "--assay",
      "killing",
      "--stage=aligned",
      "--out",
      "/tmp/ws",
      "--force",
    ]);
    expect(parsed).toEqual({
      ok: true,
      assay: "killing",
      stage: "aligned",
      out: "/tmp/ws",
      force: true,
    });
  });

  it("prints usage for --help", () => {
    const parsed = parseFixtureArgs(["--help"]);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.help).toBe(true);
  });
});

describe("workspace fixture smoke", () => {
  const cases: Array<[FixtureAssay, FixtureStage]> = [
    ["transfection", "source"],
    ["transfection", "aligned"],
    ["transfection", "analyzed"],
    ["killing", "source"],
    ["killing", "aligned"],
    ["killing", "analyzed"],
  ];

  it.each(cases)("writes %s %s key files", (assay, stage) => {
    const out = tempOut(`${assay}-${stage}`);
    const result = materializeFixture({ assay, stage, out, force: true });
    for (const rel of expectedKeyPaths(assay, stage)) {
      expect(existsSync(join(out, rel)), rel).toBe(true);
    }
    expect(result.files).toEqual(expect.arrayContaining(expectedKeyPaths(assay, stage)));
    expect(read(out, "FIXTURE.txt")).toContain("Sample fixture data");
  });

  it("writes a valid assay.json and alignment artifacts", () => {
    const out = tempOut("assay-shape");
    materializeFixture({ assay: "transfection", stage: "aligned", out, force: true });
    const assay = decodeJson(AssayJsonFileSchema, JSON.parse(read(out, "assay.json")));
    expect(assay.type).toBe("transfection");
    expect(assay.samples[0]?.positions).toBe("1:2");
    expect(assay.analysis?.channels?.signal).toEqual([FIXTURE_LAYOUT.signalChannel]);
    expect(read(out, "bbox/Pos1.csv").startsWith("roi,x,y,w,h")).toBe(true);
    decodeJson(SavedAlignStateSchema, JSON.parse(read(out, "align/Pos1.json")));
  });

  it("writes a cropped ROI index Studio/CLI can open", () => {
    const out = tempOut("cropped");
    materializeFixture({ assay: "killing", stage: "cropped", out, force: true });
    const index = decodeJson(RoiIndexFileSchema, JSON.parse(read(out, "roi/Pos1/index.json")));
    expect(index.axisOrder).toBe("TCZYX");
    expect(index.rois[0]?.fileName).toBe("Roi1.tif");
    const tiff = readBytes(out, "roi/Pos1/Roi1.tif");
    expect(tiff.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2a, 0x00]))).toBe(true);
    expect(existsSync(join(out, "results"))).toBe(false);
  });

  it("writes transfection analysis CSVs and every catalog PNG in the sidecar tree", () => {
    const out = tempOut("tf-analyzed");
    materializeFixture({ assay: "transfection", stage: "analyzed", out, force: true });
    const header = read(out, "analysis/Pos1/ch1.csv").split("\n")[0];
    expect(header).toBe(TRANSFECTION_TRACE_CSV_COLUMNS.join(","));
    expect(read(out, "analysis/Pos1/fit.csv").split("\n")[0]).toBe(
      TRANSFECTION_FIT_CSV_COLUMNS.join(","),
    );
    expect(
      read(out, "analysis/Pos1/auc.csv").startsWith(TRANSFECTION_AUC_CSV_COLUMNS.join(",")),
    ).toBe(true);
    expect(existsSync(join(out, "results/auc.csv"))).toBe(false);
    expect(existsSync(join(out, "timeseries"))).toBe(false);
    const sampleDir = "Mock_(fixture)";
    for (const plot of TRANSFECTION_PLOTS) {
      const rel =
        plot.scope === "sample"
          ? join("results", sampleDir, plot.fileName)
          : join("results", plot.fileName);
      const png = readBytes(out, rel);
      expect(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    }
    expect(existsSync(join(out, "results", "auc_log.png"))).toBe(false);
    expect(existsSync(join(out, "results", sampleDir, "area_summary.png"))).toBe(false);
  });

  it("writes killing analysis CSVs and every catalog PNG name", () => {
    const out = tempOut("kill-analyzed");
    materializeFixture({ assay: "killing", stage: "analyzed", out, force: true });
    expect(read(out, "timeseries/Pos1/ch1.csv").split("\n")[0]).toBe("roi,t,p_dead");
    expect(read(out, "results/kill_curve.csv").startsWith("t,n_alive,slide")).toBe(true);
    expect(read(out, "results/death_times.csv").startsWith("crop,death_time,pos,slide")).toBe(true);
    expect(read(out, "results/predictions.csv").startsWith("t,crop,p_dead,label,pos,slide")).toBe(
      true,
    );
    for (const plot of KILLING_PLOTS) {
      expect(existsSync(join(out, "results", plot.fileName))).toBe(true);
    }
  });

  it("refuses a non-empty out directory without --force", () => {
    const out = tempOut("no-force");
    materializeFixture({ assay: "transfection", stage: "source", out, force: true });
    expect(() => materializeFixture({ assay: "transfection", stage: "source", out })).toThrow(
      /--force/,
    );
  });

  it("source stage is a folder, not a workspace", () => {
    const out = tempOut("source-only");
    materializeFixture({ assay: "killing", stage: "source", out, force: true });
    expect(existsSync(join(out, "assay.json"))).toBe(false);
    expect(existsSync(join(out, "Pos1", sourceFileName(1, 0, 0, 0)))).toBe(true);
  });
});

describe("runFixtureCli", () => {
  it("materializes via argv and reports the file count", () => {
    const out = tempOut("cli");
    const lines: string[] = [];
    const code = runFixtureCli(
      ["--assay", "transfection", "--stage", "assay", "--out", out, "--force"],
      {
        log: (msg) => lines.push(msg),
        error: (msg) => lines.push(msg),
      },
    );
    expect(code).toBe(0);
    expect(lines.join("\n")).toContain("transfection assay fixture");
    expect(existsSync(join(out, "assay.json"))).toBe(true);
  });
});

describe("fixture catalogs", () => {
  it("covers both shipping assays", () => {
    expect(FIXTURE_ASSAYS).toEqual(["transfection", "killing"]);
  });
});

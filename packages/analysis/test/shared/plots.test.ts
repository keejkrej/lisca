import { describe, expect, it } from "vitest";
import {
  collectResultPlots,
  defaultResultPlotSection,
  filterResultPlotsBySection,
  inferResultAssayKind,
  resultSectionInstruction,
  resultSectionLabel,
  sampleFolderFromResultPath,
} from "../../src/shared/plots";

describe("inferResultAssayKind", () => {
  it("detects killing from kill-curve PNGs", () => {
    expect(inferResultAssayKind([{ fileName: "kill_curve.png", path: "" }])).toBe("killing");
    expect(inferResultAssayKind([{ fileName: "death_times.csv", path: "" }])).toBe("killing");
  });

  it("detects transfection from AUC or fit plot artifacts", () => {
    expect(inferResultAssayKind([{ fileName: "auc.png", path: "" }])).toBe("transfection");
    expect(inferResultAssayKind([{ fileName: "traces_fit.png", path: "" }])).toBe("transfection");
  });

  it("does not treat analysis CSVs as transfection markers", () => {
    expect(inferResultAssayKind([{ fileName: "auc.csv", path: "/analysis/Pos1/auc.csv" }])).toBe(
      "unknown",
    );
    expect(inferResultAssayKind([{ fileName: "fit.csv", path: "/analysis/Pos1/fit.csv" }])).toBe(
      "unknown",
    );
  });
});

describe("sampleFolderFromResultPath", () => {
  it("reads the sample folder under results/", () => {
    expect(sampleFolderFromResultPath("/ws/results/A431_aiLNP/traces.png")).toBe("A431_aiLNP");
    expect(sampleFolderFromResultPath("results/Mock_(fixture)/area.png")).toBe("Mock_(fixture)");
  });

  it("returns undefined for workspace-level plots", () => {
    expect(sampleFolderFromResultPath("/ws/results/auc.png")).toBeUndefined();
    expect(sampleFolderFromResultPath("/onset_time.png")).toBeUndefined();
  });
});

describe("collectResultPlots", () => {
  it("orders transfection plots from the catalog and skips CSVs", () => {
    const plots = collectResultPlots(
      [
        { kind: "timeseries", fileName: "Pos1/ch1.csv", path: "/analysis/Pos1/ch1.csv" },
        { kind: "plot", fileName: "onset_time.png", path: "/results/onset_time.png" },
        { kind: "plot", fileName: "traces.png", path: "/results/Mock_(fixture)/traces.png" },
        { kind: "plot", fileName: "auc.png", path: "/results/auc.png" },
        { kind: "analysis", fileName: "auc.csv", path: "/analysis/Pos1/auc.csv" },
      ],
      "transfection",
    );
    expect(plots.map((plot) => plot.fileName)).toEqual(["traces.png", "auc.png", "onset_time.png"]);
    expect(plots.map((plot) => plot.path)).toEqual([
      "/results/Mock_(fixture)/traces.png",
      "/results/auc.png",
      "/results/onset_time.png",
    ]);
    expect(plots[0]?.title).toBe("Intensity traces (Mock_(fixture))");
    expect(plots[0]?.section).toBe("timeseries");
    expect(plots[1]?.title).toBe("AUC");
    expect(plots[1]?.section).toBe("parameters");
  });

  it("lists every per-sample PNG by path instead of collapsing on fileName", () => {
    const plots = collectResultPlots(
      [
        {
          kind: "plot",
          fileName: "traces.png",
          path: "/results/A431_aiLNP/traces.png",
        },
        {
          kind: "plot",
          fileName: "traces.png",
          path: "/results/Mock/traces.png",
        },
        { kind: "plot", fileName: "auc.png", path: "/results/auc.png" },
      ],
      "transfection",
    );
    expect(plots.map((plot) => plot.path)).toEqual([
      "/results/A431_aiLNP/traces.png",
      "/results/Mock/traces.png",
      "/results/auc.png",
    ]);
    expect(plots.map((plot) => plot.title)).toEqual([
      "Intensity traces (A431_aiLNP)",
      "Intensity traces (Mock)",
      "AUC",
    ]);
  });

  it("titles the expression-rate scatters from the catalog next to each other", () => {
    const plots = collectResultPlots(
      [
        {
          kind: "plot",
          fileName: "expression_rate_vs_mrna_lifetime.png",
          path: "/results/A431_aiLNP/expression_rate_vs_mrna_lifetime.png",
        },
        {
          kind: "plot",
          fileName: "expression_rate_vs_onset_time.png",
          path: "/results/A431_aiLNP/expression_rate_vs_onset_time.png",
        },
        { kind: "plot", fileName: "onset_time.png", path: "/results/onset_time.png" },
      ],
      "transfection",
    );
    expect(plots.map((plot) => plot.fileName)).toEqual([
      "onset_time.png",
      "expression_rate_vs_onset_time.png",
      "expression_rate_vs_mrna_lifetime.png",
    ]);
    expect(plots[1]?.title).toBe("Expression rate m0 k_TL vs onset time t0 (A431_aiLNP)");
    expect(plots[1]?.section).toBe("parameters");
    expect(plots[2]?.title).toBe("Expression rate m0 k_TL vs mRNA lifetime τ_mRNA (A431_aiLNP)");
    expect(plots[2]?.section).toBe("parameters");
  });

  it("uses killing titles for shared filenames", () => {
    const plots = collectResultPlots(
      [
        { kind: "plot", fileName: "traces.png", path: "/traces.png" },
        { kind: "plot", fileName: "kill_curve.png", path: "/kill_curve.png" },
      ],
      "killing",
    );
    expect(plots[0]?.title).toBe("P(dead) traces");
    expect(plots[1]?.title).toBe("N(alive)");
    expect(plots[1]?.section).toBe("parameters");
  });

  it("keeps unknown PNGs after catalog entries", () => {
    const plots = collectResultPlots(
      [
        { kind: "plot", fileName: "custom.png", path: "/custom.png" },
        { kind: "plot", fileName: "traces.png", path: "/traces.png" },
      ],
      "transfection",
    );
    expect(plots.map((plot) => plot.fileName)).toEqual(["traces.png", "custom.png"]);
    expect(plots[1]?.title).toBe("custom");
  });
});

describe("result sections", () => {
  it("labels Survival for killing parameters", () => {
    expect(resultSectionLabel("parameters", "killing")).toBe("Survival");
    expect(resultSectionLabel("parameters", "transfection")).toBe("Parameters");
  });

  it("defaults to Timeseries when traces exist", () => {
    const plots = collectResultPlots(
      [
        { kind: "plot", fileName: "traces.png", path: "/traces.png" },
        { kind: "plot", fileName: "auc.png", path: "/auc.png" },
      ],
      "transfection",
    );
    expect(defaultResultPlotSection(plots)).toBe("timeseries");
    expect(filterResultPlotsBySection(plots, "parameters")).toHaveLength(1);
  });
});

describe("resultSectionInstruction", () => {
  it("uses scientist-facing copy without pipeline jargon", () => {
    expect(resultSectionInstruction("timeseries", "transfection")).toBe(
      "Intensity, area, and fitted traces for each sample.",
    );
    expect(resultSectionInstruction("parameters", "transfection")).toBe(
      "Fitted parameters: mRNA lifetime τ_mRNA, AUC, expression rate m0 k_TL, and onset time t0.",
    );
    expect(resultSectionInstruction("parameters", "killing")).toBe(
      "Survival curve and death-time distributions.",
    );
  });
});

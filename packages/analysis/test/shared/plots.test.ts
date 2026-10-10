import { describe, expect, it } from "vite-plus/test";
import {
  collectResultPlots,
  defaultResultPlotSection,
  filterResultPlotsBySection,
  groupResultPlots,
  inferResultAssayKind,
  resultSectionInstruction,
  resultGridColumns,
  resultSectionLabel,
  sampleFolderFromResultPath,
} from "../../src/shared/plots";

describe("inferResultAssayKind", () => {
  it("detects killing from kill-curve PNGs", () => {
    expect(inferResultAssayKind([{ fileName: "kill_curve.png", path: "" }])).toBe(
      "killing-death-reporter",
    );
    expect(inferResultAssayKind([{ fileName: "death_times.csv", path: "" }])).toBe(
      "killing-death-reporter",
    );
  });

  it("detects transfection from AUC or fit plot artifacts", () => {
    expect(inferResultAssayKind([{ fileName: "auc.png", path: "" }])).toBe("transfection");
    expect(inferResultAssayKind([{ fileName: "traces_fit.png", path: "" }])).toBe("transfection");
  });

  it("detects engagement from its own figures", () => {
    expect(
      inferResultAssayKind([
        {
          fileName: "engagement_traces_summary.png",
          path: "/results/engagement_traces_summary.png",
        },
      ]),
    ).toBe("killing-engagement");
    const plots = collectResultPlots(
      [
        { kind: "plot", fileName: "engagement_traces.png", path: "/results/engagement_traces.png" },
        {
          kind: "plot",
          fileName: "engagement_traces_summary_shared_y.png",
          path: "/results/engagement_traces_summary_shared_y.png",
        },
        { kind: "plot", fileName: "traces.png", path: "/results/traces.png" },
      ],
      "killing-engagement",
    );
    expect(plots.map((plot) => plot.fileName).slice(0, 2)).toEqual([
      "engagement_traces.png",
      "engagement_traces_summary_shared_y.png",
    ]);
    expect(plots[0]?.section).toBe("traces");
    expect(plots[1]?.section).toBe("parameters");
    expect(resultSectionLabel("parameters", "killing-engagement")).toBe("Compare");
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
        { kind: "traces", fileName: "Pos1/ch1.csv", path: "/analysis/Pos1/ch1.csv" },
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
    expect(plots[0]?.section).toBe("traces");
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
        { kind: "plot", fileName: "traces_summary.png", path: "/traces_summary.png" },
      ],
      "killing-death-reporter",
    );
    expect(plots[0]?.title).toBe("Fluorescence traces");
    expect(plots[1]?.title).toBe("Mean fluorescence");
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
  it("labels Compare for killing sample means", () => {
    expect(resultSectionLabel("parameters", "killing-death-reporter")).toBe("Compare");
    expect(resultSectionLabel("parameters", "transfection")).toBe("Parameters");
  });

  it("defaults to Traces when traces exist", () => {
    const plots = collectResultPlots(
      [
        { kind: "plot", fileName: "traces.png", path: "/traces.png" },
        { kind: "plot", fileName: "auc.png", path: "/auc.png" },
      ],
      "transfection",
    );
    expect(defaultResultPlotSection(plots)).toBe("traces");
    expect(filterResultPlotsBySection(plots, "parameters")).toHaveLength(1);
  });
});

describe("resultSectionInstruction", () => {
  it("uses scientist-facing copy without pipeline jargon", () => {
    expect(resultSectionInstruction("traces", "transfection")).toBe(
      "Intensity, area, and fitted traces for each sample.",
    );
    expect(resultSectionInstruction("parameters", "transfection")).toBe(
      "Fitted parameters: mRNA lifetime τ_mRNA, AUC, expression rate m0 k_TL, and onset time t0.",
    );
    expect(resultSectionInstruction("parameters", "killing-death-reporter")).toBe(
      "Mean fluorescence for each sample.",
    );
  });
});

describe("groupResultPlots", () => {
  it("groups per-sample plots by kind and workspace plots together", () => {
    const files = [
      { fileName: "auc.png", path: "/w/results/auc.png" },
      { fileName: "onset_time.png", path: "/w/results/onset_time.png" },
      { fileName: "traces.png", path: "/w/results/B/traces.png" },
      { fileName: "traces.png", path: "/w/results/A/traces.png" },
      { fileName: "area.png", path: "/w/results/A/area.png" },
    ];
    const groups = groupResultPlots(collectResultPlots(files, "transfection"));

    expect(groups.map((group) => [group.title, group.labels])).toEqual([
      ["Intensity traces", ["A", "B"]],
      ["Mask area", ["A"]],
      ["All samples", ["AUC", "Onset time t0"]],
    ]);
  });
});

describe("resultGridColumns", () => {
  it("uses ceil(sqrt(n)) columns", () => {
    expect([1, 2, 4, 5, 6, 9, 10].map(resultGridColumns)).toEqual([1, 2, 2, 3, 3, 3, 4]);
    expect(resultGridColumns(0)).toBe(1);
  });
});

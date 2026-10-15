import { describe, expect, it } from "vite-plus/test";
import { BINDING_PLOTS } from "../../src/assays/binding/catalog";
import { ENGAGEMENT_PLOTS, KILLING_PLOTS } from "../../src/assays/killing/catalog";
import { TRANSFECTION_PLOTS } from "../../src/assays/transfection/catalog";
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
  visibleResultPlotSections,
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
    expect(plots[1]?.section).toBe("traces-summary");
    expect(resultSectionLabel("traces-summary")).toBe("Traces summary");
  });

  it("detects lnp-binding from binding figures and CSVs", () => {
    expect(
      inferResultAssayKind([
        {
          fileName: "binding_particles.png",
          path: "/results/LNP_1/binding_particles.png",
        },
      ]),
    ).toBe("lnp-binding");
    expect(
      inferResultAssayKind([
        {
          fileName: "particles.csv",
          path: "/analysis/Pos0/particles.csv",
        },
      ]),
    ).toBe("lnp-binding");
    const plots = collectResultPlots(
      BINDING_PLOTS.map((plot) => ({
        kind: "plot" as const,
        fileName: plot.fileName,
        path: `/results/Sample/${plot.fileName}`,
      })),
      "lnp-binding",
    );
    expect(visibleResultPlotSections(plots)).toEqual(["traces", "traces-summary"]);
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
    expect(plots[1]?.section).toBe("auc");
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
    expect(plots[1]?.section).toBe("parameters-comparison");
    expect(plots[2]?.title).toBe("Expression rate m0 k_TL vs mRNA lifetime τ_mRNA (A431_aiLNP)");
    expect(plots[2]?.section).toBe("parameters-comparison");
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
    expect(plots[1]?.section).toBe("traces-summary");
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
  it("labels each view", () => {
    expect(resultSectionLabel("traces")).toBe("Traces");
    expect(resultSectionLabel("traces-summary")).toBe("Traces summary");
    expect(resultSectionLabel("traces-fit")).toBe("Traces fit");
    expect(resultSectionLabel("auc")).toBe("AUC");
    expect(resultSectionLabel("parameters")).toBe("Parameters");
    expect(resultSectionLabel("parameters-comparison")).toBe("Parameters comparison");
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
    expect(filterResultPlotsBySection(plots, "auc")).toHaveLength(1);
    expect(visibleResultPlotSections(plots)).toEqual(["traces", "auc"]);
  });

  it("keeps killing on traces and traces summary", () => {
    const plots = collectResultPlots(
      KILLING_PLOTS.map((plot) => ({
        kind: "plot" as const,
        fileName: plot.fileName,
        path: `/results/Control/${plot.fileName}`,
      })),
      "killing-death-reporter",
    );
    expect(plots.map((plot) => [plot.fileName, plot.section])).toEqual([
      ["traces.png", "traces"],
      ["traces_shared_y.png", "traces"],
      ["traces_summary.png", "traces-summary"],
      ["traces_summary_shared_y.png", "traces-summary"],
    ]);
    expect(visibleResultPlotSections(plots)).toEqual(["traces", "traces-summary"]);
  });

  it("keeps engagement on traces and traces summary", () => {
    const plots = collectResultPlots(
      ENGAGEMENT_PLOTS.map((plot) => ({
        kind: "plot" as const,
        fileName: plot.fileName,
        path: `/results/Sample/${plot.fileName}`,
      })),
      "killing-engagement",
    );
    expect(visibleResultPlotSections(plots)).toEqual(["traces", "traces-summary"]);
    expect(filterResultPlotsBySection(plots, "traces").map((plot) => plot.fileName)).toEqual([
      "engagement_traces.png",
      "engagement_traces_shared_y.png",
    ]);
    expect(
      filterResultPlotsBySection(plots, "traces-summary").map((plot) => plot.fileName),
    ).toEqual(["engagement_traces_summary.png", "engagement_traces_summary_shared_y.png"]);
  });

  it("splits transfection into traces, summary, area, fit, auc, parameters, and comparison", () => {
    const plots = collectResultPlots(
      TRANSFECTION_PLOTS.map((plot) => ({
        kind: "plot" as const,
        fileName: plot.fileName,
        path:
          plot.scope === "workspace"
            ? `/results/${plot.fileName}`
            : `/results/Sample/${plot.fileName}`,
      })),
      "transfection",
    );
    expect(plots.map((plot) => [plot.fileName, plot.section])).toEqual([
      ["traces.png", "traces"],
      ["traces_shared_y.png", "traces"],
      ["traces_summary.png", "traces-summary"],
      ["traces_summary_shared_y.png", "traces-summary"],
      ["area.png", "area"],
      ["area_shared_y.png", "area"],
      ["traces_fit.png", "traces-fit"],
      ["traces_fit_shared_y.png", "traces-fit"],
      ["mrna_lifetime.png", "parameters"],
      ["auc.png", "auc"],
      ["expression_rate.png", "parameters"],
      ["onset_time.png", "parameters"],
      ["baseline_intensity.png", "parameters"],
      ["protein_lifetime.png", "parameters"],
      ["expression_rate_vs_onset_time.png", "parameters-comparison"],
      ["expression_rate_vs_mrna_lifetime.png", "parameters-comparison"],
    ]);
    expect(visibleResultPlotSections(plots)).toEqual([
      "traces",
      "traces-summary",
      "area",
      "traces-fit",
      "auc",
      "parameters",
      "parameters-comparison",
    ]);
  });
});

describe("resultSectionInstruction", () => {
  it("uses scientist-facing copy without pipeline jargon", () => {
    expect(resultSectionInstruction("traces", "transfection")).toBe(
      "Intensity for each cell. Shared y uses one scale across samples.",
    );
    expect(resultSectionInstruction("traces-summary", "killing-death-reporter")).toBe(
      "Mean, median, and interquartile range of fluorescence for each sample.",
    );
    expect(resultSectionInstruction("parameters", "transfection")).toBe(
      "Onset time t0, expression rate m0 k_TL, mRNA lifetime τ_mRNA, protein lifetime τ_EGFP, and baseline intensity for every sample.",
    );
    expect(resultSectionInstruction("auc", "transfection")).toBe(
      "Area under the curve for every sample.",
    );
    expect(resultSectionInstruction("parameters-comparison", "transfection")).toBe(
      "Expression rate m0 k_TL against onset time t0 and against mRNA lifetime τ_mRNA.",
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

    expect(groups.map((group) => [group.title, group.labels, group.layout])).toEqual([
      ["Intensity traces", ["A", "B"], "sample"],
      ["Mask area", ["A"], "sample"],
      ["All samples", ["AUC", "Onset time t0"], "workspace"],
    ]);
  });

  it("caps five per-sample traces at two columns", () => {
    const plots = collectResultPlots(
      ["A", "B", "C", "D", "E"].map((sample) => ({
        kind: "plot" as const,
        fileName: "traces.png",
        path: `/w/results/${sample}/traces.png`,
      })),
      "killing-death-reporter",
    );
    const [group] = groupResultPlots(plots);
    expect(group?.layout).toBe("sample");
    expect(resultGridColumns(group?.plots.length ?? 0, group?.layout)).toBe(2);
  });

  it("stacks workspace plots that already contain every sample", () => {
    const plots = collectResultPlots(
      ["auc.png", "onset_time.png", "expression_rate.png"].map((fileName) => ({
        kind: "plot" as const,
        fileName,
        path: `/w/results/${fileName}`,
      })),
      "transfection",
    );
    const [group] = groupResultPlots(plots);
    expect(group?.layout).toBe("workspace");
    expect(group?.labels).toEqual(["AUC", "Expression rate m0 k_TL", "Onset time t0"]);
    expect(resultGridColumns(group?.plots.length ?? 0, group?.layout)).toBe(1);
  });
});

describe("resultGridColumns", () => {
  it("uses two columns for per-sample plots and one for all-sample plots", () => {
    expect([0, 1, 2, 5, 9].map((count) => resultGridColumns(count, "sample"))).toEqual([
      1, 1, 2, 2, 2,
    ]);
    expect(resultGridColumns(5, "workspace")).toBe(1);
    expect(resultGridColumns(0)).toBe(1);
  });
});

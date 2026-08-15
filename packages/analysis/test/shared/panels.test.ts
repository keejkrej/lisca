import { describe, expect, it } from "vitest";
import {
  collectSummaryPanels,
  collectTimeseriesPanels,
  inferResultAssayKind,
  parseCsvFile,
  parsePanelGroups,
  resultPlotSection,
  resultSectionLabel,
} from "../../src/shared/panels";

const labels = { 0: "Mock", 1: "GFP" };

function parsed(fileName: string, csv: string, kind = "results") {
  const file = parseCsvFile({ kind, fileName, path: `/${fileName}`, csv });
  expect(file).not.toBeNull();
  return file!;
}

describe("parsePanelGroups", () => {
  it("reads Rust slide columns for AUC boxplots", () => {
    const file = parsed(
      "auc.csv",
      ["slide,pos,roi,auc", "0,1,1,1200", "0,1,2,1500", "1,3,1,8000", "1,3,2,9100"].join("\n"),
    );
    const panels = parsePanelGroups(file, 10, labels);
    expect(panels).toHaveLength(1);
    expect(panels[0]?.kind).toBe("boxplot");
    if (panels[0]?.kind !== "boxplot") return;
    expect(panels[0].yAxisLabel).toBe("AUC");
    expect(panels[0].groups.map((group) => group.slideChannel)).toEqual([0, 1]);
    expect(panels[0].groups[0]?.label).toBe("Mock (n=2)");
  });

  it("reads legacy slide_channel columns", () => {
    const file = parsed(
      "auc.csv",
      ["slide_channel,pos,roi,auc", "0,1,1,1200", "1,3,1,8000"].join("\n"),
    );
    const panels = parsePanelGroups(file, 10, labels);
    expect(panels[0]?.kind).toBe("boxplot");
    if (panels[0]?.kind !== "boxplot") return;
    expect(panels[0].groups).toHaveLength(2);
  });

  it("infers pos from PosN/chN.csv when the timeseries has no pos column", () => {
    const file = parsed(
      "Pos2/ch1.csv",
      ["roi,t,area,background,sum,corrected", "1,0,80,10,900,100", "1,1,80,10,980,180"].join("\n"),
      "timeseries",
    );
    const panels = parsePanelGroups(file, 10, labels);
    const traces = panels.filter((panel) => panel.kind === "timeseries");
    expect(traces).toHaveLength(2);
    if (traces[0]?.kind !== "timeseries") return;
    expect(traces[0].traces[0]?.label).toBe("Pos2 ROI 1");
    expect(traces[0].traces[0]?.points).toEqual([
      { x: 0, y: 100 },
      { x: 10, y: 180 },
    ]);
  });

  it("overlays kill curves for every sample on one panel", () => {
    const file = parsed(
      "kill_curve.csv",
      ["t,n_alive,slide", "0,10,0", "1,9,0", "0,12,1", "1,6,1"].join("\n"),
    );
    const panels = parsePanelGroups(file, 15, { 0: "Control", 1: "CAR-T" });
    expect(panels).toHaveLength(1);
    expect(panels[0]?.kind).toBe("generic");
    if (panels[0]?.kind !== "generic") return;
    expect(panels[0].title).toBe("N(alive)");
    expect(panels[0].series.map((entry) => entry.label)).toEqual(["Control", "CAR-T"]);
    expect(panels[0].series[0]?.points[1]).toEqual({ x: 15, y: 9 });
  });

  it("builds death-time histograms with crop counts, not timepoint counts", () => {
    const file = parsed(
      "death_times.csv",
      ["crop,death_time,pos,slide", "1,4,1,0", "2,0,1,0", "3,8,1,0", "1,3,3,1"].join("\n"),
    );
    const panels = parsePanelGroups(file, 15, { 0: "Control", 1: "CAR-T" });
    expect(panels).toHaveLength(2);
    expect(panels[0]?.kind).toBe("histogram");
    if (panels[0]?.kind !== "histogram") return;
    expect(panels[0].title).toBe("T_death · Control (n=2)");
    expect(panels[0].values).toEqual([60, 120]);
  });

  it("sets log scale on expression-rate boxplots", () => {
    const file = parsed(
      "fit.csv",
      [
        "slide,pos,roi,baseline_intensity,protein_decay_rate,protein_lifetime,mrna_decay_rate,mrna_lifetime,onset_time,expression_amplitude,expression_rate,success",
        "0,1,1,90,0.001,800,0.005,200,20,10000,40,true",
        "1,3,1,95,0.001,800,0.005,200,15,2000,8,true",
      ].join("\n"),
    );
    const panels = parsePanelGroups(file, 10, labels);
    const rate = panels.find(
      (panel) => panel.kind === "boxplot" && panel.yAxisLabel === "expression rate",
    );
    expect(rate?.kind).toBe("boxplot");
    if (rate?.kind !== "boxplot") return;
    expect(rate.yScale).toBe("log");
  });
});

describe("result sections", () => {
  it("keeps traces on Timeseries and summary plots on Parameters/Survival", () => {
    expect(
      resultPlotSection({ kind: "timeseries", fileName: "Pos1/ch1.csv", path: "", csv: "" }),
    ).toBe("timeseries");
    expect(
      resultPlotSection({ kind: "results", fileName: "kill_curve.csv", path: "", csv: "" }),
    ).toBe("parameters");
    expect(resultPlotSection({ kind: "results", fileName: "auc.csv", path: "", csv: "" })).toBe(
      "parameters",
    );
    expect(resultSectionLabel("parameters", "killing")).toBe("Survival");
    expect(resultSectionLabel("parameters", "transfection")).toBe("Parameters");
    expect(
      inferResultAssayKind([{ kind: "results", fileName: "kill_curve.csv", path: "", csv: "" }]),
    ).toBe("killing");
  });

  it("collects traces separately from kill-curve and death-time summaries", () => {
    const timeseries = {
      kind: "timeseries" as const,
      title: "Pos1",
      fileName: "Pos1/ch1.csv",
      path: "",
      xAxisLabel: "minutes",
      yAxisLabel: "P(dead)",
      traces: [{ key: "a", label: "a", points: [{ x: 0, y: 0.1 }] }],
    };
    const kill = {
      kind: "generic" as const,
      title: "N(alive)",
      fileName: "kill_curve.csv",
      path: "",
      xAxisLabel: "minutes",
      yAxisLabel: "N(alive)",
      series: [{ dataKey: "s0", label: "Control", points: [{ x: 0, y: 10 }] }],
    };
    const death = {
      kind: "histogram" as const,
      title: "T_death",
      fileName: "death_times.csv",
      path: "",
      xAxisLabel: "minutes",
      yAxisLabel: "n crops",
      values: [10, 20, 40],
    };
    expect(collectTimeseriesPanels([[timeseries, kill, death]])).toEqual([timeseries]);
    const summary = collectSummaryPanels([[kill, death]]);
    expect(summary[0]).toMatchObject({ title: "N(alive)" });
    expect(summary[1]).toMatchObject({ kind: "histogram", xDomain: [0, 40] });
  });
});

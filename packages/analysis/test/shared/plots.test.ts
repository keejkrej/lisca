import { describe, expect, it } from "vitest";
import {
  collectResultPlots,
  defaultResultPlotSection,
  filterResultPlotsBySection,
  inferResultAssayKind,
  resultSectionLabel,
} from "../../src/shared/plots";

describe("inferResultAssayKind", () => {
  it("detects killing from kill-curve PNGs", () => {
    expect(inferResultAssayKind([{ fileName: "kill_curve.png", path: "" }])).toBe("killing");
    expect(inferResultAssayKind([{ fileName: "death_times.csv", path: "" }])).toBe("killing");
  });

  it("detects transfection from AUC or fit artifacts", () => {
    expect(inferResultAssayKind([{ fileName: "auc.png", path: "" }])).toBe("transfection");
    expect(inferResultAssayKind([{ fileName: "fit.csv", path: "" }])).toBe("transfection");
  });
});

describe("collectResultPlots", () => {
  it("orders transfection plots from the catalog and skips CSVs", () => {
    const plots = collectResultPlots(
      [
        { kind: "timeseries", fileName: "Pos1/ch1.csv", path: "/ts.csv" },
        { kind: "plot", fileName: "onset_time.png", path: "/onset_time.png" },
        { kind: "plot", fileName: "traces.png", path: "/traces.png" },
        { kind: "plot", fileName: "auc.png", path: "/auc.png" },
        { kind: "results", fileName: "auc.csv", path: "/auc.csv" },
      ],
      "transfection",
    );
    expect(plots.map((plot) => plot.fileName)).toEqual([
      "traces.png",
      "auc.png",
      "onset_time.png",
    ]);
    expect(plots[0]?.title).toBe("Intensity traces");
    expect(plots[0]?.section).toBe("timeseries");
    expect(plots[1]?.section).toBe("parameters");
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

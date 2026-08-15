import { describe, expect, it } from "vitest";
import type { ResultPanel } from "../../src/shared/panels";
import { chartSpecForPanel, countChartSpecs } from "../../src/charts/index";

const timeseriesPanel: ResultPanel = {
  kind: "timeseries",
  title: "Trace",
  fileName: "timeseries.csv",
  path: "/timeseries.csv",
  xAxisLabel: "Time (min)",
  yAxisLabel: "Intensity",
  traces: [
    {
      key: "roi-1",
      label: "ROI 1",
      points: [
        { x: 0, y: 1 },
        { x: 1, y: 2 },
      ],
    },
    {
      key: "roi-2",
      label: "ROI 2",
      points: [
        { x: 0, y: 3 },
        { x: 1, y: 4 },
      ],
    },
  ],
};

describe("chartSpecForPanel", () => {
  it("builds a timeseries spec with a median trace", () => {
    const spec = chartSpecForPanel(timeseriesPanel);
    expect(spec?.kind).toBe("timeseries");
    if (spec?.kind !== "timeseries") return;
    expect(spec.traces).toHaveLength(2);
    expect(spec.medianTrace).toEqual([
      { x: 0, y: 2 },
      { x: 1, y: 3 },
    ]);
  });

  it("returns null for empty panels", () => {
    expect(
      chartSpecForPanel({
        ...timeseriesPanel,
        traces: [],
      }),
    ).toBeNull();
  });

  it("counts renderable panels", () => {
    expect(
      countChartSpecs([
        timeseriesPanel,
        {
          ...timeseriesPanel,
          traces: [],
        },
      ]),
    ).toBe(1);
  });
});

describe("metric-aware chart specs", () => {
  it("pins P(dead) to 0–1 and uses a linear tick format", () => {
    const spec = chartSpecForPanel({
      ...timeseriesPanel,
      yAxisLabel: "P(dead)",
    });
    expect(spec?.kind).toBe("timeseries");
    if (spec?.kind !== "timeseries") return;
    expect(spec.y.numericDomain).toEqual([0, 1]);
    expect(spec.y.tickFormat).toBe(".2f");
  });

  it("uses a log y-scale for expression rate", () => {
    const spec = chartSpecForPanel({
      kind: "boxplot",
      title: "expression rate",
      fileName: "fit.csv",
      path: "/fit.csv",
      xAxisLabel: "sample",
      yAxisLabel: "expression rate",
      yScale: "log",
      groups: [
        {
          slideChannel: 0,
          label: "Mock (n=2)",
          values: [4, 8],
          stats: { min: 4, q1: 5, median: 6, q3: 7, max: 8 },
        },
      ],
    });
    expect(spec?.kind).toBe("boxplot");
    if (spec?.kind !== "boxplot") return;
    expect(spec.y.type).toBe("log");
  });

  it("overlays kill-curve series with a legend and a zero baseline", () => {
    const spec = chartSpecForPanel({
      kind: "generic",
      title: "N(alive)",
      fileName: "kill_curve.csv",
      path: "/kill_curve.csv",
      xAxisLabel: "minutes",
      yAxisLabel: "N(alive)",
      series: [
        {
          dataKey: "s0",
          label: "Control",
          points: [
            { x: 0, y: 10 },
            { x: 15, y: 8 },
          ],
        },
        {
          dataKey: "s1",
          label: "CAR-T",
          points: [
            { x: 0, y: 12 },
            { x: 15, y: 3 },
          ],
        },
      ],
    });
    expect(spec?.kind).toBe("line");
    if (spec?.kind !== "line") return;
    expect(spec.legend).toBe(true);
    expect(spec.y.numericDomain?.[0]).toBe(0);
    expect(spec.y.tickFormat).toBe("d");
  });
});

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

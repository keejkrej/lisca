import { describe, expect, it } from "vitest";
import {
  boxPlotToVictoryRows,
  histogramToVictoryRows,
  seriesToVictoryRows,
} from "../../src/charts/chart-data";

describe("chart-data", () => {
  it("pivots line series into victory rows", () => {
    const { data, yKeys } = seriesToVictoryRows([
      {
        key: "a",
        points: [
          { x: 0, y: 1 },
          { x: 1, y: 2 },
        ],
      },
      {
        key: "b",
        points: [
          { x: 0, y: 3 },
          { x: 1, y: 4 },
        ],
      },
    ]);
    expect(yKeys).toEqual(["a", "b"]);
    expect(data).toEqual([
      { x: 0, a: 1, b: 3 },
      { x: 1, a: 2, b: 4 },
    ]);
  });

  it("maps histogram bins to bar rows", () => {
    expect(histogramToVictoryRows([{ x0: 0, x1: 2, count: 5 }])).toEqual([{ x: 1, count: 5 }]);
  });

  it("maps box plot groups to indexed rows", () => {
    expect(
      boxPlotToVictoryRows([
        {
          label: "ch1",
          stats: { min: 1, q1: 2, median: 3, q3: 4, max: 5 },
        },
      ]),
    ).toEqual([
      {
        x: 0,
        label: "ch1",
        min: 1,
        q1: 2,
        median: 3,
        q3: 4,
        max: 5,
      },
    ]);
  });
});

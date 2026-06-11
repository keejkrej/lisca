import type { ChartPoint, LineSeriesSpec } from "./spec";

export function seriesToVictoryRows(series: LineSeriesSpec[]): {
  data: Array<Record<string, number>>;
  yKeys: string[];
} {
  const xValues = new Set<number>();
  for (const entry of series) {
    for (const point of entry.points) {
      xValues.add(point.x);
    }
  }
  const xs = [...xValues].toSorted((left, right) => left - right);
  const yKeys = series.map((entry) => entry.key);
  const data = xs.map((x) => {
    const row: Record<string, number> = { x };
    for (const entry of series) {
      const point = entry.points.find((candidate) => candidate.x === x);
      if (point) row[entry.key] = point.y;
    }
    return row;
  });
  return { data, yKeys };
}

export function withMedianYKey(
  rows: Array<Record<string, number>>,
  yKeys: string[],
  medianTrace: ChartPoint[],
  medianKey = "__median__",
): {
  data: Array<Record<string, number>>;
  yKeys: string[];
  medianKey: string;
} {
  const medianByX = new Map(medianTrace.map((point) => [point.x, point.y]));
  return {
    data: rows.map((row) => ({
      ...row,
      [medianKey]: medianByX.get(row.x) ?? Number.NaN,
    })),
    yKeys: [...yKeys, medianKey],
    medianKey,
  };
}

export function histogramToVictoryRows(bins: Array<{ x0: number; x1: number; count: number }>) {
  return bins.map((bucket) => ({
    x: (bucket.x0 + bucket.x1) / 2,
    count: bucket.count,
  }));
}

export function boxPlotToVictoryRows(
  groups: Array<{
    label: string;
    stats: {
      min: number;
      q1: number;
      median: number;
      q3: number;
      max: number;
    };
  }>,
) {
  return groups.map((group, index) => ({
    x: index,
    label: group.label,
    min: group.stats.min,
    q1: group.stats.q1,
    median: group.stats.median,
    q3: group.stats.q3,
    max: group.stats.max,
  }));
}

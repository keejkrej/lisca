import type { ChartPoint } from "./spec";

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].toSorted((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function computeMedianTrace(
  traces: Array<{
    points: ChartPoint[];
  }>,
): ChartPoint[] {
  const valuesByX = new Map<number, number[]>();
  for (const trace of traces) {
    for (const point of trace.points) {
      const bucket = valuesByX.get(point.x) ?? [];
      bucket.push(point.y);
      valuesByX.set(point.x, bucket);
    }
  }
  return Array.from(valuesByX.entries())
    .toSorted(([left], [right]) => left - right)
    .map(([x, values]) => ({
      x,
      y: median(values),
    }));
}

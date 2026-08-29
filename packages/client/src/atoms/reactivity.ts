import { Reactivity } from "effect/unstable/reactivity";
import type { Effect } from "effect";

/** Run an effect and invalidate related query atoms on success. */
export function invalidateAfter<A, E, R>(
  effect: Effect.Effect<A, E, R>,
  keys: ReadonlyArray<unknown>,
): Effect.Effect<A, E, R | Reactivity.Reactivity> {
  return Reactivity.mutation(effect, keys);
}

/** Stable string keys — tuple keys hash by reference and break invalidation. */
export const ReactivityKeys = {
  scanSource: (key: string) => `scan-source:${key}`,
  roiWorkspace: (path: string) => `roi-workspace:${path}`,
  annotationLabels: (path: string) => `annotation-labels:${path}`,
  analysisResults: (path: string) => `analysis-results:${path}`,
  analysisCsv: (path: string, filePath: string) => `analysis-csv:${path}:${filePath}`,
  analysisPanels: (path: string, filePath: string, scale: number, labelsKey: string) =>
    `analysis-panels:${path}:${filePath}:${scale}:${labelsKey}`,
} as const;

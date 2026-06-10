import type { AutoExcludePreviewResponse } from "@lisca/contracts";

export type VariationExcludePreviewInput = {
  preview: AutoExcludePreviewResponse;
  threshold: number;
};

export function formatVariationScore(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : "0.000";
}

export function clampVariationThreshold(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function deriveVariationExcludeMetrics(preview: AutoExcludePreviewResponse) {
  const min = preview.scoreMin;
  const max = preview.scoreMax > preview.scoreMin ? preview.scoreMax : preview.scoreMin + 1;
  const step = Math.max((max - min) / 500, 0.001);
  const maxBinCount = Math.max(1, ...preview.histogramBins.map((bin) => bin.count));
  return { min, max, step, maxBinCount };
}

export function countVariationExcludedCells(
  preview: AutoExcludePreviewResponse,
  threshold: number,
): number {
  return preview.cellScores.filter((cell) => cell.score <= threshold).length;
}

export function isVariationBinActive(binEnd: number, threshold: number): boolean {
  return binEnd <= threshold;
}

export function deriveVariationExcludePreview(
  input: VariationExcludePreviewInput | null,
): {
  preview: AutoExcludePreviewResponse;
  threshold: number;
  selectedCount: number;
  metrics: ReturnType<typeof deriveVariationExcludeMetrics>;
} | null {
  if (!input) return null;
  const metrics = deriveVariationExcludeMetrics(input.preview);
  const threshold = clampVariationThreshold(input.threshold, metrics.min, metrics.max);
  return {
    preview: input.preview,
    threshold,
    selectedCount: countVariationExcludedCells(input.preview, threshold),
    metrics,
  };
}

export function nextVariationExcludeThreshold(
  input: VariationExcludePreviewInput | null,
  value: number,
): number | null {
  const derived = deriveVariationExcludePreview(input);
  if (!derived) return null;
  return clampVariationThreshold(value, derived.metrics.min, derived.metrics.max);
}

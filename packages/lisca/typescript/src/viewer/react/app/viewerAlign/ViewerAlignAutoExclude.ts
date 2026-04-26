import type {
  AutoExcludePreviewCellScore,
  AutoExcludePreviewResponse,
} from "lisca/shared/contracts";
import { clamp } from "lisca/shared/core";

export interface AutoExcludeDomain {
  min: number;
  max: number;
}

export interface AutoExcludeHistogramDatum {
  x: number;
  start: number;
  end: number;
  count: number;
}

export const AUTO_EXCLUDE_CHART_MARGIN = {
  top: 12,
  right: 10,
  bottom: 6,
  left: 0,
} as const;

export const AUTO_EXCLUDE_Y_AXIS_WIDTH = 40;
export const AUTO_EXCLUDE_X_AXIS_HEIGHT = 24;

export function scoreDomainForPreview(preview: AutoExcludePreviewResponse | null): AutoExcludeDomain {
  const min = preview?.scoreMin ?? 0;
  const max = preview?.scoreMax ?? 1;
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 };
  }
  if (max <= min) {
    return { min, max: min + 1 };
  }
  return { min, max };
}

export function clampThresholdToDomain(value: number, domain: AutoExcludeDomain): number {
  return clamp(value, domain.min, domain.max);
}

export function formatScore(value: number): string {
  if (!Number.isFinite(value)) return "0.000";
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  if (Math.abs(value) >= 100) return value.toFixed(1);
  return value.toFixed(3);
}

export function autoExcludeCount(cellScores: AutoExcludePreviewCellScore[], threshold: number): number {
  return cellScores.filter((cell) => cell.score <= threshold).length;
}

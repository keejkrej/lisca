import type { AlignGridState } from "@lisca/contracts";

import { alignGridBasis, enumerateVisibleAlignGridCells } from "./align-grid";
import { computeFrameLayout, type FrameLayout } from "./frame-display";
import type { FrameResult } from "./frame";

export const ALIGN_GRID_OVERLAY_FRAME_HALO_PADDING = 8;

export const alignGridOverlayColors = {
  includedRgb: "68, 151, 255",
  excludedRgb: "244, 63, 94",
  origin: "rgba(255,255,255,0.9)",
  spacingA: "rgba(249,115,22,0.95)",
  spacingB: "rgba(34,197,94,0.95)",
  frameHaloFill: "rgba(255,255,255,0.03)",
  frameHaloStroke: "rgba(255,255,255,0.08)",
} as const;

export type AlignGridOverlayCell = {
  i: number;
  j: number;
  x: number;
  y: number;
  w: number;
  h: number;
  excluded: boolean;
};

export type AlignGridOverlayPoint = {
  x: number;
  y: number;
};

export type AlignGridOverlayRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type AlignGridOverlayScene = {
  frameLayout: FrameLayout;
  haloRect: AlignGridOverlayRect;
  clipRect: AlignGridOverlayRect;
  cells: AlignGridOverlayCell[];
  origin: AlignGridOverlayPoint;
  spacingA: { start: AlignGridOverlayPoint; end: AlignGridOverlayPoint };
  spacingB: { start: AlignGridOverlayPoint; end: AlignGridOverlayPoint };
  fillOpacity: number;
  strokeOpacity: number;
};

export function alignGridOverlayFillOpacity(grid: AlignGridState): number {
  return grid.opacity * 0.55;
}

export function alignGridOverlayStrokeOpacity(grid: AlignGridState): number {
  return Math.max(0.45, grid.opacity * 0.9);
}

export function alignGridOverlayCellRgba(excluded: boolean, opacity: number): string {
  const rgb = excluded ? alignGridOverlayColors.excludedRgb : alignGridOverlayColors.includedRgb;
  return `rgba(${rgb}, ${opacity})`;
}

export function buildAlignFrameHaloRect(frameLayout: FrameLayout): AlignGridOverlayRect {
  const pad = ALIGN_GRID_OVERLAY_FRAME_HALO_PADDING;
  return {
    x: frameLayout.drawX - pad,
    y: frameLayout.drawY - pad,
    w: frameLayout.drawWidth + pad * 2,
    h: frameLayout.drawHeight + pad * 2,
  };
}

export function buildAlignGridOverlayScene(
  frame: FrameResult,
  grid: AlignGridState,
  viewportWidth: number,
  viewportHeight: number,
  excludedKeys: ReadonlySet<string> = new Set(),
  resolvedFrameLayout?: FrameLayout,
): AlignGridOverlayScene | null {
  if (!grid.enabled) {
    return null;
  }

  const frameLayout =
    resolvedFrameLayout ??
    computeFrameLayout(viewportWidth, viewportHeight, frame.width, frame.height);
  const { drawX, drawY, scale } = frameLayout;
  const originX = drawX + (frame.width / 2 + grid.tx) * scale;
  const originY = drawY + (frame.height / 2 + grid.ty) * scale;
  const basis = alignGridBasis(grid.shape, grid.rotation, grid.spacingA, grid.spacingB);
  const scaledA = {
    x: basis.a.x * scale,
    y: basis.a.y * scale,
  };
  const scaledB = {
    x: basis.b.x * scale,
    y: basis.b.y * scale,
  };
  const origin = { x: originX, y: originY };
  const cells = enumerateVisibleAlignGridCells(frame, grid).map((cell) => ({
    i: cell.i,
    j: cell.j,
    x: drawX + cell.x * scale,
    y: drawY + cell.y * scale,
    w: cell.w * scale,
    h: cell.h * scale,
    excluded: excludedKeys.has(`${cell.i}:${cell.j}`),
  }));

  return {
    frameLayout,
    haloRect: buildAlignFrameHaloRect(frameLayout),
    clipRect: {
      x: frameLayout.drawX,
      y: frameLayout.drawY,
      w: frameLayout.drawWidth,
      h: frameLayout.drawHeight,
    },
    cells,
    origin,
    spacingA: {
      start: origin,
      end: { x: originX + scaledA.x, y: originY + scaledA.y },
    },
    spacingB: {
      start: origin,
      end: { x: originX + scaledB.x, y: originY + scaledB.y },
    },
    fillOpacity: alignGridOverlayFillOpacity(grid),
    strokeOpacity: alignGridOverlayStrokeOpacity(grid),
  };
}

import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import { enumerateVisibleAlignGridCells } from "./align-grid";
import type { FrameResult } from "./frame";

export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export type MaskPoint = {
  x: number;
  y: number;
};

export function createEmptyMask(width: number, height: number) {
  return new Uint8Array(width * height);
}

export function masksEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

export function maskHasPixels(mask: Uint8Array) {
  return mask.some((value) => value !== 0);
}

export function labelColorStyle(label: { color: string }, selected: boolean) {
  const rgb = hexToRgb(label.color);
  if (!rgb) return undefined;
  return {
    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${selected ? 0.95 : 0.35})`,
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${selected ? 0.18 : 0.1})`,
    color: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
  };
}

export function hexToRgb(color: string): RgbColor | null {
  const value = color.trim();
  if (!value.startsWith("#")) return null;
  const hex = value.slice(1);
  if (hex.length === 3) {
    const [r, g, b] = hex.split("");
    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
    };
  }
  if (hex.length === 6) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    };
  }
  return null;
}

export function fillPolygon(
  mask: Uint8Array,
  width: number,
  height: number,
  points: MaskPoint[],
  value: number,
) {
  if (points.length < 3) return mask.slice();
  const next = mask.slice();
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(...ys)));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) {
        next[y * width + x] = value;
      }
    }
  }
  return next;
}

export function strokeMask(
  mask: Uint8Array,
  width: number,
  height: number,
  points: MaskPoint[],
  value: number,
  radius = 4,
) {
  if (points.length === 0) return mask.slice();
  const next = mask.slice();
  const r = Math.max(1, Math.round(radius));

  const paintDisk = (cx: number, cy: number) => {
    const minX = Math.max(0, Math.floor(cx - r));
    const maxX = Math.min(width - 1, Math.ceil(cx + r));
    const minY = Math.max(0, Math.floor(cy - r));
    const maxY = Math.min(height - 1, Math.ceil(cy + r));
    const radiusSq = r * r;
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= radiusSq) next[y * width + x] = value;
      }
    }
  };

  paintDisk(points[0]!.x, points[0]!.y);
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]!;
    const to = points[index]!;
    const distance = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
    const steps = Math.ceil(distance / Math.max(1, r / 2));
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      paintDisk(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    }
  }
  return next;
}

function pointInPolygon(x: number, y: number, points: MaskPoint[]) {
  let inside = false;
  for (
    let index = 0, previousIndex = points.length - 1;
    index < points.length;
    previousIndex = index, index += 1
  ) {
    const a = points[index]!;
    const b = points[previousIndex]!;
    const intersects = a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function buildBboxCsv(
  frame: FrameResult,
  grid: AlignGridState,
  excludedCells: readonly AlignGridCellCoord[],
): string {
  const excluded = new Set(excludedCells.map((cell) => `${cell.i}:${cell.j}`));
  const rows = enumerateVisibleAlignGridCells(frame, grid)
    .filter((cell) => !excluded.has(`${cell.i}:${cell.j}`))
    .map((cell, roi) => [roi, cell.x, cell.y, cell.w, cell.h, cell.i, cell.j].join(","));
  return ["roi,x,y,w,h,i,j", ...rows].join("\n");
}


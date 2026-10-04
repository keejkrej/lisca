import type {
  AlignDrift,
  AlignGridPatternBox,
  AlignGridPatternCoord,
  AlignGridShape,
  AlignGridState,
  SavedAlignState,
} from "@lisca/contracts";
import {
  adjustAlignDriftTranslation,
  normalizeAlignDrift,
  type AlignDriftInput,
} from "./align-drift";
import { clamp } from "./frame";

export type AlignGridFrameBounds = {
  width: number;
  height: number;
};

export type AlignGridWheelGestureInput = {
  deltaMode: number;
  deltaX: number;
  deltaY: number;
  ctrlKey: boolean;
  shiftKey: boolean;
};

export type AlignGridWheelViewport = {
  displayWidth: number;
  displayHeight: number;
  modelWidth: number;
  modelHeight: number;
  /** Exact rendered frame scale when the canvas uses an ephemeral view transform. */
  scale?: number;
};

export type AlignGridMousePointerInput = {
  pointerType: string;
  button: number;
};

export type AlignGridPointerGestureInput = AlignGridMousePointerInput & {
  pointerId: number;
  clientX: number;
  clientY: number;
};

export type AlignGridPointerIntent = "offset" | "rotation" | "spacing" | "size" | "spacing-size";
export type AlignGridWheelIntent = "ignore" | "size";
export type AlignGridToolMode = "pan" | "rotate" | "zoom-spacing" | "zoom-pattern" | "magnifier";

export type AlignGridPointerGestureSession = {
  pointerId: number;
  intent: AlignGridPointerIntent;
  startClientX: number;
  startClientY: number;
  startGrid: AlignGridState;
};

export type ExcludedAlignGridPatternsByPosition = Record<number, AlignGridPatternCoord[]>;

export const MAX_ALIGN_GRID_RECTS = 8000;
const LINE_DELTA_PX = 16;
const PAGE_DELTA_PX = 320;
const EXP_SCALE_FACTOR = 0.0015;
const GRID_BOUNDS_EPSILON = 1e-6;

/** Offset is a pixel delta. Other intents must not store the on-screen translation. */
export function applyDisplayedAlignGridCommit(
  grid: AlignGridState,
  drift: AlignDrift | null,
  time: number,
  preview: AlignGridState,
  intent: AlignGridPointerIntent,
  startGrid: AlignGridState,
): { grid: AlignGridState; drift: AlignDrift | null } {
  if (intent === "offset") {
    return adjustAlignDriftTranslation(
      grid,
      drift,
      time,
      preview.tx - startGrid.tx,
      preview.ty - startGrid.ty,
    );
  }
  return {
    grid: normalizeAlignGridState({
      ...grid,
      rotation: preview.rotation,
      spacingA: preview.spacingA,
      spacingB: preview.spacingB,
      patternWidth: preview.patternWidth,
      patternHeight: preview.patternHeight,
    }),
    drift,
  };
}

export function alignStateFromCurrent(
  grid: AlignGridState,
  currentExcludedPatterns: AlignGridPatternCoord[],
  drift?: AlignDriftInput | null,
  assayDefaultTime?: number | null,
): SavedAlignState {
  const saved: SavedAlignState = {
    grid,
    excludedPatterns: currentExcludedPatterns,
  };
  if (drift == null) return saved;
  const keyframes = drift.keyframes ?? [];
  if (keyframes.length === 0 && drift.referenceTime == null) return saved;
  const normalized = normalizeAlignDrift(drift);
  if (normalized == null) return saved;
  if (
    normalized.keyframes.length === 0 &&
    typeof assayDefaultTime === "number" &&
    normalized.referenceTime === assayDefaultTime
  ) {
    return saved;
  }
  return { ...saved, drift: normalized };
}

export function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

export function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function normalizeRadians(value: number): number {
  const normalized =
    ((((value + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
  return Number.isFinite(normalized) ? normalized : 0;
}

export function createDefaultAlignGrid(): AlignGridState {
  return {
    enabled: false,
    shape: "rect",
    tx: 0,
    ty: 0,
    rotation: 0,
    spacingA: 160,
    spacingB: 160,
    patternWidth: 128,
    patternHeight: 128,
    opacity: 0.35,
  };
}

function normalizeAlignGridShape(shape: AlignGridShape | undefined): AlignGridShape {
  if (shape == null) return "rect";
  if (shape === "square") return "rect";
  return shape;
}

export function normalizeAlignGridState(input?: Partial<AlignGridState>): AlignGridState {
  const base = createDefaultAlignGrid();
  if (!input) return base;
  const patternWidth = Math.max(1, input.patternWidth ?? base.patternWidth);
  const patternHeight = Math.max(1, input.patternHeight ?? base.patternHeight);

  return {
    enabled: input.enabled ?? base.enabled,
    shape: normalizeAlignGridShape(input.shape ?? base.shape),
    tx: input.tx ?? base.tx,
    ty: input.ty ?? base.ty,
    rotation: normalizeRadians(input.rotation ?? base.rotation),
    // Pitch stays independent of pattern size so overlapping patterns do not
    // drag spacing along when the frame is already covered.
    spacingA: Math.max(1, input.spacingA ?? base.spacingA),
    spacingB: Math.max(1, input.spacingB ?? base.spacingB),
    patternWidth,
    patternHeight,
    opacity: clamp(input.opacity ?? base.opacity, 0, 1),
  };
}

export function alignGridBasis(
  shape: AlignGridShape,
  rotation: number,
  spacingA: number,
  spacingB: number,
) {
  const isRect = shape === "rect" || shape === "square";
  const secondAngle = rotation + (isRect ? Math.PI / 2 : Math.PI / 3);
  return {
    a: {
      x: Math.cos(rotation) * spacingA,
      y: Math.sin(rotation) * spacingA,
    },
    b: {
      x: Math.cos(secondAngle) * spacingB,
      y: Math.sin(secondAngle) * spacingB,
    },
  };
}

export function estimateAlignGridDraw(
  width: number,
  height: number,
  spacingA: number,
  spacingB: number,
  _maxRects = MAX_ALIGN_GRID_RECTS,
) {
  const minSpacing = Math.max(1, Math.min(spacingA, spacingB));
  const estimatedColumns = Math.ceil(width / minSpacing) + 3;
  const estimatedRows = Math.ceil(height / minSpacing) + 3;
  const range = Math.max(estimatedColumns, estimatedRows);
  const estimated = estimatedColumns * estimatedRows;

  return {
    range,
    estimated,
    stride: 1,
    capped: false,
  };
}

function resolveVisibleAlignGridIndexBounds(frame: AlignGridFrameBounds, grid: AlignGridState) {
  const basis = alignGridBasis(grid.shape, grid.rotation, grid.spacingA, grid.spacingB);
  const originX = frame.width / 2 + grid.tx;
  const originY = frame.height / 2 + grid.ty;
  const halfWidth = grid.patternWidth / 2;
  const halfHeight = grid.patternHeight / 2;
  const determinant = basis.a.x * basis.b.y - basis.a.y * basis.b.x;

  if (Math.abs(determinant) <= GRID_BOUNDS_EPSILON) {
    const drawStats = estimateAlignGridDraw(
      frame.width,
      frame.height,
      grid.spacingA,
      grid.spacingB,
    );
    return {
      basis,
      originX,
      originY,
      halfWidth,
      halfHeight,
      iMin: -drawStats.range,
      iMax: drawStats.range,
      jMin: -drawStats.range,
      jMax: drawStats.range,
    };
  }

  const corners = [
    { x: -halfWidth, y: -halfHeight },
    { x: frame.width + halfWidth, y: -halfHeight },
    { x: -halfWidth, y: frame.height + halfHeight },
    { x: frame.width + halfWidth, y: frame.height + halfHeight },
  ];
  let iMin = Number.POSITIVE_INFINITY;
  let iMax = Number.NEGATIVE_INFINITY;
  let jMin = Number.POSITIVE_INFINITY;
  let jMax = Number.NEGATIVE_INFINITY;

  for (const corner of corners) {
    const dx = corner.x - originX;
    const dy = corner.y - originY;
    const i = (dx * basis.b.y - dy * basis.b.x) / determinant;
    const j = (dy * basis.a.x - dx * basis.a.y) / determinant;
    iMin = Math.min(iMin, i);
    iMax = Math.max(iMax, i);
    jMin = Math.min(jMin, j);
    jMax = Math.max(jMax, j);
  }

  return {
    basis,
    originX,
    originY,
    halfWidth,
    halfHeight,
    iMin: Math.floor(iMin - GRID_BOUNDS_EPSILON),
    iMax: Math.ceil(iMax + GRID_BOUNDS_EPSILON),
    jMin: Math.floor(jMin - GRID_BOUNDS_EPSILON),
    jMax: Math.ceil(jMax + GRID_BOUNDS_EPSILON),
  };
}

export function alignGridPatternCoordKey(pattern: AlignGridPatternCoord): string {
  return `${pattern.i}:${pattern.j}`;
}

function compareAlignGridPatternCoords(
  left: AlignGridPatternCoord,
  right: AlignGridPatternCoord,
): number {
  if (left.i !== right.i) return left.i - right.i;
  return left.j - right.j;
}

function toSortedUniqueAlignGridPatterns(
  patterns: Iterable<AlignGridPatternCoord>,
): AlignGridPatternCoord[] {
  const unique = new Map<string, AlignGridPatternCoord>();
  for (const pattern of patterns) {
    unique.set(alignGridPatternCoordKey(pattern), { i: pattern.i, j: pattern.j });
  }
  return Array.from(unique.values()).toSorted(compareAlignGridPatternCoords);
}

export function enumerateVisibleAlignGridPatterns(
  frame: AlignGridFrameBounds,
  grid: AlignGridState,
): AlignGridPatternBox[] {
  const { basis, originX, originY, halfWidth, halfHeight, iMin, iMax, jMin, jMax } =
    resolveVisibleAlignGridIndexBounds(frame, grid);
  const patterns: AlignGridPatternBox[] = [];
  const rawWidth = Math.max(1, Math.round(grid.patternWidth));
  const rawHeight = Math.max(1, Math.round(grid.patternHeight));

  for (let i = iMin; i <= iMax; i += 1) {
    for (let j = jMin; j <= jMax; j += 1) {
      const centerX = originX + i * basis.a.x + j * basis.b.x;
      const centerY = originY + i * basis.a.y + j * basis.b.y;
      const rawX = Math.round(centerX - halfWidth);
      const rawY = Math.round(centerY - halfHeight);
      const clippedX = clamp(rawX, 0, frame.width);
      const clippedY = clamp(rawY, 0, frame.height);
      const clippedRight = clamp(rawX + rawWidth, 0, frame.width);
      const clippedBottom = clamp(rawY + rawHeight, 0, frame.height);
      const w = clippedRight - clippedX;
      const h = clippedBottom - clippedY;

      if (w <= 0 || h <= 0) continue;

      patterns.push({
        i,
        j,
        x: clippedX,
        y: clippedY,
        w,
        h,
      });
    }
  }

  return patterns;
}

export function findAlignGridPatternAtPoint(
  frame: AlignGridFrameBounds,
  grid: AlignGridState,
  x: number,
  y: number,
): AlignGridPatternBox | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const patterns = enumerateVisibleAlignGridPatterns(frame, grid);
  for (let index = patterns.length - 1; index >= 0; index -= 1) {
    const pattern = patterns[index];
    if (
      pattern &&
      x >= pattern.x &&
      x <= pattern.x + pattern.w &&
      y >= pattern.y &&
      y <= pattern.y + pattern.h
    ) {
      return pattern;
    }
  }

  return null;
}

export function collectAlignGridStrokeTogglePatterns(
  frame: AlignGridFrameBounds,
  grid: AlignGridState,
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
  alreadyToggledPatterns?: Iterable<AlignGridPatternCoord>,
): AlignGridPatternCoord[] {
  const sampleDistance = Math.max(4, Math.min(grid.patternWidth, grid.patternHeight) / 4);
  const distance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
  const steps = Math.max(1, Math.ceil(distance / sampleDistance));
  const skippedPatterns = new Set(
    Array.from(alreadyToggledPatterns ?? [], alignGridPatternCoordKey),
  );
  const hitPatterns = new Map<string, AlignGridPatternCoord>();

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = startPoint.x + (endPoint.x - startPoint.x) * t;
    const y = startPoint.y + (endPoint.y - startPoint.y) * t;
    const pattern = findAlignGridPatternAtPoint(frame, grid, x, y);
    if (!pattern) continue;
    const key = alignGridPatternCoordKey(pattern);
    if (!skippedPatterns.has(key)) {
      hitPatterns.set(key, { i: pattern.i, j: pattern.j });
    }
  }

  return Array.from(hitPatterns.values()).toSorted(compareAlignGridPatternCoords);
}

export function countVisibleAlignGridPatterns(
  frame: AlignGridFrameBounds,
  grid: AlignGridState,
  excludedPatterns?: Iterable<AlignGridPatternCoord>,
): { included: number; excluded: number } {
  const excluded = excludedPatterns
    ? new Set(Array.from(excludedPatterns, alignGridPatternCoordKey))
    : new Set<string>();
  const patterns = enumerateVisibleAlignGridPatterns(frame, grid);
  const excludedCount = patterns.filter((pattern) =>
    excluded.has(alignGridPatternCoordKey(pattern)),
  ).length;
  return {
    included: patterns.length - excludedCount,
    excluded: excludedCount,
  };
}

export function collectAlignGridEdgePatterns(
  frame: AlignGridFrameBounds,
  grid: AlignGridState,
): AlignGridPatternCoord[] {
  const targetArea =
    Math.max(1, Math.round(grid.patternWidth)) * Math.max(1, Math.round(grid.patternHeight));
  const edgeAreaThreshold = targetArea * 0.8;
  return enumerateVisibleAlignGridPatterns(frame, grid)
    .filter(
      (pattern) =>
        (pattern.x <= 0 ||
          pattern.y <= 0 ||
          pattern.x + pattern.w >= frame.width ||
          pattern.y + pattern.h >= frame.height) &&
        pattern.w * pattern.h < edgeAreaThreshold,
    )
    .map((pattern) => ({ i: pattern.i, j: pattern.j }))
    .toSorted(compareAlignGridPatternCoords);
}

export function isAlignGridMousePointerInput(input: AlignGridMousePointerInput): boolean {
  return input.pointerType === "mouse";
}

export function isPrimaryAlignGridMouseButton(input: AlignGridMousePointerInput): boolean {
  return isAlignGridMousePointerInput(input) && input.button === 0;
}

export function isPrimaryAlignGridPointerButton(input: AlignGridMousePointerInput): boolean {
  return input.button === 0;
}

export function classifyAlignGridPointerGesture(
  input: AlignGridMousePointerInput,
): AlignGridPointerIntent | null {
  if (!isAlignGridMousePointerInput(input)) return null;
  if (input.button === 0) return "offset";
  if (input.button === 1) return "spacing";
  if (input.button === 2) return "rotation";
  return null;
}

export function beginAlignGridPointerGesture(
  grid: AlignGridState,
  input: AlignGridPointerGestureInput,
  toolMode?: AlignGridToolMode,
): AlignGridPointerGestureSession | null {
  if (toolMode !== undefined) {
    if (toolMode === "magnifier") return null;
    if (!isPrimaryAlignGridPointerButton(input)) return null;
    const intent: AlignGridPointerIntent =
      toolMode === "pan"
        ? "offset"
        : toolMode === "rotate"
          ? "rotation"
          : toolMode === "zoom-spacing"
            ? "spacing"
            : toolMode === "zoom-pattern"
              ? "size"
              : "spacing-size";
    return {
      pointerId: input.pointerId,
      intent,
      startClientX: input.clientX,
      startClientY: input.clientY,
      startGrid: grid,
    };
  }

  const intent = classifyAlignGridPointerGesture(input);
  if (!intent) return null;
  return {
    pointerId: input.pointerId,
    intent,
    startClientX: input.clientX,
    startClientY: input.clientY,
    startGrid: grid,
  };
}

export function applyAlignGridPointerGesture(
  session: AlignGridPointerGestureSession,
  input: AlignGridPointerGestureInput,
  viewport: AlignGridWheelViewport,
): AlignGridState {
  const deltaX = input.clientX - session.startClientX;
  const deltaY = input.clientY - session.startClientY;

  if (session.intent === "offset") {
    const sx =
      viewport.scale ??
      (viewport.displayWidth > 0 && viewport.modelWidth > 0
        ? viewport.displayWidth / viewport.modelWidth
        : 1);
    const sy =
      viewport.scale ??
      (viewport.displayHeight > 0 && viewport.modelHeight > 0
        ? viewport.displayHeight / viewport.modelHeight
        : 1);
    const invSx = sx > 0 ? 1 / sx : 1;
    const invSy = sy > 0 ? 1 / sy : 1;

    return {
      ...session.startGrid,
      tx: session.startGrid.tx + deltaX * invSx,
      ty: session.startGrid.ty + deltaY * invSy,
    };
  }

  if (session.intent === "rotation") {
    return {
      ...session.startGrid,
      rotation: normalizeRadians(
        session.startGrid.rotation +
          degreesToRadians((deltaX / Math.max(1, viewport.displayWidth)) * 220),
      ),
    };
  }

  if (session.intent === "spacing-size") {
    const spacingFactor = Math.max(0.01, 1 + (deltaX / Math.max(1, viewport.displayWidth)) * 2.5);
    const sizeFactor = Math.max(0.01, 1 + (deltaY / Math.max(1, viewport.displayHeight)) * 2.5);
    return normalizeAlignGridState({
      ...session.startGrid,
      spacingA: session.startGrid.spacingA * spacingFactor,
      spacingB: session.startGrid.spacingB * spacingFactor,
      patternWidth: session.startGrid.patternWidth * sizeFactor,
      patternHeight: session.startGrid.patternHeight * sizeFactor,
    });
  }

  if (session.intent === "size") {
    const factor = Math.max(0.01, 1 + (deltaX / Math.max(1, viewport.displayWidth)) * 2.5);
    return normalizeAlignGridState({
      ...session.startGrid,
      patternWidth: session.startGrid.patternWidth * factor,
      patternHeight: session.startGrid.patternHeight * factor,
    });
  }

  const factor = Math.max(0.01, 1 + (deltaX / Math.max(1, viewport.displayWidth)) * 2.5);
  return normalizeAlignGridState({
    ...session.startGrid,
    spacingA: session.startGrid.spacingA * factor,
    spacingB: session.startGrid.spacingB * factor,
  });
}

function normalizeWheelDelta(value: number, deltaMode: number): number {
  if (!Number.isFinite(value)) return 0;
  if (deltaMode === 1) return value * LINE_DELTA_PX;
  if (deltaMode === 2) return value * PAGE_DELTA_PX;
  return value;
}

function hasFractionalWheelDelta(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  return Math.abs(value - Math.trunc(value)) > 0.001;
}

function scaleFactorFromDelta(delta: number): number {
  return Math.exp(-delta * EXP_SCALE_FACTOR);
}

export function isTouchpadLikeAlignGridWheelGesture(gesture: AlignGridWheelGestureInput): boolean {
  if (gesture.deltaMode !== 0) return false;

  const absDeltaX = Math.abs(normalizeWheelDelta(gesture.deltaX, gesture.deltaMode));
  if (absDeltaX > 0) return true;
  if (hasFractionalWheelDelta(gesture.deltaX)) return true;
  return false;
}

export function classifyAlignGridWheelGesture(
  gesture: AlignGridWheelGestureInput,
): AlignGridWheelIntent {
  if (gesture.ctrlKey) return "ignore";
  if (isTouchpadLikeAlignGridWheelGesture(gesture)) return "ignore";
  return "size";
}

export function applyAlignGridWheelGesture(
  grid: AlignGridState,
  gesture: AlignGridWheelGestureInput,
  _viewport: AlignGridWheelViewport,
): AlignGridState {
  const intent = classifyAlignGridWheelGesture(gesture);
  const deltaY = normalizeWheelDelta(gesture.deltaY, gesture.deltaMode);

  if (intent === "ignore") return grid;

  const factor = scaleFactorFromDelta(deltaY);
  return normalizeAlignGridState({
    ...grid,
    patternWidth: grid.patternWidth * factor,
    patternHeight: grid.patternHeight * factor,
  });
}

export function toggleExcludedAlignGridPatterns(
  current: Iterable<AlignGridPatternCoord>,
  toggled: Iterable<AlignGridPatternCoord>,
): AlignGridPatternCoord[] {
  const next = new Map<string, AlignGridPatternCoord>();
  for (const pattern of current) {
    next.set(alignGridPatternCoordKey(pattern), { i: pattern.i, j: pattern.j });
  }

  for (const pattern of toSortedUniqueAlignGridPatterns(toggled)) {
    const key = alignGridPatternCoordKey(pattern);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.set(key, pattern);
    }
  }

  return Array.from(next.values()).toSorted(compareAlignGridPatternCoords);
}

export function mergeExcludedAlignGridPatterns(
  current: Iterable<AlignGridPatternCoord>,
  additions: Iterable<AlignGridPatternCoord>,
): AlignGridPatternCoord[] {
  return toSortedUniqueAlignGridPatterns([...current, ...additions]);
}

export function setExcludedAlignGridPatternsForPosition(
  map: ExcludedAlignGridPatternsByPosition,
  position: number,
  nextPatterns: Iterable<AlignGridPatternCoord>,
): ExcludedAlignGridPatternsByPosition {
  const normalized = toSortedUniqueAlignGridPatterns(nextPatterns);
  if (normalized.length === 0) {
    const { [position]: _removed, ...rest } = map;
    return rest;
  }
  return { ...map, [position]: normalized };
}

export function clearExcludedAlignGridPatterns(): ExcludedAlignGridPatternsByPosition {
  return {};
}

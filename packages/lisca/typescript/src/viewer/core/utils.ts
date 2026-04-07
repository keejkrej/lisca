import type {
  GridCellRect,
  GridFrameBounds,
  GridPointerGestureInput,
  GridPointerGestureSession,
  GridPointerIntent,
  GridShape,
  GridState,
  GridWheelGestureInput,
  GridWheelIntent,
  GridWheelViewport,
  MousePointerInput,
} from "./types";

export const MAX_GRID_RECTS = 8000;
const LINE_DELTA_PX = 16;
const PAGE_DELTA_PX = 320;
const EXP_SCALE_FACTOR = 0.0015;
const GRID_BOUNDS_EPSILON = 1e-6;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isMousePointerInput(input: MousePointerInput): boolean {
  return input.pointerType === "mouse";
}

export function isPrimaryMouseButton(input: MousePointerInput): boolean {
  return isMousePointerInput(input) && input.button === 0;
}

export function classifyGridPointerGesture(input: MousePointerInput): GridPointerIntent | null {
  if (!isMousePointerInput(input)) return null;
  if (input.button === 0) return "offset";
  if (input.button === 1) return "spacing";
  if (input.button === 2) return "rotation";
  return null;
}

export function beginGridPointerGesture(
  grid: GridState,
  input: GridPointerGestureInput,
): GridPointerGestureSession | null {
  const intent = classifyGridPointerGesture(input);
  if (!intent) return null;
  return {
    pointerId: input.pointerId,
    intent,
    startClientX: input.clientX,
    startClientY: input.clientY,
    startGrid: grid,
  };
}

export function applyGridPointerGesture(
  session: GridPointerGestureSession,
  input: GridPointerGestureInput,
  viewport: GridWheelViewport,
): GridState {
  const deltaX = input.clientX - session.startClientX;
  const deltaY = input.clientY - session.startClientY;

  if (session.intent === "offset") {
    const sx =
      viewport.displayWidth > 0 && viewport.modelWidth > 0
        ? viewport.displayWidth / viewport.modelWidth
        : 1;
    const sy =
      viewport.displayHeight > 0 && viewport.modelHeight > 0
        ? viewport.displayHeight / viewport.modelHeight
        : 1;
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
        session.startGrid.rotation + degreesToRadians((deltaX / Math.max(1, viewport.displayWidth)) * 220),
      ),
    };
  }

  const factor = Math.max(0.01, 1 + (deltaX / Math.max(1, viewport.displayWidth)) * 2.5);
  return normalizeGridState({
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

export function createDefaultGrid(): GridState {
  return {
    enabled: false,
    shape: "square",
    tx: 0,
    ty: 0,
    rotation: 0,
    spacingA: 325,
    spacingB: 325,
    cellWidth: 200,
    cellHeight: 200,
    opacity: 0.35,
  };
}

export function minimumGridSpacing(cellWidth: number, cellHeight: number): number {
  return Math.max(1, Math.min(cellWidth, cellHeight));
}

export function normalizeGridState(input?: Partial<GridState>): GridState {
  const base = createDefaultGrid();
  if (!input) return base;
  const cellWidth = Math.max(1, input.cellWidth ?? base.cellWidth);
  const cellHeight = Math.max(1, input.cellHeight ?? base.cellHeight);
  const minSpacing = minimumGridSpacing(cellWidth, cellHeight);
  return {
    enabled: input.enabled ?? base.enabled,
    shape: input.shape ?? base.shape,
    tx: input.tx ?? base.tx,
    ty: input.ty ?? base.ty,
    rotation: input.rotation ?? base.rotation,
    spacingA: Math.max(minSpacing, input.spacingA ?? base.spacingA),
    spacingB: Math.max(minSpacing, input.spacingB ?? base.spacingB),
    cellWidth,
    cellHeight,
    opacity: clamp(input.opacity ?? base.opacity, 0, 1),
  };
}

export function gridBasis(shape: GridShape, rotation: number, spacingA: number, spacingB: number) {
  const secondAngle = rotation + (shape === "square" ? Math.PI / 2 : Math.PI / 3);
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

export function estimateGridDraw(
  width: number,
  height: number,
  spacingA: number,
  spacingB: number,
  _maxRects = MAX_GRID_RECTS,
) {
  const minSpacing = Math.max(1, Math.min(spacingA, spacingB));
  const estimatedColumns = Math.ceil(width / minSpacing) + 3;
  const estimatedRows = Math.ceil(height / minSpacing) + 3;
  const range = Math.max(estimatedColumns, estimatedRows);
  const estimated = estimatedColumns * estimatedRows;
  const stride = 1;
  return {
    range,
    estimated,
    stride,
    capped: false,
  };
}

function resolveVisibleGridIndexBounds(frame: GridFrameBounds, grid: GridState) {
  const basis = gridBasis(grid.shape, grid.rotation, grid.spacingA, grid.spacingB);
  const originX = frame.width / 2 + grid.tx;
  const originY = frame.height / 2 + grid.ty;
  const halfWidth = grid.cellWidth / 2;
  const halfHeight = grid.cellHeight / 2;
  const determinant = basis.a.x * basis.b.y - basis.a.y * basis.b.x;

  if (Math.abs(determinant) <= GRID_BOUNDS_EPSILON) {
    const drawStats = estimateGridDraw(frame.width, frame.height, grid.spacingA, grid.spacingB);
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

function intersectsFrame(cell: GridCellRect, frameWidth: number, frameHeight: number): boolean {
  return (
    cell.x + cell.width >= 0 &&
    cell.y + cell.height >= 0 &&
    cell.x <= frameWidth &&
    cell.y <= frameHeight
  );
}

export function enumerateVisibleGridCells(frame: GridFrameBounds, grid: GridState): GridCellRect[] {
  const { basis, originX, originY, halfWidth, halfHeight, iMin, iMax, jMin, jMax } =
    resolveVisibleGridIndexBounds(frame, grid);
  const cells: GridCellRect[] = [];

  for (let i = iMin; i <= iMax; i += 1) {
    for (let j = jMin; j <= jMax; j += 1) {
      const centerX = originX + i * basis.a.x + j * basis.b.x;
      const centerY = originY + i * basis.a.y + j * basis.b.y;
      const cell = {
        id: `${i}:${j}`,
        i,
        j,
        centerX,
        centerY,
        x: centerX - halfWidth,
        y: centerY - halfHeight,
        width: grid.cellWidth,
        height: grid.cellHeight,
      };

      if (intersectsFrame(cell, frame.width, frame.height)) {
        cells.push(cell);
      }
    }
  }

  return cells;
}

export function findGridCellAtPoint(
  frame: GridFrameBounds,
  grid: GridState,
  x: number,
  y: number,
): GridCellRect | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const cells = enumerateVisibleGridCells(frame, grid);
  for (let index = cells.length - 1; index >= 0; index -= 1) {
    const cell = cells[index];
    if (
      cell &&
      x >= cell.x &&
      x <= cell.x + cell.width &&
      y >= cell.y &&
      y <= cell.y + cell.height
    ) {
      return cell;
    }
  }

  return null;
}

export function collectStrokeToggleCellIds(
  frame: GridFrameBounds,
  grid: GridState,
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
  alreadyToggledCellIds?: Iterable<string>,
): string[] {
  const sampleDistance = Math.max(4, Math.min(grid.cellWidth, grid.cellHeight) / 4);
  const distance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
  const steps = Math.max(1, Math.ceil(distance / sampleDistance));
  const skippedCellIds = new Set(alreadyToggledCellIds ?? []);
  const hitCellIds = new Set<string>();

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = startPoint.x + (endPoint.x - startPoint.x) * t;
    const y = startPoint.y + (endPoint.y - startPoint.y) * t;
    const cell = findGridCellAtPoint(frame, grid, x, y);
    if (cell && !skippedCellIds.has(cell.id)) {
      hitCellIds.add(cell.id);
    }
  }

  return Array.from(hitCellIds);
}

export function toggleCellIds(currentCellIds: Iterable<string>, cellIdsToToggle: Iterable<string>): string[] {
  const activeCellIds = new Set(currentCellIds);
  for (const cellId of new Set(cellIdsToToggle)) {
    if (activeCellIds.has(cellId)) {
      activeCellIds.delete(cellId);
    } else {
      activeCellIds.add(cellId);
    }
  }
  return Array.from(activeCellIds).sort();
}

export function countVisibleCells(
  frame: GridFrameBounds,
  grid: GridState,
  excludedCellIds?: Iterable<string>,
): { included: number; excluded: number } {
  const excluded = excludedCellIds ? new Set(excludedCellIds) : new Set<string>();
  const cells = enumerateVisibleGridCells(frame, grid);
  const excludedCount = cells.filter((cell) => excluded.has(cell.id)).length;
  return {
    included: cells.length - excludedCount,
    excluded: excludedCount,
  };
}

export function collectEdgeCellIds(frame: GridFrameBounds, grid: GridState): string[] {
  return enumerateVisibleGridCells(frame, grid)
    .filter(
      (cell) =>
        cell.x <= 0 ||
        cell.y <= 0 ||
        cell.x + cell.width >= frame.width ||
        cell.y + cell.height >= frame.height,
    )
    .map((cell) => cell.id)
    .sort();
}

export function buildBboxCsv(
  frame: GridFrameBounds,
  grid: GridState,
  excludedCellIds?: Iterable<string>,
): string {
  const excluded = excludedCellIds ? new Set(excludedCellIds) : new Set<string>();
  const rows = ["roi,x,y,w,h"];
  let roi = 0;

  for (const cell of enumerateVisibleGridCells(frame, grid)) {
    if (excluded.has(cell.id)) continue;

    const clippedX = clamp(Math.round(cell.x), 0, frame.width);
    const clippedY = clamp(Math.round(cell.y), 0, frame.height);
    const clippedRight = clamp(Math.round(cell.x + cell.width), 0, frame.width);
    const clippedBottom = clamp(Math.round(cell.y + cell.height), 0, frame.height);
    const clippedWidth = clippedRight - clippedX;
    const clippedHeight = clippedBottom - clippedY;

    if (clippedWidth <= 0 || clippedHeight <= 0) continue;

    rows.push(`${roi},${clippedX},${clippedY},${clippedWidth},${clippedHeight}`);
    roi += 1;
  }

  return rows.join("\n");
}

export function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

export function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function normalizeRadians(value: number): number {
  const normalized = ((value + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return Number.isFinite(normalized) ? normalized : 0;
}

export function isTouchpadLikeGridWheelGesture(gesture: GridWheelGestureInput): boolean {
  if (gesture.deltaMode !== 0) return false;

  const absDeltaX = Math.abs(normalizeWheelDelta(gesture.deltaX, gesture.deltaMode));

  if (absDeltaX > 0) return true;
  if (hasFractionalWheelDelta(gesture.deltaX)) return true;
  return false;
}

export function classifyGridWheelGesture(gesture: GridWheelGestureInput): GridWheelIntent {
  if (gesture.ctrlKey) {
    return "ignore";
  }
  if (isTouchpadLikeGridWheelGesture(gesture)) {
    return "ignore";
  }
  return "size";
}

export function applyGridWheelGesture(
  grid: GridState,
  gesture: GridWheelGestureInput,
  _viewport: GridWheelViewport,
): GridState {
  const intent = classifyGridWheelGesture(gesture);
  const deltaY = normalizeWheelDelta(gesture.deltaY, gesture.deltaMode);

  if (intent === "ignore") {
    return grid;
  }

  const factor = scaleFactorFromDelta(deltaY);
  return normalizeGridState({
    ...grid,
    cellWidth: grid.cellWidth * factor,
    cellHeight: grid.cellHeight * factor,
  });
}

import type { AlignGridCellCoord, AlignGridShape, AlignGridState } from "@lisca/contracts";

export function formatWsUrl(host: string, port: number, path: string): string {
  const proto = host === "localhost" || host === "127.0.0.1" ? "ws" : "wss";
  return `${proto}://${host}:${port}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Resolve the WebSocket URL for Lisca web UIs.
 *
 * Precedence: URL query `liscaWs` or `wsUrl` (e.g. injected by the native shell) →
 * `VITE_WS_URL` → host/port via {@link formatWsUrl} (local host uses `ws:`, otherwise `wss:`).
 */
export function resolveLiscaWsUrl(options: {
  searchParams?: URLSearchParams | null;
  viteWsUrl?: string | undefined;
  viteWsHost?: string | undefined;
  viteWsPort?: string | number | undefined;
  /** Used when building from host/port and `VITE_WS_PORT` is unset */
  defaultPort: number;
  wsPath?: string;
}): string {
  const fromQuery = options.searchParams?.get("liscaWs") ?? options.searchParams?.get("wsUrl");
  if (fromQuery?.trim()) {
    return decodeURIComponent(fromQuery.trim());
  }
  if (options.viteWsUrl?.trim()) {
    return options.viteWsUrl.trim();
  }
  const path = options.wsPath ?? "/ws";
  const port = Number(options.viteWsPort ?? options.defaultPort);
  const host = options.viteWsHost?.trim() || "127.0.0.1";
  return formatWsUrl(host, port, path);
}

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
export type AlignGridToolMode = "pan" | "rotate" | "zoom-vector" | "zoom-pattern" | "zoom";

export type AlignGridPointerGestureSession = {
  pointerId: number;
  intent: AlignGridPointerIntent;
  startClientX: number;
  startClientY: number;
  startGrid: AlignGridState;
};

export type AlignGridCellBox = AlignGridCellCoord & {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ExcludedAlignGridCellsByPosition = Record<number, AlignGridCellCoord[]>;

export const MAX_ALIGN_GRID_RECTS = 8000;
const LINE_DELTA_PX = 16;
const PAGE_DELTA_PX = 320;
const EXP_SCALE_FACTOR = 0.0015;
const GRID_BOUNDS_EPSILON = 1e-6;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
    spacingA: 325,
    spacingB: 325,
    cellWidth: 200,
    cellHeight: 200,
    opacity: 0.35,
  };
}

export function minimumAlignGridSpacing(cellWidth: number, cellHeight: number): number {
  return Math.max(1, Math.min(cellWidth, cellHeight));
}

export function normalizeAlignGridState(input?: Partial<AlignGridState>): AlignGridState {
  const base = createDefaultAlignGrid();
  if (!input) return base;
  const cellWidth = Math.max(1, input.cellWidth ?? base.cellWidth);
  const cellHeight = Math.max(1, input.cellHeight ?? base.cellHeight);
  const minSpacing = minimumAlignGridSpacing(cellWidth, cellHeight);

  return {
    enabled: input.enabled ?? base.enabled,
    shape: input.shape ?? base.shape,
    tx: input.tx ?? base.tx,
    ty: input.ty ?? base.ty,
    rotation: normalizeRadians(input.rotation ?? base.rotation),
    spacingA: Math.max(minSpacing, input.spacingA ?? base.spacingA),
    spacingB: Math.max(minSpacing, input.spacingB ?? base.spacingB),
    cellWidth,
    cellHeight,
    opacity: clamp(input.opacity ?? base.opacity, 0, 1),
  };
}

export function alignGridBasis(
  shape: AlignGridShape,
  rotation: number,
  spacingA: number,
  spacingB: number,
) {
  const secondAngle = rotation + (shape === "rect" ? Math.PI / 2 : Math.PI / 3);
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
  const halfWidth = grid.cellWidth / 2;
  const halfHeight = grid.cellHeight / 2;
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

export function alignGridCellCoordKey(cell: AlignGridCellCoord): string {
  return `${cell.i}:${cell.j}`;
}

function compareAlignGridCellCoords(left: AlignGridCellCoord, right: AlignGridCellCoord): number {
  if (left.i !== right.i) return left.i - right.i;
  return left.j - right.j;
}

function toSortedUniqueAlignGridCells(cells: Iterable<AlignGridCellCoord>): AlignGridCellCoord[] {
  const unique = new Map<string, AlignGridCellCoord>();
  for (const cell of cells) {
    unique.set(alignGridCellCoordKey(cell), { i: cell.i, j: cell.j });
  }
  return Array.from(unique.values()).sort(compareAlignGridCellCoords);
}

export function enumerateVisibleAlignGridCells(
  frame: AlignGridFrameBounds,
  grid: AlignGridState,
): AlignGridCellBox[] {
  const { basis, originX, originY, halfWidth, halfHeight, iMin, iMax, jMin, jMax } =
    resolveVisibleAlignGridIndexBounds(frame, grid);
  const cells: AlignGridCellBox[] = [];
  const rawWidth = Math.max(1, Math.round(grid.cellWidth));
  const rawHeight = Math.max(1, Math.round(grid.cellHeight));

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

      cells.push({
        i,
        j,
        x: clippedX,
        y: clippedY,
        w,
        h,
      });
    }
  }

  return cells;
}

export function findAlignGridCellAtPoint(
  frame: AlignGridFrameBounds,
  grid: AlignGridState,
  x: number,
  y: number,
): AlignGridCellBox | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const cells = enumerateVisibleAlignGridCells(frame, grid);
  for (let index = cells.length - 1; index >= 0; index -= 1) {
    const cell = cells[index];
    if (cell && x >= cell.x && x <= cell.x + cell.w && y >= cell.y && y <= cell.y + cell.h) {
      return cell;
    }
  }

  return null;
}

export function collectAlignGridStrokeToggleCells(
  frame: AlignGridFrameBounds,
  grid: AlignGridState,
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
  alreadyToggledCells?: Iterable<AlignGridCellCoord>,
): AlignGridCellCoord[] {
  const sampleDistance = Math.max(4, Math.min(grid.cellWidth, grid.cellHeight) / 4);
  const distance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
  const steps = Math.max(1, Math.ceil(distance / sampleDistance));
  const skippedCells = new Set(Array.from(alreadyToggledCells ?? [], alignGridCellCoordKey));
  const hitCells = new Map<string, AlignGridCellCoord>();

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = startPoint.x + (endPoint.x - startPoint.x) * t;
    const y = startPoint.y + (endPoint.y - startPoint.y) * t;
    const cell = findAlignGridCellAtPoint(frame, grid, x, y);
    if (!cell) continue;
    const key = alignGridCellCoordKey(cell);
    if (!skippedCells.has(key)) {
      hitCells.set(key, { i: cell.i, j: cell.j });
    }
  }

  return Array.from(hitCells.values()).sort(compareAlignGridCellCoords);
}

export function countVisibleAlignGridCells(
  frame: AlignGridFrameBounds,
  grid: AlignGridState,
  excludedCells?: Iterable<AlignGridCellCoord>,
): { included: number; excluded: number } {
  const excluded = excludedCells
    ? new Set(Array.from(excludedCells, alignGridCellCoordKey))
    : new Set<string>();
  const cells = enumerateVisibleAlignGridCells(frame, grid);
  const excludedCount = cells.filter((cell) => excluded.has(alignGridCellCoordKey(cell))).length;
  return {
    included: cells.length - excludedCount,
    excluded: excludedCount,
  };
}

export function collectAlignGridEdgeCells(
  frame: AlignGridFrameBounds,
  grid: AlignGridState,
): AlignGridCellCoord[] {
  const targetArea =
    Math.max(1, Math.round(grid.cellWidth)) * Math.max(1, Math.round(grid.cellHeight));
  const edgeAreaThreshold = targetArea * 0.8;
  return enumerateVisibleAlignGridCells(frame, grid)
    .filter(
      (cell) =>
        (cell.x <= 0 ||
          cell.y <= 0 ||
          cell.x + cell.w >= frame.width ||
          cell.y + cell.h >= frame.height) &&
        cell.w * cell.h < edgeAreaThreshold,
    )
    .map((cell) => ({ i: cell.i, j: cell.j }))
    .sort(compareAlignGridCellCoords);
}

export function isAlignGridMousePointerInput(input: AlignGridMousePointerInput): boolean {
  return input.pointerType === "mouse";
}

export function isPrimaryAlignGridMouseButton(input: AlignGridMousePointerInput): boolean {
  return isAlignGridMousePointerInput(input) && input.button === 0;
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
    if (!isPrimaryAlignGridMouseButton(input)) return null;
    const intent: AlignGridPointerIntent =
      toolMode === "pan"
        ? "offset"
        : toolMode === "rotate"
          ? "rotation"
          : toolMode === "zoom-vector"
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
      cellWidth: session.startGrid.cellWidth * sizeFactor,
      cellHeight: session.startGrid.cellHeight * sizeFactor,
    });
  }

  if (session.intent === "size") {
    const factor = Math.max(0.01, 1 + (deltaX / Math.max(1, viewport.displayWidth)) * 2.5);
    return normalizeAlignGridState({
      ...session.startGrid,
      cellWidth: session.startGrid.cellWidth * factor,
      cellHeight: session.startGrid.cellHeight * factor,
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
    cellWidth: grid.cellWidth * factor,
    cellHeight: grid.cellHeight * factor,
  });
}

export function toggleExcludedAlignGridCells(
  current: Iterable<AlignGridCellCoord>,
  toggled: Iterable<AlignGridCellCoord>,
): AlignGridCellCoord[] {
  const next = new Map<string, AlignGridCellCoord>();
  for (const cell of current) {
    next.set(alignGridCellCoordKey(cell), { i: cell.i, j: cell.j });
  }

  for (const cell of toSortedUniqueAlignGridCells(toggled)) {
    const key = alignGridCellCoordKey(cell);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.set(key, cell);
    }
  }

  return Array.from(next.values()).sort(compareAlignGridCellCoords);
}

export function mergeExcludedAlignGridCells(
  current: Iterable<AlignGridCellCoord>,
  additions: Iterable<AlignGridCellCoord>,
): AlignGridCellCoord[] {
  return toSortedUniqueAlignGridCells([...current, ...additions]);
}

export function setExcludedAlignGridCellsForPosition(
  map: ExcludedAlignGridCellsByPosition,
  position: number,
  nextCells: Iterable<AlignGridCellCoord>,
): ExcludedAlignGridCellsByPosition {
  const normalized = toSortedUniqueAlignGridCells(nextCells);
  if (normalized.length === 0) {
    const { [position]: _removed, ...rest } = map;
    return rest;
  }
  return { ...map, [position]: normalized };
}

export function clearExcludedAlignGridCells(): ExcludedAlignGridCellsByPosition {
  return {};
}

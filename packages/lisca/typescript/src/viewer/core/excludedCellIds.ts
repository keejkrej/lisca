import type { ExcludedCellsByPosition, GridCellCoord } from "./types";

function compareGridCellCoords(left: GridCellCoord, right: GridCellCoord): number {
  if (left.i !== right.i) return left.i - right.i;
  return left.j - right.j;
}

function gridCellCoordKey(cell: GridCellCoord): string {
  return `${cell.i}:${cell.j}`;
}

function toSortedUniqueCells(cells: Iterable<GridCellCoord>): GridCellCoord[] {
  const unique = new Map<string, GridCellCoord>();
  for (const cell of cells) {
    unique.set(gridCellCoordKey(cell), { i: cell.i, j: cell.j });
  }
  return Array.from(unique.values()).sort(compareGridCellCoords);
}

export function toggleExcludedCells(current: Iterable<GridCellCoord>, toggled: Iterable<GridCellCoord>): GridCellCoord[] {
  const next = new Map<string, GridCellCoord>();
  for (const cell of current) {
    next.set(gridCellCoordKey(cell), { i: cell.i, j: cell.j });
  }

  for (const cell of toSortedUniqueCells(toggled)) {
    const key = gridCellCoordKey(cell);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.set(key, cell);
    }
  }

  return Array.from(next.values()).sort(compareGridCellCoords);
}

export function mergeExcludedCells(current: Iterable<GridCellCoord>, additions: Iterable<GridCellCoord>): GridCellCoord[] {
  return toSortedUniqueCells([...current, ...additions]);
}

export function setExcludedCellsForPosition(
  map: ExcludedCellsByPosition,
  position: number,
  nextCells: Iterable<GridCellCoord>,
): ExcludedCellsByPosition {
  const normalized = toSortedUniqueCells(nextCells);
  if (normalized.length === 0) {
    const { [position]: _removed, ...rest } = map;
    return rest;
  }
  return { ...map, [position]: normalized };
}

export function clearExcludedCells(): ExcludedCellsByPosition {
  return {};
}

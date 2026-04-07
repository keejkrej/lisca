import type { ExcludedCellIdsByPosition } from "./types";

function toSortedUniqueCellIds(cellIds: Iterable<string>): string[] {
  return Array.from(new Set(cellIds)).sort();
}

export function toggleExcludedCellIds(current: Iterable<string>, toggled: Iterable<string>): string[] {
  const next = new Set(current);
  for (const cellId of new Set(toggled)) {
    if (next.has(cellId)) {
      next.delete(cellId);
    } else {
      next.add(cellId);
    }
  }
  return Array.from(next).sort();
}

export function mergeExcludedCellIds(current: Iterable<string>, additions: Iterable<string>): string[] {
  return toSortedUniqueCellIds([...current, ...additions]);
}

export function setExcludedCellIdsForPosition(
  map: ExcludedCellIdsByPosition,
  position: number,
  nextCellIds: Iterable<string>,
): ExcludedCellIdsByPosition {
  const normalized = toSortedUniqueCellIds(nextCellIds);
  if (normalized.length === 0) {
    const { [position]: _removed, ...rest } = map;
    return rest;
  }
  return { ...map, [position]: normalized };
}

export function clearExcludedCellIds(): ExcludedCellIdsByPosition {
  return {};
}

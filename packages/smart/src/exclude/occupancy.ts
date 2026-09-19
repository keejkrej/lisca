import type {
  AlignGridCellCoord,
  AlignGridState,
  AutoExcludePreviewCell,
  OccupancyPromptExample,
  OccupancyPromptExampleInput,
  OccupancyPromptPack,
} from "@lisca/contracts";
import {
  alignGridCellCoordKey,
  enumerateVisibleAlignGridCells,
  type AlignGridFrameBounds,
} from "@lisca/utils";

export const OCCUPANCY_EMBEDDER_ID = "lisca-occupancy-v0";
export const OCCUPANCY_PACK_VERSION = 1;
export const OCCUPANCY_GRID = 16;
export const OCCUPANCY_DEFAULT_THRESHOLD = 0;
export const OCCUPANCY_MIN_OCCUPIED_EXAMPLES = 2;
export const OCCUPANCY_MIN_EMPTY_EXAMPLES = 2;

export type OccupancyPromptLabel = "occupied" | "empty";

export type OccupancyPackCounts = {
  occupied: number;
  empty: number;
};

export function occupancyEmbeddingSize(): number {
  return OCCUPANCY_GRID * OCCUPANCY_GRID + 4;
}

export function minmaxUint8(values: ArrayLike<number>): Uint8Array {
  const length = values.length;
  const output = new Uint8Array(length);
  if (length === 0) return output;
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < length; index += 1) {
    const value = Number(values[index] ?? 0);
    if (value < minimum) minimum = value;
    if (value > maximum) maximum = value;
  }
  const range = maximum - minimum;
  for (let index = 0; index < length; index += 1) {
    output[index] =
      range > 0 ? Math.round(((Number(values[index] ?? 0) - minimum) / range) * 255) : 0;
  }
  return output;
}

export function resizeNearest(
  gray: Uint8Array,
  width: number,
  height: number,
  size: number,
): Uint8Array {
  const output = new Uint8Array(size * size);
  if (width <= 0 || height <= 0) return output;
  for (let row = 0; row < size; row += 1) {
    const sourceY = Math.min(height - 1, Math.floor((row * height) / size));
    for (let col = 0; col < size; col += 1) {
      const sourceX = Math.min(width - 1, Math.floor((col * width) / size));
      output[row * size + col] = gray[sourceY * width + sourceX] ?? 0;
    }
  }
  return output;
}

export function l2Normalize(vector: number[]): number[] {
  let sumSquares = 0;
  for (const value of vector) sumSquares += value * value;
  const norm = Math.sqrt(sumSquares);
  if (norm <= 0) return vector.slice();
  return vector.map((value) => value / norm);
}

export function embedOccupancyCrop(
  values: ArrayLike<number>,
  width: number,
  height: number,
): number[] {
  const uint8 = minmaxUint8(values);
  const small = resizeNearest(uint8, width, height, OCCUPANCY_GRID);
  const flat: number[] = [];
  let sum = 0;
  for (let index = 0; index < small.length; index += 1) {
    const value = (small[index] ?? 0) / 255;
    flat.push(value);
    sum += value;
  }
  const mean = flat.length > 0 ? sum / flat.length : 0;
  let variance = 0;
  for (const value of flat) {
    const delta = value - mean;
    variance += delta * delta;
  }
  const std = flat.length > 0 ? Math.sqrt(variance / flat.length) : 0;
  const sorted = flat.slice().sort((left, right) => left - right);
  const p90 =
    sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(0.9 * sorted.length))]!;
  let dxSum = 0;
  let dxCount = 0;
  let dySum = 0;
  let dyCount = 0;
  for (let row = 0; row < OCCUPANCY_GRID; row += 1) {
    for (let col = 0; col < OCCUPANCY_GRID; col += 1) {
      const value = (small[row * OCCUPANCY_GRID + col] ?? 0) / 255;
      if (col + 1 < OCCUPANCY_GRID) {
        dxSum += Math.abs(value - (small[row * OCCUPANCY_GRID + col + 1] ?? 0) / 255);
        dxCount += 1;
      }
      if (row + 1 < OCCUPANCY_GRID) {
        dySum += Math.abs(value - (small[(row + 1) * OCCUPANCY_GRID + col] ?? 0) / 255);
        dyCount += 1;
      }
    }
  }
  const edge = 0.5 * ((dxCount > 0 ? dxSum / dxCount : 0) + (dyCount > 0 ? dySum / dyCount : 0));
  return l2Normalize([...flat, mean, std, p90, edge]);
}

export function embedOccupancyFrameCell(
  frame: { width: number; height: number; pixels: ArrayLike<number> },
  cell: { x: number; y: number; w: number; h: number },
): number[] {
  const left = Math.max(0, cell.x);
  const top = Math.max(0, cell.y);
  const right = Math.min(frame.width, cell.x + cell.w);
  const bottom = Math.min(frame.height, cell.y + cell.h);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  if (width === 0 || height === 0) {
    return l2Normalize(new Array(occupancyEmbeddingSize()).fill(0));
  }
  const values = new Float64Array(width * height);
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      values[row * width + col] = Number(
        frame.pixels[(top + row) * frame.width + (left + col)] ?? 0,
      );
    }
  }
  return embedOccupancyCrop(values, width, height);
}

export function emptyOccupancyPack(threshold = OCCUPANCY_DEFAULT_THRESHOLD): OccupancyPromptPack {
  return {
    version: OCCUPANCY_PACK_VERSION,
    embedder: OCCUPANCY_EMBEDDER_ID,
    threshold,
    examples: [],
  };
}

export function packCounts(pack: OccupancyPromptPack): OccupancyPackCounts {
  let occupied = 0;
  let empty = 0;
  for (const example of pack.examples) {
    if (example.label === "occupied") occupied += 1;
    if (example.label === "empty") empty += 1;
  }
  return { occupied, empty };
}

export function packHasBothClasses(pack: OccupancyPromptPack): boolean {
  const { occupied, empty } = packCounts(pack);
  return occupied > 0 && empty > 0;
}

export function packIsReady(
  pack: OccupancyPromptPack,
  minOccupied = OCCUPANCY_MIN_OCCUPIED_EXAMPLES,
  minEmpty = OCCUPANCY_MIN_EMPTY_EXAMPLES,
): boolean {
  const { occupied, empty } = packCounts(pack);
  return occupied >= minOccupied && empty >= minEmpty;
}

export function packGateMessage(
  pack: OccupancyPromptPack | null | undefined,
  minOccupied = OCCUPANCY_MIN_OCCUPIED_EXAMPLES,
  minEmpty = OCCUPANCY_MIN_EMPTY_EXAMPLES,
): string {
  const { occupied, empty } = pack ? packCounts(pack) : { occupied: 0, empty: 0 };
  if (occupied >= minOccupied && empty >= minEmpty) {
    return `Prompt pack ready (${occupied} occupied, ${empty} empty).`;
  }
  const needed: string[] = [];
  const needOccupied = Math.max(0, minOccupied - occupied);
  const needEmpty = Math.max(0, minEmpty - empty);
  if (needOccupied > 0) needed.push(`${needOccupied} more occupied`);
  if (needEmpty > 0) needed.push(`${needEmpty} more empty`);
  return `Not ready yet — need ${needed.join(" and ")} examples (have ${occupied} occupied, ${empty} empty). Using ResNet until then.`;
}

function exampleKey(example: OccupancyPromptExample): string | null {
  if (example.i == null || example.j == null) return null;
  return `${example.pos ?? ""}:${example.i}:${example.j}`;
}

export function mergeOccupancyPacks(
  base: OccupancyPromptPack,
  extra: OccupancyPromptPack,
): OccupancyPromptPack {
  const keyed = new Map<string, OccupancyPromptExample>();
  const anonymous: OccupancyPromptExample[] = [];
  for (const example of [...base.examples, ...extra.examples]) {
    const key = exampleKey(example);
    if (key == null) anonymous.push(example);
    else keyed.set(key, example);
  }
  return {
    version: extra.version ?? base.version ?? OCCUPANCY_PACK_VERSION,
    embedder: extra.embedder || base.embedder || OCCUPANCY_EMBEDDER_ID,
    threshold: extra.threshold ?? base.threshold ?? OCCUPANCY_DEFAULT_THRESHOLD,
    examples: [...anonymous, ...keyed.values()],
  };
}

export function buildOccupancyPack(
  occupied: number[][],
  empty: number[][],
  threshold = OCCUPANCY_DEFAULT_THRESHOLD,
): OccupancyPromptPack {
  return {
    version: OCCUPANCY_PACK_VERSION,
    embedder: OCCUPANCY_EMBEDDER_ID,
    threshold,
    examples: [
      ...occupied.map((embedding) => ({ label: "occupied" as const, embedding })),
      ...empty.map((embedding) => ({ label: "empty" as const, embedding })),
    ],
  };
}

function meanPrototype(embeddings: number[][]): number[] {
  if (embeddings.length === 0) throw new Error("prototype requires at least one embedding");
  const dim = embeddings[0]?.length ?? 0;
  const mean = new Array(dim).fill(0);
  for (const embedding of embeddings) {
    for (let index = 0; index < dim; index += 1) {
      mean[index] += embedding[index] ?? 0;
    }
  }
  for (let index = 0; index < dim; index += 1) mean[index] /= embeddings.length;
  return l2Normalize(mean);
}

export function occupancyExcludeScore(
  embedding: number[],
  occupiedPrototype: number[],
  emptyPrototype: number[],
): number {
  const query = l2Normalize(embedding);
  const occupied = l2Normalize(occupiedPrototype);
  const empty = l2Normalize(emptyPrototype);
  let emptyDot = 0;
  let occupiedDot = 0;
  const dim = Math.min(query.length, occupied.length, empty.length);
  for (let index = 0; index < dim; index += 1) {
    emptyDot += query[index]! * empty[index]!;
    occupiedDot += query[index]! * occupied[index]!;
  }
  return emptyDot - occupiedDot;
}

export function scoreEmbeddingAgainstPack(embedding: number[], pack: OccupancyPromptPack): number {
  const occupied = pack.examples
    .filter((example) => example.label === "occupied")
    .map((example) => example.embedding);
  const empty = pack.examples
    .filter((example) => example.label === "empty")
    .map((example) => example.embedding);
  if (occupied.length === 0 || empty.length === 0) {
    throw new Error("prompt pack needs occupied and empty embeddings");
  }
  return occupancyExcludeScore(embedding, meanPrototype(occupied), meanPrototype(empty));
}

export function shouldExcludeScore(score: number, pack?: OccupancyPromptPack): boolean {
  const threshold = pack?.threshold ?? OCCUPANCY_DEFAULT_THRESHOLD;
  return score >= threshold;
}

export function classifyCellsWithPack(
  frame: { width: number; height: number; pixels: ArrayLike<number> },
  cells: readonly AutoExcludePreviewCell[],
  pack: OccupancyPromptPack,
): AlignGridCellCoord[] {
  const excluded: AlignGridCellCoord[] = [];
  for (const cell of cells) {
    const embedding = embedOccupancyFrameCell(frame, cell);
    const score = scoreEmbeddingAgainstPack(embedding, pack);
    if (shouldExcludeScore(score, pack)) excluded.push({ i: cell.i, j: cell.j });
  }
  return excluded;
}

export function occupancyCorrectionsFromExclusionChange(
  previous: readonly AlignGridCellCoord[],
  next: readonly AlignGridCellCoord[],
): { label: OccupancyPromptLabel; i: number; j: number }[] {
  const previousKeys = new Set(previous.map(alignGridCellCoordKey));
  const nextKeys = new Set(next.map(alignGridCellCoordKey));
  const corrections: { label: OccupancyPromptLabel; i: number; j: number }[] = [];
  for (const cell of next) {
    if (!previousKeys.has(alignGridCellCoordKey(cell))) {
      corrections.push({ label: "empty", i: cell.i, j: cell.j });
    }
  }
  for (const cell of previous) {
    if (!nextKeys.has(alignGridCellCoordKey(cell))) {
      corrections.push({ label: "occupied", i: cell.i, j: cell.j });
    }
  }
  return corrections;
}

export function promptExamplesFromCorrections(
  frame: AlignGridFrameBounds,
  grid: AlignGridState,
  corrections: readonly { label: OccupancyPromptLabel; i: number; j: number }[],
): OccupancyPromptExampleInput[] {
  if (corrections.length === 0) return [];
  const visible = new Map(
    enumerateVisibleAlignGridCells(frame, grid).map((cell) => [alignGridCellCoordKey(cell), cell]),
  );
  const examples: OccupancyPromptExampleInput[] = [];
  for (const correction of corrections) {
    const cell = visible.get(alignGridCellCoordKey(correction));
    if (!cell) continue;
    examples.push({
      label: correction.label,
      cell: { i: cell.i, j: cell.j, x: cell.x, y: cell.y, w: cell.w, h: cell.h },
    });
  }
  return examples;
}

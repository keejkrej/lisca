import type {
  AutoExcludeHistogramBin,
  AutoExcludePreviewCell,
  AutoExcludePreviewResponse,
} from "@lisca/contracts";
import { ascending, bin, extent, mean, sort, sum } from "d3-array";

import type { FrameResult } from "./frame";

const AUTO_EXCLUDE_BIN_COUNT = 40;
const AUTO_EXCLUDE_EPSILON = 1.0;

type CellScore = {
  i: number;
  j: number;
  score: number;
};

function flatnessScore(values: readonly number[]): number | null {
  if (values.length === 0) return null;

  const sorted = sort(values);
  const bandLength = Math.max(1, Math.min(sorted.length, Math.ceil(sorted.length * 0.1)));
  const lowMean = mean(sorted.slice(0, bandLength)) ?? 0;
  const highMean = mean(sorted.slice(sorted.length - bandLength)) ?? 0;
  return highMean / Math.max(lowMean, AUTO_EXCLUDE_EPSILON);
}

function entropyFromProbabilities(probabilities: readonly number[]): number {
  let entropy = 0;
  for (const probability of probabilities) {
    if (probability > 0) {
      entropy -= probability * Math.log(probability);
    }
  }
  return entropy;
}

/** Kapur maximum-entropy threshold on a histogram.
 *
 * `counts[i]` is the population of bin `i`; `edges[i]` is the boundary at the
 * low side of bin `i` and `edges[counts.length]` is the high side of the last
 * bin (i.e. `edges` has one more entry than `counts`). The Kapur partition
 * `slice(0, split + 1)` assigns every value in bin `split` to the background
 * class, so the returned threshold is the bin edge `edges[split + 1]` — the
 * boundary between the last background bin and the first foreground bin — so
 * that `score <= threshold` excludes exactly the bins Kapur classed as
 * background. Returning the bin center instead is a half-bin-low bug.
 */
export function maxEntropyThresholdOnHistogram(
  counts: readonly number[],
  edges: readonly number[],
): number {
  if (counts.length === 0 || edges.length === 0) return 0;

  const total = sum(counts) ?? 0;
  if (total <= 0) return edges[0] ?? 0;

  const probabilities = counts.map((count) => count / total);
  let bestEntropy = Number.NEGATIVE_INFINITY;
  let bestThreshold = edges[0] ?? 0;

  for (let split = 0; split < counts.length - 1; split += 1) {
    const background = probabilities.slice(0, split + 1);
    const foreground = probabilities.slice(split + 1);
    const weightBackground = sum(background) ?? 0;
    const weightForeground = sum(foreground) ?? 0;
    if (weightBackground <= 0 || weightForeground <= 0) continue;

    const totalEntropy =
      entropyFromProbabilities(background.map((probability) => probability / weightBackground)) +
      entropyFromProbabilities(foreground.map((probability) => probability / weightForeground));

    if (totalEntropy > bestEntropy) {
      bestEntropy = totalEntropy;
      bestThreshold = edges[split + 1] ?? bestThreshold;
    }
  }

  return bestThreshold;
}

function collectCellValues(frame: FrameResult, cell: AutoExcludePreviewCell): number[] {
  const left = Math.min(cell.x, frame.width);
  const top = Math.min(cell.y, frame.height);
  const right = Math.min(cell.x + cell.w, frame.width);
  const bottom = Math.min(cell.y + cell.h, frame.height);
  if (right <= left || bottom <= top) return [];

  const values: number[] = [];
  const { pixels } = frame;
  const frameWidth = frame.width;
  const rowWidth = right - left;
  for (let y = top; y < bottom; y += 1) {
    const rowOffset = y * frameWidth + left;
    for (let offset = rowOffset; offset < rowOffset + rowWidth; offset += 1) {
      values.push(Number(pixels[offset] ?? 0));
    }
  }
  return values;
}

function buildHistogram(scores: number[]): {
  bins: AutoExcludeHistogramBin[];
  scoreMin: number;
  scoreMax: number;
  threshold: number;
} {
  if (scores.length === 0) {
    return {
      bins: [],
      scoreMin: 0,
      scoreMax: 0,
      threshold: 0,
    };
  }

  const [rawMin, rawMax] = extent(scores) as [number, number];
  const scoreMin = rawMin;
  const scoreMax = rawMax <= scoreMin ? scoreMin + 1 : rawMax;

  const histogram = bin<number, number>()
    .domain([scoreMin, scoreMax])
    .thresholds(AUTO_EXCLUDE_BIN_COUNT);

  const groups = histogram(scores);
  const bins: AutoExcludeHistogramBin[] = groups.map((group) => ({
    start: group.x0 ?? scoreMin,
    end: group.x1 ?? scoreMax,
    count: group.length,
  }));

  const counts = bins.map((entry) => entry.count);
  const edges = bins.length === 0 ? [] : [bins[0].start, ...bins.map((entry) => entry.end)];

  return {
    bins,
    scoreMin,
    scoreMax,
    threshold: maxEntropyThresholdOnHistogram(counts, edges),
  };
}

function compareCellScores(left: CellScore, right: CellScore): number {
  return (
    ascending(left.score, right.score) || ascending(left.i, right.i) || ascending(left.j, right.j)
  );
}

export function computeAutoExcludePreview(
  frame: FrameResult,
  cells: readonly AutoExcludePreviewCell[],
): AutoExcludePreviewResponse {
  const cellScores = sort(
    cells.flatMap((cell): CellScore[] => {
      const score = flatnessScore(collectCellValues(frame, cell));
      return score == null ? [] : [{ i: cell.i, j: cell.j, score }];
    }),
    compareCellScores,
  );

  const histogram = buildHistogram(cellScores.map((cell) => cell.score));

  return {
    eligibleCellCount: cellScores.length,
    cellScores,
    histogramBins: histogram.bins,
    scoreMin: histogram.scoreMin,
    scoreMax: histogram.scoreMax,
    threshold: histogram.threshold,
  };
}

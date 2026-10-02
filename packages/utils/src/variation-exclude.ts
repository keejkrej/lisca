import type {
  VariationExcludeHistogramBin,
  AlignGridPatternBox,
  VariationExcludePreviewResponse,
} from "@lisca/contracts";
import { ascending, bin, extent, sort, sum } from "d3-array";

import type { FrameResult } from "./frame";

const VARIATION_EXCLUDE_BIN_COUNT = 40;
/** Same defaults as transfection log-std (Otsu) segmentation. */
const LOGSTD_VARIATION_RADIUS = 2;
const LOGSTD_GAUSSIAN_SIGMA = 1;
const OTSU_BINS = 256;

type PatternScore = {
  i: number;
  j: number;
  score: number;
};

function boxMean2d(
  source: Float64Array,
  width: number,
  height: number,
  radius: number,
): Float64Array {
  if (radius === 0) return source.slice();
  const window = radius * 2 + 1;
  const paddedWidth = width + radius * 2;
  const paddedHeight = height + radius * 2;
  const padded = new Float64Array(paddedWidth * paddedHeight);
  for (let y = 0; y < paddedHeight; y += 1) {
    const srcY = Math.min(height - 1, Math.max(0, y - radius));
    const srcRow = srcY * width;
    const destRow = y * paddedWidth;
    for (let x = 0; x < paddedWidth; x += 1) {
      const srcX = Math.min(width - 1, Math.max(0, x - radius));
      padded[destRow + x] = source[srcRow + srcX]!;
    }
  }

  const integralWidth = paddedWidth + 1;
  const integral = new Float64Array((paddedHeight + 1) * integralWidth);
  for (let y = 1; y <= paddedHeight; y += 1) {
    let rowSum = 0;
    const srcRow = (y - 1) * paddedWidth;
    const destRow = y * integralWidth;
    const prevRow = (y - 1) * integralWidth;
    for (let x = 1; x <= paddedWidth; x += 1) {
      rowSum += padded[srcRow + x - 1]!;
      integral[destRow + x] = integral[prevRow + x]! + rowSum;
    }
  }

  const out = new Float64Array(width * height);
  const area = window * window;
  for (let y = 0; y < height; y += 1) {
    const y0 = y * integralWidth;
    const y1 = (y + window) * integralWidth;
    const destRow = y * width;
    for (let x = 0; x < width; x += 1) {
      const sumWindow =
        integral[y1 + x + window]! -
        integral[y0 + x + window]! -
        integral[y1 + x]! +
        integral[y0 + x]!;
      out[destRow + x] = sumWindow / area;
    }
  }
  return out;
}

/** Local standard deviation. This is the filter the assay calls log-std. */
function variationFilter(
  source: Float64Array,
  width: number,
  height: number,
  radius: number,
): Float64Array {
  const mean = boxMean2d(source, width, height, radius);
  const squares = new Float64Array(source.length);
  for (let i = 0; i < source.length; i += 1) {
    const value = source[i]!;
    squares[i] = value * value;
  }
  const meanSquare = boxMean2d(squares, width, height, radius);
  const out = new Float64Array(source.length);
  for (let i = 0; i < source.length; i += 1) {
    const meanValue = mean[i]!;
    const variance = meanSquare[i]! - meanValue * meanValue;
    out[i] = Math.sqrt(variance > 0 ? variance : 0);
  }
  return out;
}

function gaussianKernel(sigma: number): Float64Array {
  if (sigma <= 0) return Float64Array.of(1);
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel = new Float64Array(radius * 2 + 1);
  let total = 0;
  for (let offset = -radius; offset <= radius; offset += 1) {
    const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
    kernel[offset + radius] = weight;
    total += weight;
  }
  for (let i = 0; i < kernel.length; i += 1) kernel[i] = kernel[i]! / total;
  return kernel;
}

function convolveAxisEdge(
  image: Float64Array,
  width: number,
  height: number,
  kernel: Float64Array,
  axis: "row" | "column",
): Float64Array {
  const pad = Math.floor(kernel.length / 2);
  const out = new Float64Array(image.length);
  if (pad === 0) return image.slice();
  if (axis === "column") {
    for (let y = 0; y < height; y += 1) {
      const row = y * width;
      for (let x = 0; x < width; x += 1) {
        let acc = 0;
        for (let k = 0; k < kernel.length; k += 1) {
          const srcX = Math.min(width - 1, Math.max(0, x + k - pad));
          acc += image[row + srcX]! * kernel[k]!;
        }
        out[row + x] = acc;
      }
    }
    return out;
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let acc = 0;
      for (let k = 0; k < kernel.length; k += 1) {
        const srcY = Math.min(height - 1, Math.max(0, y + k - pad));
        acc += image[srcY * width + x]! * kernel[k]!;
      }
      out[y * width + x] = acc;
    }
  }
  return out;
}

function otsuThreshold(values: Float64Array): number {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!Number.isFinite(min)) return 0;
  if (min === max) return min;

  const hist = new Float64Array(OTSU_BINS);
  const scale = OTSU_BINS / (max - min);
  let count = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    let index = Math.floor((value - min) * scale);
    if (index < 0) index = 0;
    if (index >= OTSU_BINS) index = OTSU_BINS - 1;
    hist[index] = hist[index]! + 1;
    count += 1;
  }

  let totalIntensity = 0;
  for (let i = 0; i < OTSU_BINS; i += 1) {
    const center = min + ((max - min) * (i + 0.5)) / OTSU_BINS;
    totalIntensity += hist[i]! * center;
  }

  let weightForeground = 0;
  let intensitySum = 0;
  let bestVariance = -1;
  let bestCenter = min;
  for (let i = 0; i < OTSU_BINS; i += 1) {
    const center = min + ((max - min) * (i + 0.5)) / OTSU_BINS;
    weightForeground += hist[i]!;
    intensitySum += hist[i]! * center;
    const weightBackground = count - weightForeground;
    if (weightForeground <= 0 || weightBackground <= 0) continue;
    const meanForeground = intensitySum / weightForeground;
    const meanBackground = (totalIntensity - intensitySum) / weightBackground;
    const variance = weightForeground * weightBackground * (meanForeground - meanBackground) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      bestCenter = center;
    }
  }
  return bestCenter;
}

/** 4-connected hole fill, matching `fill_binary_holes_2d`. */
function fillBinaryHoles(mask: Uint8Array, width: number, height: number): void {
  const exterior = new Uint8Array(mask.length);
  const stack: number[] = [];
  const push = (index: number) => {
    if (mask[index] || exterior[index]) return;
    exterior[index] = 1;
    stack.push(index);
  };
  for (let x = 0; x < width; x += 1) {
    push(x);
    if (height > 1) push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    if (width > 1) push(y * width + (width - 1));
  }
  while (stack.length > 0) {
    const index = stack.pop()!;
    const y = Math.floor(index / width);
    const x = index - y * width;
    if (y > 0) push(index - width);
    if (y + 1 < height) push(index + width);
    if (x > 0) push(index - 1);
    if (x + 1 < width) push(index + 1);
  }
  for (let i = 0; i < mask.length; i += 1) {
    if (!mask[i] && !exterior[i]) mask[i] = 1;
  }
}

/**
 * Foreground of the transfection log-std mask: local std, Gaussian smooth,
 * one Otsu threshold on the frame, then hole fill.
 */
function logstdForegroundMask(frame: FrameResult): Uint8Array {
  const { width, height, pixels } = frame;
  const values = new Float64Array(width * height);
  for (let i = 0; i < values.length; i += 1) values[i] = Number(pixels[i] ?? 0);
  const varied = variationFilter(values, width, height, LOGSTD_VARIATION_RADIUS);
  const kernel = gaussianKernel(LOGSTD_GAUSSIAN_SIGMA);
  const smoothed = convolveAxisEdge(
    convolveAxisEdge(varied, width, height, kernel, "row"),
    width,
    height,
    kernel,
    "column",
  );
  const threshold = otsuThreshold(smoothed);
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i += 1) mask[i] = smoothed[i]! > threshold ? 1 : 0;
  fillBinaryHoles(mask, width, height);
  return mask;
}

/** Share of the pattern box covered by the frame mask. Fully clipped boxes are skipped. */
function patternForegroundFraction(
  mask: Uint8Array,
  width: number,
  height: number,
  pattern: AlignGridPatternBox,
): number | null {
  const left = Math.max(0, Math.min(pattern.x, width));
  const top = Math.max(0, Math.min(pattern.y, height));
  const right = Math.max(left, Math.min(pattern.x + pattern.w, width));
  const bottom = Math.max(top, Math.min(pattern.y + pattern.h, height));
  if (right <= left || bottom <= top) return null;
  let covered = 0;
  for (let y = top; y < bottom; y += 1) {
    const row = y * width;
    for (let x = left; x < right; x += 1) {
      if (mask[row + x]) covered += 1;
    }
  }
  return covered / ((right - left) * (bottom - top));
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

function buildHistogram(scores: number[]): {
  bins: VariationExcludeHistogramBin[];
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
    .thresholds(VARIATION_EXCLUDE_BIN_COUNT);

  const groups = histogram(scores);
  const bins: VariationExcludeHistogramBin[] = groups.map((group) => ({
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

function comparePatternScores(left: PatternScore, right: PatternScore): number {
  return (
    ascending(left.score, right.score) || ascending(left.i, right.i) || ascending(left.j, right.j)
  );
}

export function computeVariationExcludePreview(
  frame: FrameResult,
  patterns: readonly AlignGridPatternBox[],
): VariationExcludePreviewResponse {
  const mask = patterns.length === 0 ? new Uint8Array(0) : logstdForegroundMask(frame);
  const patternScores = sort(
    patterns.flatMap((pattern): PatternScore[] => {
      const score = patternForegroundFraction(mask, frame.width, frame.height, pattern);
      return score == null ? [] : [{ i: pattern.i, j: pattern.j, score }];
    }),
    comparePatternScores,
  );

  const histogram = buildHistogram(patternScores.map((pattern) => pattern.score));

  return {
    eligiblePatternCount: patternScores.length,
    patternScores,
    histogramBins: histogram.bins,
    scoreMin: histogram.scoreMin,
    scoreMax: histogram.scoreMax,
    threshold: histogram.threshold,
  };
}

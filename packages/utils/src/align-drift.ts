import type { AlignDrift, AlignGridState } from "@lisca/contracts";

// Reject above 4096 pins. Raise the cap if a position needs more samples than that.
const MAX_ALIGN_DRIFT_KEYFRAMES = 4096;
const MAX_U32 = 4_294_967_295;

export type AlignDriftDelta = {
  dx: number;
  dy: number;
};

export type AlignDriftInput = {
  referenceTime?: number;
  interpolation?: string;
  keyframes?: ReadonlyArray<{ time: number; dx: number; dy: number }>;
};

function isU32(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_U32;
}

export function normalizeAlignDrift(drift: AlignDriftInput | null | undefined): AlignDrift | null {
  if (drift == null) return null;
  if (drift.referenceTime == null || !isU32(drift.referenceTime)) {
    throw new Error("Align drift referenceTime must be a non-negative integer");
  }
  if (drift.interpolation !== "linear") {
    throw new Error('Align drift interpolation must be "linear"');
  }
  const keyframes = drift.keyframes ?? [];
  if (keyframes.length > MAX_ALIGN_DRIFT_KEYFRAMES) {
    throw new Error("Align drift has more than 4096 keyframes");
  }
  const seen = new Set<number>();
  const normalized: AlignDrift["keyframes"] = [];
  for (const keyframe of keyframes) {
    if (!isU32(keyframe.time)) {
      throw new Error("Align drift keyframe time must be a non-negative integer");
    }
    if (!Number.isFinite(keyframe.dx) || !Number.isFinite(keyframe.dy)) {
      throw new Error("Align drift keyframe dx and dy must be finite");
    }
    if (seen.has(keyframe.time)) {
      throw new Error(`Align drift has duplicate keyframe time ${keyframe.time}`);
    }
    seen.add(keyframe.time);
    normalized.push({ time: keyframe.time, dx: keyframe.dx, dy: keyframe.dy });
  }
  return {
    referenceTime: drift.referenceTime,
    interpolation: "linear",
    keyframes: normalized,
  };
}

export function interpolateAlignDrift(
  drift: AlignDrift | null | undefined,
  time: number,
): AlignDriftDelta {
  if (drift == null || drift.keyframes.length === 0) return { dx: 0, dy: 0 };
  const samples: Array<{ time: number; dx: number; dy: number }> = drift.keyframes.map(
    (keyframe) => ({
      time: keyframe.time,
      dx: keyframe.dx,
      dy: keyframe.dy,
    }),
  );
  if (!samples.some((sample) => sample.time === drift.referenceTime)) {
    samples.push({ time: drift.referenceTime, dx: 0, dy: 0 });
  }
  samples.sort((left, right) => left.time - right.time);
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (first == null || last == null) return { dx: 0, dy: 0 };
  if (time <= first.time) return { dx: first.dx, dy: first.dy };
  if (time >= last.time) return { dx: last.dx, dy: last.dy };
  for (let index = 0; index < samples.length - 1; index += 1) {
    const left = samples[index];
    const right = samples[index + 1];
    if (left == null || right == null || time > right.time) continue;
    const span = right.time - left.time;
    const u = span === 0 ? 0 : (time - left.time) / span;
    return {
      dx: left.dx + (right.dx - left.dx) * u,
      dy: left.dy + (right.dy - left.dy) * u,
    };
  }
  return { dx: last.dx, dy: last.dy };
}

export function effectiveAlignGrid(
  grid: AlignGridState,
  drift: AlignDrift | null,
  time: number,
): AlignGridState {
  const { dx, dy } = interpolateAlignDrift(drift, time);
  if (dx === 0 && dy === 0) return grid;
  return { ...grid, tx: grid.tx + dx, ty: grid.ty + dy };
}

import { describe, expect, it } from "vitest";

import { fillPolygon, strokeMask } from "../src/annotate";

describe("strokeMask disk geometry", () => {
  it("stamps a closed disk of radius round(radius) centered on the point", () => {
    const width = 11;
    const height = 11;
    const at = (col: number, row: number) => row * width + col;
    const mask = strokeMask(new Uint8Array(width * height), width, height, [{ x: 5, y: 5 }], 7, 4);

    // center painted with the requested value
    expect(mask[at(5, 5)]).toBe(7);
    // disk boundary (distance == radius) is inclusive: dx*dx + dy*dy <= r*r
    expect(mask[at(1, 5)]).toBe(7); // left edge, distance 4
    expect(mask[at(9, 5)]).toBe(7); // right edge, distance 4
    expect(mask[at(5, 1)]).toBe(7); // top edge, distance 4
    expect(mask[at(5, 9)]).toBe(7); // bottom edge, distance 4
    // just outside the disk is untouched
    expect(mask[at(0, 5)]).toBe(0); // distance 5
    expect(mask[at(5, 0)]).toBe(0); // distance 5
    expect(mask[at(1, 1)]).toBe(0); // corner, distance sqrt(32) > 4
  });

  it("the painted disk diameter is 2 * radius (the relationship the canvas preview must match)", () => {
    // The committed footprint for brushSize = B is a disk of radius round(B), so its
    // on-screen diameter is 2 * B * scale. The AnnotationCanvas preview must therefore
    // use lineWidth = 2 * brushSize * scale to match the committed footprint.
    const width = 11;
    const height = 11;
    const radius = 4;
    const mask = strokeMask(
      new Uint8Array(width * height),
      width,
      height,
      [{ x: 5, y: 5 }],
      7,
      radius,
    );

    let minX = width;
    let maxX = 0;
    for (let x = 0; x < width; x += 1) {
      if (mask[5 * width + x] !== 0) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
    }
    expect(maxX - minX).toBe(2 * radius); // continuous diameter
    expect(maxX - minX + 1).toBe(2 * radius + 1); // inclusive pixel span
  });

  it("rounds the radius and clamps tiny radii to at least 1", () => {
    const width = 11;
    const height = 11;

    const rounded = strokeMask(
      new Uint8Array(width * height),
      width,
      height,
      [{ x: 5, y: 5 }],
      7,
      3.6,
    );
    // round(3.6) = 4 -> diameter 8
    expect(spanAtRow(rounded, width, 5)).toBe(2 * 4 + 1);

    const tiny = strokeMask(
      new Uint8Array(width * height),
      width,
      height,
      [{ x: 5, y: 5 }],
      7,
      0.4,
    );
    // round(0.4) = 0, clamped to 1 -> diameter 2
    expect(spanAtRow(tiny, width, 5)).toBe(2 * 1 + 1);
  });

  it("connects multiple points by stamping disks along the path with no gaps", () => {
    const width = 15;
    const height = 11;
    const mask = strokeMask(
      new Uint8Array(width * height),
      width,
      height,
      [
        { x: 5, y: 5 },
        { x: 9, y: 5 },
      ],
      7,
      4,
    );

    // disks of radius 4 centered at x = 5, 7, 9 (steps of r/2) -> union spans [1, 13]
    let minX = width;
    let maxX = 0;
    let count = 0;
    for (let x = 0; x < width; x += 1) {
      if (mask[5 * width + x] !== 0) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        count += 1;
      }
    }
    expect(minX).toBe(1); // 5 - 4
    expect(maxX).toBe(13); // 9 + 4
    expect(count).toBe(13); // continuous: every x in [1, 13] is painted
  });

  it("preserves prior mask values outside the painted disks", () => {
    const width = 11;
    const height = 11;
    const prior = new Uint8Array(width * height);
    prior[0] = 3; // well outside the disk at (5,5)
    prior[5 * width + 5] = 9; // will be overwritten by the new value
    const mask = strokeMask(prior, width, height, [{ x: 5, y: 5 }], 7, 4);

    expect(mask[0]).toBe(3); // untouched
    expect(mask[5 * width + 5]).toBe(7); // repainted with the new value
    expect(mask[5 * width + 1]).toBe(7); // newly painted
  });

  it("does not mutate the input mask and returns a fresh buffer", () => {
    const width = 11;
    const height = 11;
    const prior = new Uint8Array(width * height);
    prior[5 * width + 5] = 9;
    const snapshot = prior.slice();
    const next = strokeMask(prior, width, height, [{ x: 5, y: 5 }], 7, 4);

    expect(prior).toEqual(snapshot); // input untouched
    expect(next).not.toBe(prior); // new buffer
    expect(next[5 * width + 5]).toBe(7);
  });

  it("returns a copy of the mask when there are no points", () => {
    const width = 4;
    const height = 4;
    const prior = new Uint8Array(width * height);
    prior[0] = 5;
    const next = strokeMask(prior, width, height, [], 7, 4);

    expect(next).not.toBe(prior);
    expect(next).toEqual(prior);
  });

  it("clamps the disk to frame bounds without writing out of range", () => {
    const width = 11;
    const height = 11;
    // disk centered in the corner: paintDisk uses max(0, floor(cx - r)) / min(w-1, ceil(cx + r))
    const mask = strokeMask(new Uint8Array(width * height), width, height, [{ x: 1, y: 1 }], 7, 4);

    expect(mask.length).toBe(width * height);
    expect(mask[0]).toBe(7); // (0,0) is within radius 4 of (1,1)
    expect(mask[10 * width + 10]).toBe(0); // far corner untouched
  });
});

describe("fillPolygon", () => {
  it("fills the polygon interior with the value", () => {
    const width = 11;
    const height = 11;
    const mask = fillPolygon(
      new Uint8Array(width * height),
      width,
      height,
      [
        { x: 2, y: 2 },
        { x: 8, y: 2 },
        { x: 8, y: 8 },
        { x: 2, y: 8 },
      ],
      7,
    );

    expect(mask[5 * width + 5]).toBe(7); // interior
    expect(mask[0]).toBe(0); // well outside
  });

  it("does not mutate the input mask", () => {
    const width = 8;
    const height = 8;
    const prior = new Uint8Array(width * height);
    prior[0] = 3;
    const snapshot = prior.slice();
    const next = fillPolygon(
      prior,
      width,
      height,
      [
        { x: 1, y: 1 },
        { x: 6, y: 1 },
        { x: 6, y: 6 },
      ],
      7,
    );

    expect(prior).toEqual(snapshot);
    expect(next).not.toBe(prior);
  });

  it("returns a copy for fewer than 3 points", () => {
    const width = 4;
    const height = 4;
    const prior = new Uint8Array(width * height);
    prior[0] = 5;
    const next = fillPolygon(prior, width, height, [{ x: 1, y: 1 }], 7);

    expect(next).not.toBe(prior);
    expect(next).toEqual(prior);
  });
});

function spanAtRow(mask: Uint8Array, width: number, row: number): number {
  let minX = width;
  let maxX = 0;
  for (let x = 0; x < width; x += 1) {
    if (mask[row * width + x] !== 0) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }
  return maxX - minX + 1;
}

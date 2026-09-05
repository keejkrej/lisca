import { describe, expect, it } from "vitest";

import { frameWithContrast, toDisplayFrame } from "../src/browser/contrast";
import type { FrameResult } from "@lisca/utils";

function uint16Frame(pixels: number[]): FrameResult {
  return {
    width: pixels.length,
    height: 1,
    pixels: new Uint16Array(pixels),
    pixelType: "uint16",
    contrastDomain: { min: 0, max: 65535 },
    suggestedContrast: { min: 0, max: 65535 },
    appliedContrast: { min: 0, max: 65535 },
  };
}

describe("toDisplayFrame", () => {
  it("renders a legible gradient for an inverted contrast window", () => {
    const out = toDisplayFrame(uint16Frame([10000, 30000, 50000]), { min: 50000, max: 10000 });
    const pixels = out.pixels as Uint8Array;
    expect(pixels[0]).toBe(0);
    expect(pixels[1]).toBeGreaterThan(0);
    expect(pixels[1]).toBeLessThan(255);
    expect(pixels[2]).toBe(255);
    expect(new Set([pixels[0], pixels[1], pixels[2]]).size).toBe(3);
  });

  it("does not collapse an inverted window to a mostly-black binary threshold", () => {
    const out = toDisplayFrame(uint16Frame([10000, 30000, 49999]), { min: 50000, max: 10000 });
    const pixels = out.pixels as Uint8Array;
    expect(new Set([pixels[0], pixels[1], pixels[2]]).size).toBeGreaterThan(1);
    expect(pixels[2]).toBeGreaterThan(pixels[0]);
  });

  it("renders a well-defined threshold for a zero-width contrast window", () => {
    const out = toDisplayFrame(uint16Frame([29999, 30000, 30001]), {
      min: 30000,
      max: 30000,
    });
    const pixels = out.pixels as Uint8Array;
    expect(pixels[0]).toBe(0);
    expect(pixels[1]).toBe(0);
    expect(pixels[2]).toBe(255);
  });

  it("matches the swapped ordered window for an inverted contrast", () => {
    const inverted = toDisplayFrame(uint16Frame([10000, 30000, 50000]), {
      min: 50000,
      max: 10000,
    });
    const ordered = toDisplayFrame(uint16Frame([10000, 30000, 50000]), {
      min: 10000,
      max: 50000,
    });
    for (let index = 0; index < 3; index += 1) {
      expect((inverted.pixels as Uint8Array)[index]).toBe((ordered.pixels as Uint8Array)[index]);
    }
  });

  it("does not regress ordered uint16 contrast mapping", () => {
    const out = toDisplayFrame(uint16Frame([10000, 30000, 50000]), {
      min: 10000,
      max: 50000,
    });
    const pixels = out.pixels as Uint8Array;
    expect(pixels[0]).toBe(0);
    expect(pixels[1]).toBe(128);
    expect(pixels[2]).toBe(255);
  });

  it("returns a uint8 frame for uint16 input", () => {
    const out = toDisplayFrame(uint16Frame([10000, 30000]), { min: 10000, max: 50000 });
    expect(out.pixelType).toBe("uint8");
    expect(out.pixels).toBeInstanceOf(Uint8Array);
    expect(out.width).toBe(2);
    expect(out.height).toBe(1);
    expect(out.contrastDomain).toEqual({ min: 0, max: 255 });
  });

  it("clamps out-of-domain contrast endpoints before rescaling", () => {
    const out = toDisplayFrame(uint16Frame([0, 32768, 65535]), { min: -1000, max: 70000 });
    const pixels = out.pixels as Uint8Array;
    expect(pixels[0]).toBe(0);
    expect(pixels[1]).toBeGreaterThan(0);
    expect(pixels[1]).toBeLessThan(255);
    expect(pixels[2]).toBe(255);
  });

  it("falls back to suggested contrast when explicit contrast is null", () => {
    const frame = uint16Frame([10000, 50000]);
    frame.appliedContrast = undefined;
    frame.suggestedContrast = { min: 10000, max: 50000 };
    const out = toDisplayFrame(frame, null);
    const pixels = out.pixels as Uint8Array;
    expect(pixels[0]).toBe(0);
    expect(pixels[1]).toBe(255);
  });
});

describe("frameWithContrast", () => {
  it("orders an inverted contrast before stamping appliedContrast", () => {
    const frame = uint16Frame([10000, 50000]);
    const stamped = frameWithContrast(frame, { min: 50000, max: 10000 });
    expect(stamped.appliedContrast).toEqual({ min: 10000, max: 50000 });
  });

  it("expands a zero-width contrast before stamping appliedContrast", () => {
    const frame = uint16Frame([10000, 50000]);
    const stamped = frameWithContrast(frame, { min: 30000, max: 30000 });
    expect(stamped.appliedContrast).toEqual({ min: 30000, max: 30001 });
  });

  it("leaves an ordered contrast window ordered", () => {
    const frame = uint16Frame([10000, 50000]);
    const stamped = frameWithContrast(frame, { min: 10000, max: 50000 });
    expect(stamped.appliedContrast).toEqual({ min: 10000, max: 50000 });
  });

  it("returns the frame unchanged for null contrast", () => {
    const frame = uint16Frame([10000, 50000]);
    expect(frameWithContrast(frame, null)).toBe(frame);
  });

  it("stamps a min < max appliedContrast for every degenerate input", () => {
    const frame = uint16Frame([10000, 50000]);
    for (const contrast of [
      { min: 50000, max: 10000 },
      { min: 30000, max: 30000 },
      { min: 65535, max: 65535 },
      { min: 0, max: 0 },
      { min: 65535, max: 0 },
    ]) {
      const stamped = frameWithContrast(frame, contrast);
      expect(stamped.appliedContrast!.min).toBeLessThan(stamped.appliedContrast!.max);
    }
  });
});

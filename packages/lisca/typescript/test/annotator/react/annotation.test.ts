import { describe, expect, test } from "bun:test";

import {
  RoiAnnotationCanvas,
  RoiAnnotationCanvasPanel,
  RoiAnnotationProvider,
  RoiAnnotationToolbar,
  createEmptyMask,
  decodeMaskBase64Png,
  encodeMaskToBase64Png,
  useRoiAnnotation,
} from "../../../src/annotator/react";

describe("annotator react package surface", () => {
  test("exports the annotation components and hooks", () => {
    expect(typeof RoiAnnotationCanvas).toBe("function");
    expect(typeof RoiAnnotationCanvasPanel).toBe("function");
    expect(typeof RoiAnnotationProvider).toBe("function");
    expect(typeof RoiAnnotationToolbar).toBe("function");
    expect(typeof useRoiAnnotation).toBe("function");
  });

  test("creates empty masks with the expected size", () => {
    const mask = createEmptyMask(8, 4);
    expect(mask).toBeInstanceOf(Uint8Array);
    expect(mask.length).toBe(32);
    expect(mask.every((value) => value === 0)).toBe(true);
  });

  test("exports mask PNG helpers", () => {
    expect(typeof decodeMaskBase64Png).toBe("function");
    expect(typeof encodeMaskToBase64Png).toBe("function");
  });
});

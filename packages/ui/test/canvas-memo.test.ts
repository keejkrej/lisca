import { describe, expect, it } from "vitest";

import {
  areAlignCanvasPropsEqual,
  areAnnotationCanvasPropsEqual,
} from "../src/features/canvas-memo";
import type { AlignCanvasProps } from "../src/features/align-canvas";
import type { AnnotationCanvasProps } from "../src/features/annotation-canvas";

describe("areAlignCanvasPropsEqual", () => {
  const base: AlignCanvasProps = {
    frame: null,
    grid: { enabled: true, cellWidth: 1, cellHeight: 1, tx: 0, ty: 0, opacity: 1, rotation: 0, shape: "rect", spacingA: 1, spacingB: 1 },
    onVirtualPointerDown: () => undefined,
  };

  it("returns true when draw-critical props are referentially equal", () => {
    expect(areAlignCanvasPropsEqual(base, { ...base })).toBe(true);
  });

  it("returns false when frame identity changes", () => {
    expect(
      areAlignCanvasPropsEqual(base, {
        ...base,
        frame: { width: 1, height: 1, pixels: new Uint8Array(), pixelType: "uint8" } as AlignCanvasProps["frame"],
      }),
    ).toBe(false);
  });

  it("returns false when pointer handler identity changes", () => {
    expect(
      areAlignCanvasPropsEqual(base, {
        ...base,
        onVirtualPointerDown: () => undefined,
      }),
    ).toBe(false);
  });
});

describe("areAnnotationCanvasPropsEqual", () => {
  const mask = new Uint8Array(4);
  const onMaskCommit = () => undefined;
  const base: AnnotationCanvasProps = {
    frame: null,
    labels: [],
    mask,
    activeLabelId: null,
    tool: "brush",
    brushSize: 4,
    overlayOpacity: 0.5,
    onMaskCommit,
  };

  it("returns true when draw-critical props are referentially equal", () => {
    expect(areAnnotationCanvasPropsEqual(base, { ...base })).toBe(true);
  });

  it("returns false when mask identity changes", () => {
    expect(
      areAnnotationCanvasPropsEqual(base, {
        ...base,
        mask: new Uint8Array(4),
      }),
    ).toBe(false);
  });

  it("returns false when onMaskCommit identity changes", () => {
    expect(
      areAnnotationCanvasPropsEqual(base, {
        ...base,
        onMaskCommit: () => undefined,
      }),
    ).toBe(false);
  });
});

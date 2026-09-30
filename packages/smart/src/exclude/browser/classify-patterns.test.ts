import type { AlignGridPatternBox } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { getSmartExcludeClassifier, loadTransformers, cropPatternToCanvas, resizeCanvasToSquare } =
  vi.hoisted(() => ({
    getSmartExcludeClassifier: vi.fn(),
    loadTransformers: vi.fn(),
    cropPatternToCanvas: vi.fn(),
    resizeCanvasToSquare: vi.fn(),
  }));

vi.mock("./exclude-engine", () => ({
  getSmartExcludeClassifier,
  SMART_EXCLUDE_IMAGE_SIZE: 224,
}));

vi.mock("../../shared/transformers", () => ({
  loadTransformers,
}));

vi.mock("./preprocess", () => ({
  cropPatternToCanvas,
  resizeCanvasToSquare,
}));

import { classifyExclusionCandidates } from "./classify-patterns";

function createFrame(width: number, height: number, value = 128): FrameResult {
  return {
    width,
    height,
    pixels: new Uint16Array(width * height).fill(value),
  };
}

function createPattern(overrides: Partial<AlignGridPatternBox> = {}): AlignGridPatternBox {
  return {
    i: 0,
    j: 0,
    x: 0,
    y: 0,
    w: 2,
    h: 2,
    ...overrides,
  };
}

describe("classifyExclusionCandidates", () => {
  beforeEach(() => {
    getSmartExcludeClassifier.mockReset();
    loadTransformers.mockReset();
    cropPatternToCanvas.mockReset();
    resizeCanvasToSquare.mockReset();
    const canvas = { width: 224, height: 224 };
    cropPatternToCanvas.mockReturnValue(canvas);
    resizeCanvasToSquare.mockReturnValue(canvas);
    loadTransformers.mockResolvedValue({
      RawImage: {
        fromCanvas: () => canvas,
      },
    });
  });

  it("returns empty when there are no candidate patterns", async () => {
    await expect(classifyExclusionCandidates(createFrame(4, 4), [])).resolves.toEqual([]);
    expect(getSmartExcludeClassifier).not.toHaveBeenCalled();
  });

  it("excludes patterns when the exclude label score meets the threshold", async () => {
    const classifier = vi
      .fn()
      .mockResolvedValueOnce([
        { label: "exclude", score: 0.8 },
        { label: "include", score: 0.2 },
      ])
      .mockResolvedValueOnce([
        { label: "exclude", score: 0.1 },
        { label: "include", score: 0.9 },
      ]);
    getSmartExcludeClassifier.mockResolvedValue(classifier);

    const frame = createFrame(4, 4);
    const patterns = [createPattern({ i: 1, j: 2 }), createPattern({ i: 3, j: 4, x: 2, y: 2 })];

    await expect(classifyExclusionCandidates(frame, patterns, { threshold: 0.5 })).resolves.toEqual(
      [{ i: 1, j: 2 }],
    );
    expect(getSmartExcludeClassifier).toHaveBeenCalledTimes(1);
    expect(classifier).toHaveBeenCalledTimes(2);
  });
});

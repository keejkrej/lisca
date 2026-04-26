import { describe, expect, test } from "bun:test";

import type { GridState } from "../../../src/shared/core";
import {
  applyQ20Preset,
  computeBatchCropOverallProgress,
  runBatchCropSequence,
} from "../../../src/viewer/react/app/tools";

const baseGrid: GridState = {
  enabled: true,
  shape: "hex",
  tx: 42,
  ty: -7,
  rotation: 0.35,
  spacingA: 325,
  spacingB: 325,
  cellWidth: 200,
  cellHeight: 200,
  opacity: 0.5,
};

describe("viewer tools", () => {
  test("applyQ20Preset updates only the preset grid fields", () => {
    expect(applyQ20Preset(baseGrid)).toEqual({
      ...baseGrid,
      shape: "square",
      spacingA: 168,
      spacingB: 168,
      cellWidth: 128,
      cellHeight: 128,
    });
  });

  test("runBatchCropSequence continues after failures and stops on cancellation", async () => {
    const result = await runBatchCropSequence([2, 4, 6, 8], async (pos) => {
      if (pos === 4) {
        return { status: "error" as const, error: "disk full" };
      }
      if (pos === 6) {
        return { status: "cancelled" as const };
      }
      return { status: "success" as const };
    });

    expect(result).toEqual({
      total: 4,
      processed: 3,
      succeeded: 1,
      failures: [{ pos: 4, error: "disk full" }],
      cancelledAtPos: 6,
    });
  });

  test("computeBatchCropOverallProgress clamps progress into the batch range", () => {
    expect(computeBatchCropOverallProgress(1, 4, 0.5)).toBe(0.375);
    expect(computeBatchCropOverallProgress(1, 4, -1)).toBe(0.25);
    expect(computeBatchCropOverallProgress(1, 4, 5)).toBe(0.5);
  });
});

import { describe, expect, it } from "vitest";

import {
  OccupancyPromptPackSchema,
  SmartExcludeRequestSchema,
  SmartExcludeResponseSchema,
  decodeJson,
} from "../src/index";

describe("occupancy prompt pack contract", () => {
  it("round-trips an accumulating workspace pack", () => {
    const pack = decodeJson(OccupancyPromptPackSchema, {
      version: 1,
      embedder: "lisca-occupancy-v0",
      threshold: 0,
      examples: [
        { label: "occupied", embedding: [1, 0], i: 0, j: 0, pos: 1 },
        { label: "empty", embedding: [0, 1], i: 1, j: 1, pos: 1 },
      ],
    });
    expect(pack.embedder).toBe("lisca-occupancy-v0");
    expect(pack.examples).toHaveLength(2);
  });

  it("accepts smart-exclude persist fields and pack status on the response", () => {
    const request = decodeJson(SmartExcludeRequestSchema, {
      source: {
        kind: "folder",
        path: "/data",
        subfolderTemplate: "Pos{p}",
        filenameTemplate: "img_{t}",
      },
      request: { pos: 1, time: 0, channel: 0, z: 0 },
      contrast: null,
      cells: [],
      workspacePath: "/data/run",
      persistPromptPack: true,
      appendPromptExamples: true,
      promptExamples: [
        {
          label: "empty",
          cell: { i: 0, j: 1, x: 0, y: 0, w: 8, h: 8 },
        },
      ],
    });
    expect(request.workspacePath).toBe("/data/run");
    expect(request.promptExamples?.[0]?.label).toBe("empty");

    const response = decodeJson(SmartExcludeResponseSchema, {
      excludedCells: [],
      engine: "resnet",
      packReady: false,
      occupiedCount: 1,
      emptyCount: 1,
      message:
        "Not ready yet — need 1 more occupied and 1 more empty examples (have 1 occupied, 1 empty). Bootstrap with Var exclude or mark sites on the canvas. Smart exclude stays on ResNet until then.",
    });
    expect(response.engine).toBe("resnet");
    expect(response.packReady).toBe(false);
  });
});

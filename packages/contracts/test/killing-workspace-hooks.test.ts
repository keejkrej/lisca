import { describe, expect, it } from "vitest";

import { AssayJsonFileSchema, RoiIndexFileSchema, decodeJson } from "../src/index";
import { ASSAY_TYPE, KILLING_ANNOTATION_LABELS, assayUsesChannelRoles } from "../src/assay";

describe("killing workspace contract hooks", () => {
  it("round-trips optional channel identity on roi/PosN/index.json", () => {
    const index = decodeJson(RoiIndexFileSchema, {
      position: 1,
      axisOrder: "TCZYX",
      timeCount: 2,
      channelCount: 3,
      zCount: 1,
      timeIndices: [0, 6],
      channelIndices: [0, 1, 2],
      channelLabels: ["BF", "signal", "tcell"],
      rois: [
        {
          roi: 1,
          fileName: "Roi1.tif",
          bbox: { roi: 1, x: 0, y: 0, w: 4, h: 4 },
        },
      ],
    });
    expect(index.channelIndices).toEqual([0, 1, 2]);
    expect(index.channelLabels).toEqual(["BF", "signal", "tcell"]);
  });

  it("accepts killing assay.json channel roles without putting extras on signal", () => {
    const assay = decodeJson(AssayJsonFileSchema, {
      type: ASSAY_TYPE.KILLING,
      name: "Coculture",
      data: { type: "nd2", path: "/data/run.nd2" },
      workspace: { path: "/data/run" },
      interval: { value: 15, unit: "minute" },
      samples: [{ slideChannel: 0, name: "CAR-T 1:4", positions: "1:12" }],
      analysis: {
        channels: { mask: 0, signal: [1] },
        channelRoles: { brightfield: 0, effector: 2, deathMarker: 3 },
      },
    });
    expect(assay.analysis?.channels?.signal).toEqual([1]);
    expect(assay.analysis?.channelRoles).toEqual({
      brightfield: 0,
      effector: 2,
      deathMarker: 3,
    });
  });

  it("exposes an open killing annotation catalog that includes tumor and T-cell ids", () => {
    expect(assayUsesChannelRoles(ASSAY_TYPE.KILLING)).toBe(true);
    expect(KILLING_ANNOTATION_LABELS.map((label) => label.id)).toEqual([
      "alive",
      "dead",
      "tumor",
      "tcell",
    ]);
  });
});

import type { FrameRequest, WorkspaceScan } from "@lisca/contracts";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import {
  clearStudioAlignFrameMemory,
  lockedStudioSelection,
  recallStudioAlignFrame,
  rememberStudioAlignFrame,
  studioAlignFrameDefault,
  studioAlignFrameMemoryKey,
  studioAlignPositionNav,
} from "../src/studio/source";

const scan: WorkspaceScan = {
  positions: [61, 62, 63, 64],
  channels: [0, 1],
  times: [10, 20, 30],
  zSlices: [0, 1],
};

const current: FrameRequest = { pos: 61, channel: 2, time: 0, z: 4 };

describe("studio align frame", () => {
  beforeEach(() => clearStudioAlignFrameMemory());

  it("uses the first frame for killing and the last frame for transfection", () => {
    expect(studioAlignFrameDefault("killing")).toBe("first");
    expect(studioAlignFrameDefault("transfection")).toBe("last");
    expect(studioAlignFrameDefault(null)).toBe("last");

    expect(
      lockedStudioSelection(scan, current, 0, scan.positions, { frameDefault: "first" }),
    ).toEqual({ pos: 61, channel: 0, time: 10, z: 0 });
    expect(
      lockedStudioSelection(scan, current, 0, scan.positions, { frameDefault: "last" }),
    ).toEqual({ pos: 61, channel: 0, time: 30, z: 0 });
  });

  it("keeps a remembered frame, including frame 0 on a last-frame assay", () => {
    const transfection: WorkspaceScan = { ...scan, times: [0, 10, 20] };
    expect(
      lockedStudioSelection(transfection, current, 0, transfection.positions, {
        frameDefault: "last",
        rememberedTime: 0,
      }),
    ).toEqual({ pos: 61, channel: 0, time: 0, z: 0 });
  });

  it("falls back to the assay default when the remembered frame is not in the scan", () => {
    expect(
      lockedStudioSelection(scan, current, 0, scan.positions, {
        frameDefault: "first",
        rememberedTime: 99,
      }).time,
    ).toBe(10);
  });

  it("clamps the position into the assay list before recalling its frame", () => {
    expect(
      lockedStudioSelection(scan, { ...current, pos: 1 }, 0, [61, 62], {
        frameDefault: "last",
        rememberedTime: 20,
      }),
    ).toEqual({ pos: 61, channel: 0, time: 20, z: 0 });
  });

  it("remembers a frame per position and per assay", () => {
    const killing = studioAlignFrameMemoryKey({
      workspacePath: "/data/run",
      source: { kind: "nd2", path: "/data/run.nd2" },
      assayId: "killing",
    });
    const transfection = studioAlignFrameMemoryKey({
      workspacePath: "/data/run",
      source: { kind: "nd2", path: "/data/run.nd2" },
      assayId: "transfection",
    });
    rememberStudioAlignFrame(killing, 61, 20);
    expect(recallStudioAlignFrame(killing, 61)).toBe(20);
    expect(recallStudioAlignFrame(killing, 62)).toBeUndefined();
    expect(recallStudioAlignFrame(transfection, 61)).toBeUndefined();
  });

  it("enables Next on the first position and Back on the last", () => {
    expect(studioAlignPositionNav([61, 62, 63, 64], 61)).toEqual({
      canGoBack: false,
      canGoNext: true,
    });
    expect(studioAlignPositionNav([61, 62, 63, 64], 63)).toEqual({
      canGoBack: true,
      canGoNext: true,
    });
    expect(studioAlignPositionNav([61, 62, 63, 64], 64)).toEqual({
      canGoBack: true,
      canGoNext: false,
    });
    expect(studioAlignPositionNav([61, 62, 63, 64], 0)).toEqual({
      canGoBack: false,
      canGoNext: false,
    });
  });
});

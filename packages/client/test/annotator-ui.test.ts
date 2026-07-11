import type { RoiPositionScan } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { configureLiscaStorage, type LiscaStorageAdapter } from "@lisca/storage";
import { describe, expect, it, beforeEach } from "vitest";

import {
  createAnnotatorPersist,
  createAnnotatorUiActions,
  createInitialAnnotatorUiState,
  requestKey,
  roiRequestSelectionKey,
  type AnnotatorUiState,
} from "../src/atoms/annotator-ui";

function runReducer(
  state: AnnotatorUiState,
  fn: (
    set: (update: AnnotatorUiState | ((current: AnnotatorUiState) => AnnotatorUiState)) => void,
  ) => void,
): AnnotatorUiState {
  let next = state;
  fn((update) => {
    next = typeof update === "function" ? update(next) : { ...next, ...update };
  });
  return next;
}

const position: RoiPositionScan = {
  pos: 1,
  channels: [0, 1],
  times: [10, 20],
  zSlices: [0, 1],
  rois: [
    {
      roi: 2,
      fileName: "roi.tif",
      bbox: { x: 0, y: 0, width: 64, height: 64 },
      shape: [64, 64, 1, 1, 1],
    },
  ],
};

const frame: FrameResult = {
  width: 64,
  height: 64,
  pixels: new Uint8Array(64 * 64),
  contrastDomain: { min: 0, max: 4095 },
  suggestedContrast: { min: 100, max: 3000 },
};

describe("annotator-ui pure helpers", () => {
  it("builds roiRequestSelectionKey from selection fields", () => {
    expect(
      roiRequestSelectionKey({
        pos: 1,
        roi: 2,
        channel: 0,
        timeIndex: 1,
        zIndex: 0,
      }),
    ).toBe("1:2:0:1:0");
  });

  it("builds requestKey when position, roi, and indices are valid", () => {
    expect(
      requestKey(position, position.rois[0]!, {
        pos: 1,
        roi: 2,
        channel: 0,
        timeIndex: 1,
        zIndex: 1,
      }),
    ).toBe("1:2:0:20:1");
  });

  it("returns none when request inputs are incomplete", () => {
    expect(
      requestKey(null, null, {
        pos: null,
        roi: null,
        channel: null,
        timeIndex: 0,
        zIndex: 0,
      }),
    ).toBe("none");
  });
});

describe("annotator-ui actions", () => {
  const persist = createAnnotatorPersist("test-annotator-session");
  const actions = createAnnotatorUiActions(persist);

  it("setContrast stores manual window and updates slider bounds", () => {
    const initial = createInitialAnnotatorUiState();
    const next = runReducer(initial, (set) => actions.setContrast(set, { min: 50, max: 500 }));
    expect(next.contrast).toEqual({ min: 50, max: 500 });
    expect(next.contrastMin).toBe(50);
    expect(next.contrastMax).toBe(500);
  });

  it("setContrastState derives bounds from frame when contrast is null", () => {
    const initial = createInitialAnnotatorUiState();
    const next = runReducer(initial, (set) => actions.setContrastState(set, frame));
    expect(next.contrastDomain).toEqual({ min: 0, max: 4095 });
    expect(next.contrastMin).toBe(100);
    expect(next.contrastMax).toBe(3000);
  });

  it("setContrastState preserves manual contrast after frame load", () => {
    const withContrast = {
      ...createInitialAnnotatorUiState(),
      contrast: { min: 10, max: 20 },
    };
    const next = runReducer(withContrast, (set) => actions.setContrastState(set, frame));
    expect(next.contrastMin).toBe(10);
    expect(next.contrastMax).toBe(20);
  });

  it("setWorkspacePath resets selection and frame state", () => {
    const withWorkspace = {
      ...createInitialAnnotatorUiState(),
      workspacePath: "/old",
      selection: { pos: 1, roi: 2, channel: 0, timeIndex: 0, zIndex: 0 },
      frame,
      contrast: { min: 1, max: 2 },
    };
    const next = runReducer(withWorkspace, (set) => actions.setWorkspacePath(set, "/new"));
    expect(next.workspacePath).toBe("/new");
    expect(next.selection).toEqual({
      pos: null,
      roi: null,
      channel: null,
      timeIndex: 0,
      zIndex: 0,
    });
    expect(next.frame).toBeNull();
    expect(next.contrast).toBeNull();
  });
});

describe("createAnnotatorPersist", () => {
  function createMemoryStorage(): LiscaStorageAdapter {
    const items = new Map<string, string>();
    return {
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => {
        items.set(key, value);
      },
      removeItem: (key) => {
        items.delete(key);
      },
    };
  }

  beforeEach(() => {
    configureLiscaStorage({
      local: createMemoryStorage(),
      session: createMemoryStorage(),
    });
  });

  it("round-trips workspacePath in session storage", () => {
    const persist = createAnnotatorPersist("test-annotator-session");
    const state = {
      ...createInitialAnnotatorUiState(),
      workspacePath: "/data/ws",
    };
    persist.write(state);
    expect(persist.read()).toEqual({ workspacePath: "/data/ws" });
  });

  it("returns null when workspace is missing", () => {
    const persist = createAnnotatorPersist("test-annotator-session");
    persist.write({
      ...createInitialAnnotatorUiState(),
      workspacePath: null,
    });
    expect(persist.read()).toBeNull();
  });
});

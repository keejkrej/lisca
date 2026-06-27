import { configureLiscaStorage, type LiscaStorageAdapter } from "@lisca/storage";
import { describe, expect, it, beforeEach } from "vitest";
import { normalizeAlignGridState } from "@lisca/utils";

import {
  createAlignUiActions,
  createAlignerPersist,
  createInitialAlignUiState,
  type AlignUiState,
} from "../src/atoms/align-ui";

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

function runReducer(
  state: AlignUiState,
  fn: (set: (update: AlignUiState | ((current: AlignUiState) => AlignUiState)) => void) => void,
): AlignUiState {
  let next = state;
  fn((update) => {
    next = typeof update === "function" ? update(next) : { ...next, ...update };
  });
  return next;
}

describe("align-ui actions", () => {
  const persist = createAlignerPersist("test-aligner-session");
  const actions = createAlignUiActions(persist, {
    clearSourceOnWorkspaceChange: true,
    preserveSelectionOnScan: false,
    skipRedundantSourceSet: false,
    includeApplySavedAlignState: false,
  });

  it("applySourceScan resets frame and sets first scan selection", () => {
    const initial = createInitialAlignUiState();
    const next = runReducer(initial, (set) =>
      actions.applySourceScan(set, "source-key", {
        positions: [2, 4],
        channels: [1],
        times: [0],
        zSlices: [0],
        rois: [],
      }),
    );
    expect(next.scanSourceKey).toBe("source-key");
    expect(next.selection).toEqual({ pos: 2, channel: 1, time: 0, z: 0 });
    expect(next.frame).toBeNull();
    expect(next.grid.enabled).toBe(true);
  });

  it("setWorkspacePath clears source when aligner behavior enabled", () => {
    const withSource = {
      ...createInitialAlignUiState(),
      workspacePath: "/ws",
      source: { kind: "folder", path: "/data" } as const,
    };
    const next = runReducer(withSource, (set) => actions.setWorkspacePath(set, "/other"));
    expect(next.workspacePath).toBe("/other");
    expect(next.source).toBeNull();
  });

  it("applyLoadedFrame applies saved align state when key differs", () => {
    const initialGrid = normalizeAlignGridState({ opacity: 0.2 });
    const savedGrid = normalizeAlignGridState({ opacity: 0.8 });
    const initial = {
      ...createInitialAlignUiState(),
      appliedAlignStateKey: null,
      grid: initialGrid,
    };
    const frame = {
      width: 1,
      height: 1,
      pixels: new Uint8Array([0]),
      contrastDomain: { min: 0, max: 255 },
    };
    const selection = { pos: 1, channel: 0, time: 0, z: 0 };
    const next = runReducer(initial, (set) =>
      actions.applyLoadedFrame(set, selection, frame, {
        stateKey: "pos:1",
        pos: 1,
        saved: {
          grid: savedGrid,
          excludedCells: [{ i: 0, j: 0 }],
        },
      }),
    );
    expect(next.frame).toEqual(frame);
    expect(next.loadedFrameSelection).toEqual(selection);
    expect(next.appliedAlignStateKey).toBe("pos:1");
    expect(next.grid.opacity).toBe(0.8);
    expect(next.excludedCellsByPosition[1]).toEqual([{ i: 0, j: 0 }]);
  });

  it("applyLoadedFrame skips saved state when key already applied", () => {
    const initialGrid = normalizeAlignGridState({ opacity: 0.2 });
    const initial = {
      ...createInitialAlignUiState(),
      appliedAlignStateKey: "pos:1",
      grid: initialGrid,
    };
    const frame = {
      width: 1,
      height: 1,
      pixels: new Uint8Array([0]),
      contrastDomain: { min: 0, max: 255 },
    };
    const next = runReducer(initial, (set) =>
      actions.applyLoadedFrame(set, { pos: 1, channel: 0, time: 0, z: 0 }, frame, {
        stateKey: "pos:1",
        pos: 1,
        saved: {
          grid: normalizeAlignGridState({ opacity: 0.9 }),
          excludedCells: [],
        },
      }),
    );
    expect(next.grid.opacity).toBe(0.2);
  });

  it("setSelection clears appliedAlignStateKey when position changes", () => {
    const initial = {
      ...createInitialAlignUiState(),
      selection: { pos: 1, channel: 0, time: 0, z: 0 },
      appliedAlignStateKey: "pos:1",
    };
    const next = runReducer(initial, (set) => actions.setSelection(set, { pos: 2 }));
    expect(next.selection.pos).toBe(2);
    expect(next.appliedAlignStateKey).toBeNull();
  });

  it("setContrast clears manual contrast window", () => {
    const initial = {
      ...createInitialAlignUiState(),
      contrast: { min: 10, max: 20 },
    };
    const next = runReducer(initial, (set) => actions.setContrast(set, null));
    expect(next.contrast).toBeNull();
  });
});

describe("createAlignerPersist", () => {
  beforeEach(() => {
    configureLiscaStorage({
      local: createMemoryStorage(),
      session: createMemoryStorage(),
    });
  });

  it("round-trips workspace and source in session storage", () => {
    const persist = createAlignerPersist("test-aligner-session");
    const source = {
      kind: "folder" as const,
      path: "/data/src",
      subfolderTemplate: "Pos{pos}",
      filenameTemplate: "img.tif",
    };
    const state = {
      ...createInitialAlignUiState(),
      workspacePath: "/data/ws",
      source,
    };
    persist.write(state);
    expect(persist.read()).toEqual({
      workspacePath: "/data/ws",
      source,
    });
  });

  it("returns null when workspace or source is missing", () => {
    const persist = createAlignerPersist("test-aligner-session");
    persist.write({
      ...createInitialAlignUiState(),
      workspacePath: "/data/ws",
      source: null,
    });
    expect(persist.read()).toBeNull();
  });
});

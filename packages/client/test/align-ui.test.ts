import { configureLiscaStorage, type LiscaStorageAdapter } from "@lisca/utils";
import { describe, expect, it, beforeEach } from "vitest";
import { normalizeAlignGridState } from "@lisca/utils";

import {
  createAlignUiActions,
  createAlignerPersist,
  createInitialAlignUiState,
  createStudioPersist,
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
  const studioActions = createAlignUiActions(persist, {
    clearSourceOnWorkspaceChange: true,
    preserveSelectionOnScan: false,
    skipRedundantSourceSet: false,
    includeApplySavedAlignState: true,
  });

  it("applySourceScan resets frame and sets first scan selection", () => {
    const initial = createInitialAlignUiState();
    const next = runReducer(initial, (set) =>
      actions.applySourceScan(set, "source-key", {
        positions: [2, 4],
        channels: [1],
        times: [0],
        zSlices: [0],
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
      source: {
        kind: "folder",
        path: "/data",
        subfolderTemplate: "Pos{pos}",
        filenameTemplate: "img.tif",
      } as const,
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

  it("applySavedAlignState clears loading status and skips an already-applied key", () => {
    const initial = {
      ...createInitialAlignUiState(),
      grid: normalizeAlignGridState({ opacity: 0.2 }),
      status: "Loading frame",
    };
    const next = runReducer(initial, (set) =>
      studioActions.applySavedAlignState!(set, "pos:1", 1, {
        grid: normalizeAlignGridState({ opacity: 0.8 }),
        excludedCells: [{ i: 0, j: 0 }],
      }),
    );

    expect(next.appliedAlignStateKey).toBe("pos:1");
    expect(next.grid.opacity).toBe(0.8);
    expect(next.excludedCellsByPosition[1]).toEqual([{ i: 0, j: 0 }]);
    expect(next.status).toBeNull();

    const repeated = runReducer(next, (set) =>
      studioActions.applySavedAlignState!(set, "pos:1", 1, {
        grid: normalizeAlignGridState({ opacity: 0.9 }),
        excludedCells: [{ i: 2, j: 2 }],
      }),
    );

    expect(repeated).toBe(next);
    expect(repeated.grid.opacity).toBe(0.8);
    expect(repeated.excludedCellsByPosition[1]).toEqual([{ i: 0, j: 0 }]);
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

  it("sets exclusions for an effective position without relying on the stored selection", () => {
    const initial = {
      ...createInitialAlignUiState(),
      selection: { pos: 1, channel: 0, time: 0, z: 0 },
    };
    const next = runReducer(initial, (set) =>
      actions.setExcludedCellsForPosition(set, 4, [{ i: 2, j: 3 }]),
    );
    expect(next.selection.pos).toBe(1);
    expect(next.excludedCellsByPosition[4]).toEqual([{ i: 2, j: 3 }]);
  });

  it("setContrast clears manual contrast window", () => {
    const initial = {
      ...createInitialAlignUiState(),
      contrast: { min: 10, max: 20 },
    };
    const next = runReducer(initial, (set) => actions.setContrast(set, null));
    expect(next.contrast).toBeNull();
  });

  it("setError returns same state reference when error is unchanged", () => {
    const initial = createInitialAlignUiState();
    const next = runReducer(initial, (set) => actions.setError(set, null));
    expect(next).toBe(initial);
  });

  it("setStatus returns same state reference when status is unchanged", () => {
    const initial = { ...createInitialAlignUiState(), status: "Scanning source" };
    const next = runReducer(initial, (set) => actions.setStatus(set, "Scanning source"));
    expect(next).toBe(initial);
  });

  it("setFrameLoading returns same state reference when unchanged", () => {
    const initial = createInitialAlignUiState();
    const next = runReducer(initial, (set) => actions.setFrameLoading(set, false));
    expect(next).toBe(initial);
  });

  it("defaults manual exclusion to disabled", () => {
    expect(createInitialAlignUiState().manualExclusionEnabled).toBe(false);
  });

  it("defaults both zoom gestures to locked and updates them independently", () => {
    const initial = createInitialAlignUiState();
    expect(initial.spacingZoomLocked).toBe(true);
    expect(initial.patternZoomLocked).toBe(true);

    const spacingUnlocked = runReducer(initial, (set) => actions.setSpacingZoomLocked(set, false));
    expect(spacingUnlocked.spacingZoomLocked).toBe(false);
    expect(spacingUnlocked.patternZoomLocked).toBe(true);

    const patternUnlocked = runReducer(spacingUnlocked, (set) =>
      actions.setPatternZoomLocked(set, false),
    );
    expect(patternUnlocked.spacingZoomLocked).toBe(false);
    expect(patternUnlocked.patternZoomLocked).toBe(false);
  });

  it("setManualExclusionEnabled toggles manual exclusion mode", () => {
    const initial = createInitialAlignUiState();
    const enabled = runReducer(initial, (set) => actions.setManualExclusionEnabled(set, true));
    expect(enabled.manualExclusionEnabled).toBe(true);
    const disabled = runReducer(enabled, (set) => actions.setManualExclusionEnabled(set, false));
    expect(disabled.manualExclusionEnabled).toBe(false);
  });
});

describe("align session persistence", () => {
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
      spacingZoomLocked: false,
      patternZoomLocked: false,
    };
    persist.write(state);
    expect(persist.read()).toEqual({
      workspacePath: "/data/ws",
      source,
      spacingZoomLocked: false,
      patternZoomLocked: false,
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

  it("round-trips workspace, source, selection, and both zoom locks in Studio session storage", () => {
    const persist = createStudioPersist("test-studio-align-session");
    const source = {
      kind: "folder" as const,
      path: "/data/src",
      subfolderTemplate: "Pos{pos}",
      filenameTemplate: "img.tif",
    };
    const selection = { pos: 1, channel: 2, time: 3, z: 4 };
    persist.write({
      ...createInitialAlignUiState(),
      workspacePath: "/data/ws",
      source,
      selection,
      spacingZoomLocked: false,
      patternZoomLocked: false,
    });

    expect(persist.read()).toEqual({
      workspacePath: "/data/ws",
      source,
      selection,
      spacingZoomLocked: false,
      patternZoomLocked: false,
    });
  });

  it("Studio persist returns null when source is missing but workspace is set", () => {
    const persist = createStudioPersist("test-studio-align-session");
    persist.write({
      ...createInitialAlignUiState(),
      workspacePath: "/data/ws",
      source: null,
    });
    expect(persist.read()).toBeNull();
  });

  it("Studio persist returns null when workspacePath is missing", () => {
    const persist = createStudioPersist("test-studio-align-session");
    persist.write({
      ...createInitialAlignUiState(),
      workspacePath: null,
      source: {
        kind: "folder" as const,
        path: "/data/src",
        subfolderTemplate: "Pos{pos}",
        filenameTemplate: "img.tif",
      },
    });
    expect(persist.read()).toBeNull();
  });

  it("Studio persist returns null when workspacePath is blank", () => {
    const persist = createStudioPersist("test-studio-align-session");
    persist.write({
      ...createInitialAlignUiState(),
      workspacePath: "   ",
      source: {
        kind: "folder" as const,
        path: "/data/src",
        subfolderTemplate: "Pos{pos}",
        filenameTemplate: "img.tif",
      },
    });
    expect(persist.read()).toBeNull();
  });
});

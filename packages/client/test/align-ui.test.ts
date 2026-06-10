import { describe, expect, it } from "vitest";

import {
  createAlignUiActions,
  createAlignerPersist,
  createInitialAlignUiState,
  type AlignUiState,
} from "../src/atoms/align-ui.ts";

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
});

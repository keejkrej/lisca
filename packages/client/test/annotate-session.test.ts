import { describe, expect, it } from "vitest";

import {
  createAnnotatorPersist,
  createAnnotatorUiActions,
  createInitialAnnotatorUiState,
  roiRequestSelectionKey,
  type AnnotatorUiState,
} from "../src/atoms/annotator-ui";

describe("annotate-session helpers", () => {
  const persist = createAnnotatorPersist("test-annotator-session");
  const actions = createAnnotatorUiActions(persist);

  it("roiRequestSelectionKey encodes selection dimensions", () => {
    expect(
      roiRequestSelectionKey({
        pos: 1,
        roi: 2,
        channel: 3,
        timeIndex: 4,
        zIndex: 5,
      }),
    ).toBe("1:2:3:4:5");
  });

  it("setWorkspacePath clears frame and selection", () => {
    let state: AnnotatorUiState = {
      ...createInitialAnnotatorUiState(),
      workspacePath: "/old",
      selection: { pos: 1, roi: 1, channel: 0, timeIndex: 0, zIndex: 0 },
      frame: { width: 10, height: 10 } as never,
    };
    const set = (update: AnnotatorUiState | ((current: AnnotatorUiState) => AnnotatorUiState)) => {
      state = typeof update === "function" ? update(state) : update;
    };
    actions.setWorkspacePath(set, "/new");
    expect(state.workspacePath).toBe("/new");
    expect(state.selection.pos).toBeNull();
    expect(state.frame).toBeNull();
  });
});

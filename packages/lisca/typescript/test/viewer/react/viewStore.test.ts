import { afterEach, describe, expect, test } from "bun:test";

import {
  IDLE_SAVE_STATE,
  resetExcludedCells,
  viewStore,
} from "../../../src/viewer/react/app/viewStore";

const initialState = { ...viewStore.getState() };

afterEach(() => {
  viewStore.setState({ ...initialState });
});

describe("viewer store exclusion actions", () => {
  test("resetExcludedCells clears only the requested position", () => {
    viewStore.setState({
      ...initialState,
      source: { kind: "tif", path: "/tmp/source" },
      selection: { pos: 2, channel: 0, time: 0, z: 0 },
      excludedCellIdsByPosition: {
        2: ["0:0", "0:1"],
        3: ["1:1"],
      },
      saveState: { type: "success", message: "Saved bbox CSV for Pos2" },
    });

    resetExcludedCells(2);

    expect(viewStore.getState().excludedCellIdsByPosition).toEqual({
      3: ["1:1"],
    });
    expect(viewStore.getState().saveState).toEqual(IDLE_SAVE_STATE);
  });
});

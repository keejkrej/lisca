import { afterEach, describe, expect, test } from "bun:test";

import {
  applySavedAlignState,
  IDLE_SAVE_STATE,
  resetExcludedCells,
  viewerStore,
} from "../../../src/viewer/react/app/viewerStore";

const initialState = { ...viewerStore.getState() };

afterEach(() => {
  viewerStore.setState({ ...initialState });
});

describe("viewer store exclusion actions", () => {
  test("resetExcludedCells clears only the requested position", () => {
    viewerStore.setState({
      ...initialState,
      source: { kind: "tif", path: "/tmp/source" },
      selection: { pos: 2, channel: 0, time: 0, z: 0 },
      excludedCellsByPosition: {
        2: [{ i: 0, j: 0 }, { i: 0, j: 1 }],
        3: [{ i: 1, j: 1 }],
      },
      saveState: { type: "success", message: "Saved bbox CSV for Pos2" },
    });

    resetExcludedCells(2);

    expect(viewerStore.getState().excludedCellsByPosition).toEqual({
      3: [{ i: 1, j: 1 }],
    });
    expect(viewerStore.getState().saveState).toEqual(IDLE_SAVE_STATE);
  });

  test("applySavedAlignState replaces the grid and excluded cells for the position", () => {
    viewerStore.setState({
      ...initialState,
      source: { kind: "tif", path: "/tmp/source" },
      selection: { pos: 5, channel: 0, time: 0, z: 0 },
      grid: {
        enabled: false,
        shape: "square",
        tx: 0,
        ty: 0,
        rotation: 0,
        spacingA: 325,
        spacingB: 325,
        cellWidth: 200,
        cellHeight: 200,
        opacity: 0.35,
      },
      excludedCellsByPosition: {
        5: [{ i: 0, j: 0 }],
        9: [{ i: 1, j: 1 }],
      },
    });

    applySavedAlignState(5, {
      grid: {
        enabled: true,
        shape: "hex",
        tx: 10,
        ty: 11,
        rotation: 0.5,
        spacingA: 150,
        spacingB: 175,
        cellWidth: 90,
        cellHeight: 95,
        opacity: 0.4,
      },
      excludedCells: [{ i: 3, j: 4 }],
    });

    expect(viewerStore.getState().grid).toEqual({
      enabled: true,
      shape: "hex",
      tx: 10,
      ty: 11,
      rotation: 0.5,
      spacingA: 150,
      spacingB: 175,
      cellWidth: 90,
      cellHeight: 95,
      opacity: 0.4,
    });
    expect(viewerStore.getState().excludedCellsByPosition).toEqual({
      5: [{ i: 3, j: 4 }],
      9: [{ i: 1, j: 1 }],
    });
  });

  test("applySavedAlignState keeps the current grid and clears exclusions when no saved state exists", () => {
    viewerStore.setState({
      ...initialState,
      source: { kind: "tif", path: "/tmp/source" },
      selection: { pos: 6, channel: 0, time: 0, z: 0 },
      grid: {
        enabled: true,
        shape: "hex",
        tx: 4,
        ty: 5,
        rotation: 0.25,
        spacingA: 140,
        spacingB: 145,
        cellWidth: 80,
        cellHeight: 82,
        opacity: 0.45,
      },
      excludedCellsByPosition: {
        6: [{ i: 8, j: 9 }],
      },
    });

    applySavedAlignState(6, null);

    expect(viewerStore.getState().grid).toEqual({
      enabled: true,
      shape: "hex",
      tx: 4,
      ty: 5,
      rotation: 0.25,
      spacingA: 140,
      spacingB: 145,
      cellWidth: 80,
      cellHeight: 82,
      opacity: 0.45,
    });
    expect(viewerStore.getState().excludedCellsByPosition).toEqual({});
  });
});

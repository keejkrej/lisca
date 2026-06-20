import { describe, expect, it } from "vitest";

import {
  initialShellLayoutPanelState,
  isPortraitViewport,
  shellLayoutReducer,
} from "../src/shell-layout";

describe("shell-layout", () => {
  it("isPortraitViewport compares height and width", () => {
    expect(isPortraitViewport(800, 1200)).toBe(true);
    expect(isPortraitViewport(1200, 800)).toBe(false);
    expect(isPortraitViewport(900, 900)).toBe(false);
  });

  it("toggle-left opens left and closes right", () => {
    expect(shellLayoutReducer(initialShellLayoutPanelState, { type: "toggle-left" })).toEqual({
      leftOpen: true,
      rightOpen: false,
    });
    expect(
      shellLayoutReducer({ leftOpen: true, rightOpen: false }, { type: "toggle-left" }),
    ).toEqual({ leftOpen: false, rightOpen: false });
    expect(
      shellLayoutReducer({ leftOpen: false, rightOpen: true }, { type: "toggle-left" }),
    ).toEqual({ leftOpen: true, rightOpen: false });
  });

  it("toggle-right opens right and closes left", () => {
    expect(shellLayoutReducer(initialShellLayoutPanelState, { type: "toggle-right" })).toEqual({
      leftOpen: false,
      rightOpen: true,
    });
    expect(
      shellLayoutReducer({ leftOpen: true, rightOpen: false }, { type: "toggle-right" }),
    ).toEqual({ leftOpen: false, rightOpen: true });
  });

  it("close and portrait-changed collapse panels", () => {
    const open = { leftOpen: true, rightOpen: true };
    expect(shellLayoutReducer(open, { type: "close" })).toEqual(initialShellLayoutPanelState);
    expect(shellLayoutReducer(open, { type: "portrait-changed", isPortrait: true })).toEqual(
      initialShellLayoutPanelState,
    );
    expect(shellLayoutReducer(open, { type: "portrait-changed", isPortrait: false })).toEqual(open);
  });
});

import { describe, expect, it } from "vitest";

import {
  initialShellLayoutPanelState,
  isPortraitViewport,
  isStageOverlayViewport,
  shellLayoutReducer,
  STAGE_SHELL_INLINE_MIN_WIDTH,
} from "../src/shell-layout";

describe("shell-layout", () => {
  it("isPortraitViewport compares height and width", () => {
    expect(isPortraitViewport(800, 1200)).toBe(true);
    expect(isPortraitViewport(1200, 800)).toBe(false);
    expect(isPortraitViewport(900, 900)).toBe(true);
  });

  it("uses overlay rails when the stage cannot preserve a usable center workspace", () => {
    expect(STAGE_SHELL_INLINE_MIN_WIDTH).toBe(1024);
    expect(isStageOverlayViewport(1440, 900)).toBe(false);
    expect(isStageOverlayViewport(1024, 700)).toBe(false);
    expect(isStageOverlayViewport(900, 700)).toBe(true);
    expect(isStageOverlayViewport(800, 600)).toBe(true);
    expect(isStageOverlayViewport(1200, 1300)).toBe(true);
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

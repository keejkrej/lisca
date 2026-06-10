import { describe, expect, it } from "vitest";

import {
  canvasToastPresentation,
  shouldHideToastText,
  shouldShowLoadingIcon,
} from "../src/canvas-status";

describe("canvas-status", () => {
  it("detects loading toasts from message text", () => {
    expect(shouldShowLoadingIcon({ text: "Loading frame" })).toBe(true);
    expect(shouldShowLoadingIcon({ text: "Scanning workspace" })).toBe(true);
    expect(shouldShowLoadingIcon({ text: "Ready", tone: "success" })).toBe(false);
  });

  it("hides toast text for loading-only messages", () => {
    expect(shouldHideToastText({ text: "Preview update" })).toBe(true);
    expect(shouldHideToastText({ text: "Saved", tone: "success" })).toBe(false);
  });

  it("classifies toast presentation", () => {
    expect(canvasToastPresentation({ text: "Failed", tone: "error" })).toBe("error");
    expect(canvasToastPresentation({ text: "Loading" })).toBe("loading");
    expect(canvasToastPresentation({ text: "Done", tone: "success" })).toBe("text");
  });
});

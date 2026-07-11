import { describe, expect, it } from "vitest";

import {
  canvasToastPresentation,
  shouldHideToastText,
  shouldShowLoadingIcon,
} from "../src/canvas-status";

describe("canvas-status", () => {
  it("does not show loading spinner icons in canvas toasts", () => {
    expect(shouldShowLoadingIcon({ text: "Loading frame" })).toBe(false);
    expect(shouldShowLoadingIcon({ text: "Scanning workspace" })).toBe(false);
    expect(shouldShowLoadingIcon({ text: "Ready", tone: "success" })).toBe(false);
  });

  it("keeps toast text visible for loading messages", () => {
    expect(shouldHideToastText({ text: "Loading frame" })).toBe(false);
    expect(shouldHideToastText({ text: "Preview update" })).toBe(false);
    expect(shouldHideToastText({ text: "Saved", tone: "success" })).toBe(false);
  });

  it("classifies toast presentation", () => {
    expect(canvasToastPresentation({ text: "Failed", tone: "error" })).toBe("error");
    expect(canvasToastPresentation({ text: "Loading frame" })).toBe("text");
    expect(canvasToastPresentation({ text: "Done", tone: "success" })).toBe("text");
  });
});
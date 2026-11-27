import { describe, expect, it, vi } from "vite-plus/test";

import { selectAnnotateDock } from "../src/state/annotate-page-selectors";
import type { AnnotateState } from "../src/state/use-annotate-state";

describe("annotate page selectors", () => {
  it("keeps state values and callback targets live after construction", () => {
    let mode: "classification" | "segmentation" = "classification";
    let canEditSegmentation = false;
    let labelDialogOpen = false;
    let filePickerOpen = false;
    let setTool = vi.fn();

    const state = {
      get mode() {
        return mode;
      },
      tool: "brush",
      request: null,
      canSave: false,
      saving: false,
      canGoBack: false,
      canGoNext: false,
      get canEditSegmentation() {
        return canEditSegmentation;
      },
      get labelDialogOpen() {
        return labelDialogOpen;
      },
      get filePickerOpen() {
        return filePickerOpen;
      },
      get setTool() {
        return setTool;
      },
      handleSave: vi.fn(),
      goBack: vi.fn(),
      goNext: vi.fn(),
    } as unknown as AnnotateState;

    const dock = selectAnnotateDock(() => state);
    const stableSetTool = dock.setTool;

    expect(dock.mode).toBe("classification");
    expect(dock.shortcutsEnabled).toBe(false);

    mode = "segmentation";
    canEditSegmentation = true;
    expect(dock.mode).toBe("segmentation");
    expect(dock.shortcutsEnabled).toBe(true);

    labelDialogOpen = true;
    expect(dock.shortcutsEnabled).toBe(false);
    labelDialogOpen = false;
    filePickerOpen = true;
    expect(dock.shortcutsEnabled).toBe(false);

    const replacement = vi.fn();
    setTool = replacement;
    stableSetTool("smart");
    expect(replacement).toHaveBeenCalledWith("smart");
  });
});

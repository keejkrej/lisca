import { describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
}));

vi.mock("../src/state/annotate-page-context", () => ({
  useAnnotatePage: () => ({ state: fixture.state }),
}));

import { useAnnotateDock } from "../src/state/annotate-page-selectors";

describe("annotate page selectors", () => {
  it("keeps state values and callback targets live after construction", () => {
    let mode: "classification" | "segmentation" = "classification";
    let canEditSegmentation = false;
    let labelDialogOpen = false;
    let filePickerOpen = false;
    let setTool = vi.fn();

    fixture.state = {
      get mode() {
        return mode;
      },
      tool: "brush",
      request: null,
      canSave: false,
      saving: false,
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
    };

    const dock = useAnnotateDock();
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

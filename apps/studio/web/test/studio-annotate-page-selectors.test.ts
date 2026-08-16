import { describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
}));

vi.mock("../src/state/studio-annotate-page-context", () => ({
  useStudioAnnotatePage: () => ({ state: fixture.state }),
}));

import { useStudioAnnotateDock } from "../src/state/studio-annotate-page-selectors";

describe("Studio annotate page selectors", () => {
  it("keeps navigation and analysis state live after construction", () => {
    let mode: "classification" | "segmentation" = "classification";
    let canEditSegmentation = false;
    let labelDialogOpen = false;
    let canGoToNextSite = false;
    let analysisProgress: { status: "queued" | "running" | "completed" } | null = null;
    let goToNextSite = vi.fn();

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
      scanLoading: false,
      scan: null,
      frameLoading: false,
      workspaceMissing: false,
      get analysisProgress() {
        return analysisProgress;
      },
      get canGoToNextSite() {
        return canGoToNextSite;
      },
      setTool: vi.fn(),
      handleSave: vi.fn(),
      get goToNextSite() {
        return goToNextSite;
      },
      shuffleSelection: vi.fn(),
      requestContinueToAnalysis: vi.fn(),
    };

    const dock = useStudioAnnotateDock();
    const stableGoToNextSite = dock.goToNextSite;

    expect(dock.shortcutsEnabled).toBe(false);
    expect(dock.analysisBusy).toBe(false);
    expect(dock.canGoToNextSite).toBe(false);

    mode = "segmentation";
    canEditSegmentation = true;
    analysisProgress = { status: "running" };
    canGoToNextSite = true;
    expect(dock.shortcutsEnabled).toBe(true);
    expect(dock.analysisBusy).toBe(true);
    expect(dock.canGoToNextSite).toBe(true);

    analysisProgress = { status: "completed" };
    expect(dock.analysisBusy).toBe(false);

    const replacement = vi.fn();
    goToNextSite = replacement;
    stableGoToNextSite();
    expect(replacement).toHaveBeenCalledOnce();
  });
});

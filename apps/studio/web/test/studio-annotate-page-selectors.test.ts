import { describe, expect, it, vi } from "vite-plus/test";

import { selectStudioAnnotateDock } from "../src/state/studio-annotate-page-selectors";
import type { StudioAnnotateState } from "../src/state/use-studio-annotate-state";

describe("Studio annotate page selectors", () => {
  it("derives navigation, shortcuts, and analysis busy state from StudioAnnotateState snapshots", () => {
    let mode: "classification" | "segmentation" = "classification";
    let canEditSegmentation = false;
    let labelDialogOpen = false;
    let canGoToNextSite = false;
    let analysisProgress: { status: "queued" | "running" | "completed" } | null = null;
    let goToNextSite = vi.fn();

    const state = {
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
      canGoToPreviousSite: false,
      setTool: vi.fn(),
      handleSave: vi.fn(),
      get goToNextSite() {
        return goToNextSite;
      },
      goToPreviousSite: vi.fn(),
      requestContinueToAnalysis: vi.fn(),
    } as unknown as StudioAnnotateState;

    const initialDock = selectStudioAnnotateDock(state);
    expect(initialDock.shortcutsEnabled).toBe(false);
    expect(initialDock.analysisBusy).toBe(false);
    expect(initialDock.canGoToNextSite).toBe(false);

    mode = "segmentation";
    canEditSegmentation = true;
    analysisProgress = { status: "running" };
    canGoToNextSite = true;
    const runningDock = selectStudioAnnotateDock(state);
    expect(runningDock.shortcutsEnabled).toBe(true);
    expect(runningDock.analysisBusy).toBe(true);
    expect(runningDock.canGoToNextSite).toBe(true);

    labelDialogOpen = true;
    expect(selectStudioAnnotateDock(state).shortcutsEnabled).toBe(false);
    labelDialogOpen = false;

    analysisProgress = { status: "completed" };
    expect(selectStudioAnnotateDock(state).analysisBusy).toBe(false);

    const replacement = vi.fn();
    goToNextSite = replacement;
    selectStudioAnnotateDock(state).goToNextSite();
    expect(replacement).toHaveBeenCalledOnce();
  });
});

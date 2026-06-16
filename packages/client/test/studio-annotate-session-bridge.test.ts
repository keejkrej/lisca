import { describe, expect, it } from "vitest";

import type { AnnotatorUiState } from "../src/atoms/annotator-ui";
import {
  applyAnnotatorUiPatch,
  studioAnnotateToAnnotatorUi,
} from "../src/session/studio-annotate-session-bridge";

function studioState(overrides: Partial<AnnotatorUiState> = {}): AnnotatorUiState {
  return {
    workspacePath: "/tmp/ws",
    selection: { pos: 1, roi: 2, channel: 0, timeIndex: 0, zIndex: 0 },
    activeLabelId: "alive",
    mode: "classification",
    tool: "brush",
    brushSize: 8,
    overlayOpacity: 0.5,
    frame: null,
    contrast: null,
    contrastDomain: { min: 0, max: 255 },
    contrastMin: 0,
    contrastMax: 255,
    frameLoading: false,
    annotationLoading: false,
    saving: false,
    scanError: null,
    frameError: null,
    annotationError: null,
    saveError: null,
    labelError: null,
    status: null,
    labelDialogOpen: false,
    ...overrides,
  };
}

describe("studio-annotate-session-bridge", () => {
  it("round-trips annotator UI fields through applyAnnotatorUiPatch", () => {
    const current = studioState();
    const next = applyAnnotatorUiPatch(current, (state) => ({
      ...state,
      mode: "classification",
      tool: "eraser",
      brushSize: 12,
      activeLabelId: "dead",
      overlayOpacity: 0.75,
      labelDialogOpen: true,
    }));

    expect(next.mode).toBe("classification");
    expect(next.tool).toBe("eraser");
    expect(next.brushSize).toBe(12);
    expect(next.activeLabelId).toBe("dead");
    expect(next.overlayOpacity).toBe(0.75);
    expect(next.labelDialogOpen).toBe(true);
  });

  it("passes through studio state unchanged in studioAnnotateToAnnotatorUi", () => {
    const state = studioState({ mode: "classification", tool: "smart" });
    expect(studioAnnotateToAnnotatorUi(state)).toEqual(state);
  });
});

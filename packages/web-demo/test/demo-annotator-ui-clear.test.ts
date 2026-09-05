import { describe, expect, it } from "vitest";

import { emptyAnnotationValue } from "../src/annotation-value";
import {
  createInitialDemoAnnotatorUiState,
  currentDemoAnnotation,
  demoAnnotatorUiActions,
  demoAnnotatorUiAtom,
  demoAnnotationDirty,
  selectDemoAnnotatorSession,
  type DemoAnnotatorUiState,
} from "../src/atoms/demo-annotator-ui";
import { resolveNextValue, type StateUpdater } from "../src/atoms/state-utils";

const FRAME_A: { width: number; height: number; pixels: Uint16Array } = {
  width: 4,
  height: 4,
  pixels: new Uint16Array(16),
};

function createSetter(
  onChange: (next: DemoAnnotatorUiState) => void,
): (update: StateUpdater<DemoAnnotatorUiState>) => void {
  let state = createInitialDemoAnnotatorUiState();
  return (update) => {
    state = resolveNextValue(state, update);
    onChange(state);
  };
}

describe("clearLoadedImage annotation invariant", () => {
  it("resets the annotation history, index, and saved value to the empty no-frame baseline", () => {
    let state = createInitialDemoAnnotatorUiState();
    const set = createSetter((next) => {
      state = next;
    });

    // Load frame A and commit an edit so the annotation is dirty.
    demoAnnotatorUiActions.applyLoadedImage(set, "a.png", FRAME_A);
    const edited = emptyAnnotationValue(FRAME_A);
    edited.classificationLabelId = "class-1";
    demoAnnotatorUiActions.commitAnnotation(set, edited);

    expect(state.frame).toBe(FRAME_A);
    expect(demoAnnotationDirty(state)).toBe(true);
    expect(currentDemoAnnotation(state).mask.length).toBe(FRAME_A.width * FRAME_A.height);

    // Simulate a failed image load: clearLoadedImage should reset the annotation
    // to the same no-image baseline as createInitialDemoAnnotatorUiState.
    demoAnnotatorUiActions.clearLoadedImage(set);

    expect(state.frame).toBeNull();
    expect(state.fileName).toBeNull();
    expect(state.error).toBeNull();
    expect(state.status).toBeNull();

    // The dropped useEffect([frame]) invariant: frame === null => empty, non-dirty annotation.
    expect(demoAnnotationDirty(state)).toBe(false);
    expect(currentDemoAnnotation(state).classificationLabelId).toBeNull();
    expect(currentDemoAnnotation(state).mask).toEqual(new Uint8Array());
    expect(currentDemoAnnotation(state).mask.length).toBe(0);

    // History/saved realign to the empty baseline (single entry, index 0).
    expect(state.annotationHistory).toHaveLength(1);
    expect(state.annotationIndex).toBe(0);
    expect(state.annotationSaved).toEqual(emptyAnnotationValue(null));

    // The persisted session no longer carries a stale-length mask for a dead frame.
    const session = selectDemoAnnotatorSession(state);
    expect(session.frame).toBeNull();
    expect(session.fileName).toBeNull();
    expect(session.annotation.mask).toEqual(new Uint8Array());
    expect(session.annotation.classificationLabelId).toBeNull();
  });

  it("clearLoadedImage on the fresh initial state stays non-dirty with no frame", () => {
    let state = createInitialDemoAnnotatorUiState();
    const set = createSetter((next) => {
      state = next;
    });

    demoAnnotatorUiActions.clearLoadedImage(set);

    expect(state.frame).toBeNull();
    expect(demoAnnotationDirty(state)).toBe(false);
    expect(currentDemoAnnotation(state).mask).toEqual(new Uint8Array());
  });

  it("keeps the initial state seeded to the empty, non-dirty no-image baseline", () => {
    const seeded = createInitialDemoAnnotatorUiState();
    expect(seeded.frame).toBeNull();
    expect(seeded.annotationHistory).toHaveLength(1);
    expect(seeded.annotationIndex).toBe(0);
    expect(demoAnnotationDirty(seeded)).toBe(false);
    // Touching the module-level atom import keeps it in the test graph; it is seeded
    // the exact same way and must also satisfy the invariant.
    void demoAnnotatorUiAtom;
  });
});

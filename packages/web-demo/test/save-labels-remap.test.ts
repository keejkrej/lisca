import { describe, expect, it } from "vitest";

import {
  createInitialDemoAnnotatorUiState,
  currentDemoAnnotation,
  DEFAULT_ANNOTATOR_DEMO_LABELS,
  demoAnnotatorUiActions,
  type DemoAnnotatorUiState,
} from "../src/atoms/demo-annotator-ui";
import { resolveNextValue, type StateUpdater } from "../src/atoms/state-utils";

type Store = {
  get: () => DemoAnnotatorUiState;
  set: (update: StateUpdater<DemoAnnotatorUiState>) => void;
};

function createStore(): Store {
  let state = createInitialDemoAnnotatorUiState();
  return {
    get: () => state,
    set: (update) => {
      state = resolveNextValue(state, update);
    },
  };
}

function loadFrame(store: Store, width = 6, height = 1): void {
  demoAnnotatorUiActions.applyLoadedImage(store.set, "sample.png", {
    width,
    height,
    pixels: new Uint16Array(width * height),
  });
}

function paint(store: Store, labelId: string, pixelIndex: number): void {
  demoAnnotatorUiActions.setActiveLabelId(store.set, labelId);
  const state = store.get();
  const activeLabelValue = state.labels.findIndex((label) => label.id === labelId) + 1;
  const current = currentDemoAnnotation(state);
  const mask = current.mask.slice();
  mask[pixelIndex] = activeLabelValue;
  demoAnnotatorUiActions.commitAnnotation(store.set, {
    classificationLabelId: current.classificationLabelId,
    mask,
  });
}

function expectMask(store: Store, expected: number[]): void {
  expect(Array.from(currentDemoAnnotation(store.get()).mask)).toEqual(expected);
}

const CLASS_1 = DEFAULT_ANNOTATOR_DEMO_LABELS[0]!;
const CLASS_2 = DEFAULT_ANNOTATOR_DEMO_LABELS[1]!;
const CLASS_3 = DEFAULT_ANNOTATOR_DEMO_LABELS[2]!;

describe("demoAnnotatorUiActions.saveLabels mask remap", () => {
  it("remaps survivors and clears the deleted label when the leading label is removed", () => {
    const store = createStore();
    loadFrame(store);
    paint(store, "class-2", 0);
    paint(store, "class-3", 1);
    paint(store, "class-1", 2);

    demoAnnotatorUiActions.saveLabels(store.set, [CLASS_2, CLASS_3]);

    expectMask(store, [1, 2, 0, 0, 0, 0]);
  });

  it("remaps survivors and clears the deleted middle label's own strokes", () => {
    const store = createStore();
    loadFrame(store);
    paint(store, "class-1", 0);
    paint(store, "class-2", 1);
    paint(store, "class-3", 2);

    demoAnnotatorUiActions.saveLabels(store.set, [CLASS_1, CLASS_3]);

    expectMask(store, [1, 0, 2, 0, 0, 0]);
  });

  it("clears the trailing label's strokes and leaves earlier survivors unchanged", () => {
    const store = createStore();
    loadFrame(store);
    paint(store, "class-1", 0);
    paint(store, "class-2", 1);
    paint(store, "class-3", 2);

    demoAnnotatorUiActions.saveLabels(store.set, [CLASS_1, CLASS_2]);

    expectMask(store, [1, 2, 0, 0, 0, 0]);
  });

  it("keeps existing strokes attached when a label is appended", () => {
    const store = createStore();
    loadFrame(store);
    paint(store, "class-2", 0);

    demoAnnotatorUiActions.saveLabels(store.set, [
      ...DEFAULT_ANNOTATOR_DEMO_LABELS,
      { id: "class-4", name: "Class 4", color: "#a855f7" },
    ]);

    expectMask(store, [2, 0, 0, 0, 0, 0]);
  });

  it("keeps strokes attached to a label renamed in place (id changes, position preserved)", () => {
    const store = createStore();
    loadFrame(store);
    paint(store, "class-2", 0);
    paint(store, "class-3", 1);

    demoAnnotatorUiActions.saveLabels(store.set, [
      CLASS_1,
      { id: "nuclei", name: "Nuclei", color: CLASS_2.color },
      CLASS_3,
    ]);

    expectMask(store, [2, 3, 0, 0, 0, 0]);
  });

  it("keeps strokes attached when a surviving label's color is edited", () => {
    const store = createStore();
    loadFrame(store);
    paint(store, "class-2", 0);

    demoAnnotatorUiActions.saveLabels(store.set, [
      CLASS_1,
      { id: "class-2", name: "Class 2", color: "#a855f7" },
      CLASS_3,
    ]);

    expectMask(store, [2, 0, 0, 0, 0, 0]);
  });

  it("clamps activeLabelId to the first surviving label when the active label is deleted", () => {
    const store = createStore();
    demoAnnotatorUiActions.setActiveLabelId(store.set, "class-2");

    demoAnnotatorUiActions.saveLabels(store.set, [CLASS_1, CLASS_3]);

    expect(store.get().activeLabelId).toBe("class-1");
  });

  it("remaps every annotationHistory entry so undo/redo stay consistent with the new labels", () => {
    const store = createStore();
    loadFrame(store);
    paint(store, "class-1", 0);
    paint(store, "class-2", 1);

    demoAnnotatorUiActions.saveLabels(store.set, [CLASS_2, CLASS_3]);

    expect(Array.from(currentDemoAnnotation(store.get()).mask)).toEqual([0, 1, 0, 0, 0, 0]);
    demoAnnotatorUiActions.undoAnnotation(store.set);
    expect(Array.from(currentDemoAnnotation(store.get()).mask)).toEqual([0, 0, 0, 0, 0, 0]);
    demoAnnotatorUiActions.redoAnnotation(store.set);
    demoAnnotatorUiActions.redoAnnotation(store.set);
    expect(Array.from(currentDemoAnnotation(store.get()).mask)).toEqual([0, 1, 0, 0, 0, 0]);
  });

  it("remaps annotationSaved so Discard restores correctly-labeled bytes after a post-save edit", () => {
    const store = createStore();
    loadFrame(store);
    paint(store, "class-2", 0);
    paint(store, "class-3", 1);
    demoAnnotatorUiActions.markAnnotationSaved(store.set);

    demoAnnotatorUiActions.saveLabels(store.set, [CLASS_2, CLASS_3]);

    paint(store, "class-2", 2);
    demoAnnotatorUiActions.discardAnnotation(store.set);

    expect(Array.from(currentDemoAnnotation(store.get()).mask)).toEqual([1, 2, 0, 0, 0, 0]);
    expect(Array.from(store.get().annotationSaved.mask)).toEqual([1, 2, 0, 0, 0, 0]);
  });

  it("does not throw when no frame is loaded and the masks are empty", () => {
    const store = createStore();
    expect(() => demoAnnotatorUiActions.saveLabels(store.set, [CLASS_2, CLASS_3])).not.toThrow();
    expect(store.get().labels.map((label) => label.id)).toEqual(["class-2", "class-3"]);
    expect(store.get().annotationSaved.mask.length).toBe(0);
  });
});

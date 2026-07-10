import type { FrameResult } from "@lisca/utils";
import { createEffect, createMemo, createSignal } from "solid-js";
import {
  annotationValuesEqual,
  cloneAnnotationValue,
  createEmptyMask,
  type AnnotationValue,
} from "../utils/annotation-utils";

export type AnnotationHistory = {
  history: AnnotationValue[];
  index: number;
};

export function emptyValueFor(frame: FrameResult | null): AnnotationValue {
  return {
    classificationLabelId: null,
    mask: frame ? createEmptyMask(frame.width, frame.height) : new Uint8Array(),
  };
}

export function useAnnotationHistory(frame: FrameResult | null) {
  const [initialValue, setInitialValue] = createSignal<AnnotationValue>(emptyValueFor(null));
  const [state, setState] = createSignal<AnnotationHistory>({
    history: [emptyValueFor(null)],
    index: 0,
  });
  const current = createMemo(() => state().history[state().index] ?? initialValue());
  const dirty = createMemo(() => !annotationValuesEqual(current(), initialValue()));
  const reset = (value: AnnotationValue) => {
    const next = cloneAnnotationValue(value);
    setInitialValue(next);
    setState({
      history: [cloneAnnotationValue(next)],
      index: 0,
    });
  };
  const commit = (value: AnnotationValue) => {
    setState((currentState) => {
      const active = currentState.history[currentState.index];
      if (active && annotationValuesEqual(active, value)) return currentState;
      const history = currentState.history
        .slice(0, currentState.index + 1)
        .map(cloneAnnotationValue);
      history.push(cloneAnnotationValue(value));
      return {
        history,
        index: history.length - 1,
      };
    });
  };
  createEffect(() => {
    if (!frame) {
      const next = cloneAnnotationValue(emptyValueFor(null));
      setInitialValue(next);
      setState({ history: [cloneAnnotationValue(next)], index: 0 });
    }
  });
  return {
    get current() {
      return current();
    },
    get dirty() {
      return dirty();
    },
    get canUndo() {
      return state().index > 0;
    },
    get canRedo() {
      return state().index < state().history.length - 1;
    },
    reset,
    commit,
    undo: () =>
      setState((value) => ({
        ...value,
        index: Math.max(0, value.index - 1),
      })),
    redo: () =>
      setState((value) => ({
        ...value,
        index: Math.min(value.history.length - 1, value.index + 1),
      })),
    discard: () => reset(initialValue()),
    markSaved: () => reset(current()),
  };
}
import type { FrameResult } from "@lisca/contracts";
import { useEffect, useState } from "react";
import {
  annotationValuesEqual,
  cloneAnnotationValue,
  createEmptyMask,
  type AnnotationValue,
} from "../utils/annotation-utils";
export function emptyValueFor(frame: FrameResult | null): AnnotationValue {
  return {
    classificationLabelId: null,
    mask: frame ? createEmptyMask(frame.width, frame.height) : new Uint8Array(),
  };
}
export function useAnnotationHistory(frame: FrameResult | null) {
  const [initialValue, setInitialValue] = useState<AnnotationValue>(() => emptyValueFor(null));
  const [state, setState] = useState(() => ({
    history: [emptyValueFor(null)],
    index: 0,
  }));
  const current = state.history[state.index] ?? initialValue;
  const dirty = !annotationValuesEqual(current, initialValue);
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
  useEffect(() => {
    if (!frame) {
      const next = cloneAnnotationValue(emptyValueFor(null));
      setInitialValue(next);
      setState({ history: [cloneAnnotationValue(next)], index: 0 });
    }
  }, [frame]);
  return {
    current,
    dirty,
    canUndo: state.index > 0,
    canRedo: state.index < state.history.length - 1,
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
    discard: () => reset(initialValue),
    markSaved: () => reset(current),
  };
}

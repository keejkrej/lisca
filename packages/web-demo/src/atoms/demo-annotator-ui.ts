import type { AnnotationLabel, ContrastWindow } from "@lisca/contracts";
import type { AnnotationMode, AnnotationTool } from "@lisca/ui/features";
import type { FrameResult } from "@lisca/utils";
import { Atom } from "@effect-atom/atom-react";

import {
  annotationValuesEqual,
  cloneAnnotationValue,
  emptyAnnotationValue,
  type AnnotationValue,
} from "../annotation-value";
import type { StateUpdater } from "./state-utils";

export const DEFAULT_ANNOTATOR_DEMO_LABELS: AnnotationLabel[] = [
  { id: "class-1", name: "Class 1", color: "#22c55e" },
  { id: "class-2", name: "Class 2", color: "#3b82f6" },
  { id: "class-3", name: "Class 3", color: "#f59e0b" },
];

export type DemoAnnotatorUiState = {
  fileName: string | null;
  frameLoading: boolean;
  saving: boolean;
  error: string | null;
  status: string | null;
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  labels: AnnotationLabel[];
  activeLabelId: string | null;
  mode: AnnotationMode;
  tool: AnnotationTool;
  brushSize: number;
  overlayOpacity: number;
  labelDialogOpen: boolean;
  labelError: string | null;
  annotationHistory: AnnotationValue[];
  annotationIndex: number;
  annotationSaved: AnnotationValue;
};

export type DemoAnnotatorSession = {
  fileName: string | null;
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  labels: AnnotationLabel[];
  activeLabelId: string | null;
  mode: AnnotationMode;
  tool: AnnotationTool;
  brushSize: number;
  overlayOpacity: number;
  annotation: AnnotationValue;
};

export function createInitialDemoAnnotatorUiState(): DemoAnnotatorUiState {
  const empty = emptyAnnotationValue(null);
  return {
    fileName: null,
    frameLoading: false,
    saving: false,
    error: null,
    status: null,
    frame: null,
    contrast: null,
    labels: DEFAULT_ANNOTATOR_DEMO_LABELS,
    activeLabelId: DEFAULT_ANNOTATOR_DEMO_LABELS[0]?.id ?? null,
    mode: "classification",
    tool: "brush",
    brushSize: 8,
    overlayOpacity: 0.45,
    labelDialogOpen: false,
    labelError: null,
    annotationHistory: [cloneAnnotationValue(empty)],
    annotationIndex: 0,
    annotationSaved: cloneAnnotationValue(empty),
  };
}

export function currentDemoAnnotation(state: DemoAnnotatorUiState): AnnotationValue {
  return state.annotationHistory[state.annotationIndex] ?? state.annotationSaved;
}

export function demoAnnotationDirty(state: DemoAnnotatorUiState): boolean {
  return !annotationValuesEqual(currentDemoAnnotation(state), state.annotationSaved);
}

export function selectDemoAnnotatorSession(state: DemoAnnotatorUiState): DemoAnnotatorSession {
  const current = currentDemoAnnotation(state);
  return {
    fileName: state.fileName,
    frame: state.frame,
    contrast: state.contrast,
    labels: state.labels,
    activeLabelId: state.activeLabelId,
    mode: state.mode,
    tool: state.tool,
    brushSize: state.brushSize,
    overlayOpacity: state.overlayOpacity,
    annotation: {
      classificationLabelId: current.classificationLabelId,
      mask: current.mask.slice(),
    },
  };
}

export function mergeDemoAnnotatorSession(
  session: DemoAnnotatorSession,
  current: DemoAnnotatorUiState,
): DemoAnnotatorUiState {
  const annotation = cloneAnnotationValue(session.annotation);
  return {
    ...current,
    fileName: session.fileName,
    frame: session.frame,
    contrast: session.contrast,
    labels: session.labels,
    activeLabelId: session.activeLabelId,
    mode: session.mode,
    tool: session.tool,
    brushSize: session.brushSize,
    overlayOpacity: session.overlayOpacity,
    annotationHistory: [annotation],
    annotationIndex: 0,
    annotationSaved: cloneAnnotationValue(annotation),
    status: session.fileName ? `Restored ${session.fileName}` : current.status,
  };
}

export type DemoAnnotatorUiAtom = ReturnType<typeof Atom.make<DemoAnnotatorUiState>>;

export const demoAnnotatorUiAtom: DemoAnnotatorUiAtom = Atom.make(
  createInitialDemoAnnotatorUiState(),
).pipe(Atom.keepAlive);

function patchDemoAnnotatorUi(
  set: (update: StateUpdater<DemoAnnotatorUiState>) => void,
  patch: Partial<DemoAnnotatorUiState> | ((state: DemoAnnotatorUiState) => DemoAnnotatorUiState),
): void {
  set((state) => (typeof patch === "function" ? patch(state) : { ...state, ...patch }));
}

function resetAnnotationState(value: AnnotationValue): Pick<
  DemoAnnotatorUiState,
  "annotationHistory" | "annotationIndex" | "annotationSaved"
> {
  const next = cloneAnnotationValue(value);
  return {
    annotationHistory: [cloneAnnotationValue(next)],
    annotationIndex: 0,
    annotationSaved: cloneAnnotationValue(next),
  };
}

export const demoAnnotatorUiActions = {
  setActiveLabelId(set: (update: StateUpdater<DemoAnnotatorUiState>) => void, activeLabelId: string | null) {
    patchDemoAnnotatorUi(set, { activeLabelId });
  },
  setMode(set: (update: StateUpdater<DemoAnnotatorUiState>) => void, mode: AnnotationMode) {
    patchDemoAnnotatorUi(set, { mode });
  },
  setTool(set: (update: StateUpdater<DemoAnnotatorUiState>) => void, tool: AnnotationTool) {
    patchDemoAnnotatorUi(set, { tool });
  },
  setBrushSize(set: (update: StateUpdater<DemoAnnotatorUiState>) => void, brushSize: number) {
    patchDemoAnnotatorUi(set, { brushSize });
  },
  setOverlayOpacity(set: (update: StateUpdater<DemoAnnotatorUiState>) => void, overlayOpacity: number) {
    patchDemoAnnotatorUi(set, { overlayOpacity });
  },
  setContrast(set: (update: StateUpdater<DemoAnnotatorUiState>) => void, contrast: ContrastWindow | null) {
    patchDemoAnnotatorUi(set, { contrast });
  },
  setLabelDialogOpen(set: (update: StateUpdater<DemoAnnotatorUiState>) => void, labelDialogOpen: boolean) {
    patchDemoAnnotatorUi(set, { labelDialogOpen });
  },
  setLabelError(set: (update: StateUpdater<DemoAnnotatorUiState>) => void, labelError: string | null) {
    patchDemoAnnotatorUi(set, { labelError });
  },
  setFrameLoading(set: (update: StateUpdater<DemoAnnotatorUiState>) => void, frameLoading: boolean) {
    patchDemoAnnotatorUi(set, { frameLoading });
  },
  setSaving(set: (update: StateUpdater<DemoAnnotatorUiState>) => void, saving: boolean) {
    patchDemoAnnotatorUi(set, { saving });
  },
  setError(set: (update: StateUpdater<DemoAnnotatorUiState>) => void, error: string | null) {
    patchDemoAnnotatorUi(set, { error });
  },
  setStatus(set: (update: StateUpdater<DemoAnnotatorUiState>) => void, status: string | null) {
    patchDemoAnnotatorUi(set, { status });
  },
  saveLabels(set: (update: StateUpdater<DemoAnnotatorUiState>) => void, labels: AnnotationLabel[]) {
    patchDemoAnnotatorUi(set, (state) => ({
      ...state,
      labels,
      activeLabelId: labels.some((label) => label.id === state.activeLabelId)
        ? state.activeLabelId
        : (labels[0]?.id ?? null),
      labelDialogOpen: false,
      labelError: null,
    }));
  },
  applyLoadedImage(set: (update: StateUpdater<DemoAnnotatorUiState>) => void, fileName: string, frame: FrameResult) {
    patchDemoAnnotatorUi(set, (state) => ({
      ...state,
      fileName,
      frame,
      contrast: null,
      error: null,
      status: null,
      ...resetAnnotationState(emptyAnnotationValue(frame)),
    }));
  },
  applyDemoPreset(
    set: (update: StateUpdater<DemoAnnotatorUiState>) => void,
    input: {
      fileName: string;
      frame: FrameResult;
      annotation: AnnotationValue;
    },
  ) {
    patchDemoAnnotatorUi(set, (state) => ({
      ...state,
      fileName: input.fileName,
      frame: input.frame,
      contrast: null,
      error: null,
      status: "Sample image loaded — try the tools below",
      ...resetAnnotationState(input.annotation),
    }));
  },
  clearLoadedImage(set: (update: StateUpdater<DemoAnnotatorUiState>) => void) {
    patchDemoAnnotatorUi(set, (state) => ({
      ...state,
      fileName: null,
      frame: null,
      error: null,
      status: null,
    }));
  },
  commitAnnotation(set: (update: StateUpdater<DemoAnnotatorUiState>) => void, value: AnnotationValue) {
    patchDemoAnnotatorUi(set, (state) => {
      const active = currentDemoAnnotation(state);
      if (annotationValuesEqual(active, value)) return state;
      const history = state.annotationHistory.slice(0, state.annotationIndex + 1).map(cloneAnnotationValue);
      history.push(cloneAnnotationValue(value));
      return {
        ...state,
        annotationHistory: history,
        annotationIndex: history.length - 1,
      };
    });
  },
  undoAnnotation(set: (update: StateUpdater<DemoAnnotatorUiState>) => void) {
    patchDemoAnnotatorUi(set, (state) => ({
      ...state,
      annotationIndex: Math.max(0, state.annotationIndex - 1),
    }));
  },
  redoAnnotation(set: (update: StateUpdater<DemoAnnotatorUiState>) => void) {
    patchDemoAnnotatorUi(set, (state) => ({
      ...state,
      annotationIndex: Math.min(state.annotationHistory.length - 1, state.annotationIndex + 1),
    }));
  },
  discardAnnotation(set: (update: StateUpdater<DemoAnnotatorUiState>) => void) {
    patchDemoAnnotatorUi(set, (state) => ({
      ...state,
      ...resetAnnotationState(state.annotationSaved),
    }));
  },
  markAnnotationSaved(set: (update: StateUpdater<DemoAnnotatorUiState>) => void) {
    patchDemoAnnotatorUi(set, (state) => ({
      ...state,
      ...resetAnnotationState(currentDemoAnnotation(state)),
    }));
  },
};

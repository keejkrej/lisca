import type {
  AnnotationMode,
  ContrastWindow,
  FrameResult,
  RoiIndexEntry,
  RoiPositionScan,
  RoiWorkspaceScan,
} from "@lisca/contracts";
import type { AnnotationTool } from "@lisca/ui";
import { Atom } from "@effect-atom/atom-react";

export type RoiSelection = {
  pos: number | null;
  roi: number | null;
  channel: number | null;
  timeIndex: number;
  zIndex: number;
};

type StateUpdater<T> = T | ((current: T) => T);

export type AnnotatorUiState = {
  workspacePath: string | null;
  selection: RoiSelection;
  activeLabelId: string | null;
  mode: AnnotationMode;
  tool: AnnotationTool;
  brushSize: number;
  overlayOpacity: number;
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  contrastDomain: ContrastWindow;
  contrastMin: number;
  contrastMax: number;
  frameLoading: boolean;
  annotationLoading: boolean;
  saving: boolean;
  scanError: string | null;
  frameError: string | null;
  annotationError: string | null;
  saveError: string | null;
  labelError: string | null;
  status: string | null;
  labelDialogOpen: boolean;
};

const defaultSelection: RoiSelection = {
  pos: null,
  roi: null,
  channel: null,
  timeIndex: 0,
  zIndex: 0,
};

const defaultContrastDomain: ContrastWindow = { min: 0, max: 255 };

function createInitialState(): AnnotatorUiState {
  return {
    workspacePath: null,
    selection: defaultSelection,
    activeLabelId: null,
    mode: "classification",
    tool: "brush",
    brushSize: 4,
    overlayOpacity: 0.35,
    frame: null,
    contrast: null,
    contrastDomain: defaultContrastDomain,
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
  };
}

export function currentPosition(scan: RoiWorkspaceScan | null, pos: number | null) {
  if (!scan || pos == null) return null;
  return scan.positions.find((entry) => entry.pos === pos) ?? null;
}

export function currentRoi(position: RoiPositionScan | null, roi: number | null) {
  if (!position || roi == null) return null;
  return position.rois.find((entry) => entry.roi === roi) ?? null;
}

export function roiRequestSelectionKey(selection: RoiSelection): string {
  return [
    selection.pos ?? "none",
    selection.roi ?? "none",
    selection.channel ?? "none",
    selection.timeIndex,
    selection.zIndex,
  ].join(":");
}

export function requestKey(
  position: RoiPositionScan | null,
  roi: RoiIndexEntry | null,
  selection: RoiSelection,
) {
  const time = position?.times[selection.timeIndex];
  const z = position?.zSlices[selection.zIndex];
  if (!position || !roi || selection.channel == null || time == null || z == null) return "none";
  return `${position.pos}:${roi.roi}:${selection.channel}:${time}:${z}`;
}

export const ANNOTATOR_SESSION_KEY = "lisca-annotator-session";

export type AnnotatorSessionPersist = {
  workspacePath: string | null;
};

export function readAnnotatorSession(): AnnotatorSessionPersist | null {
  try {
    const raw = sessionStorage.getItem(ANNOTATOR_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AnnotatorSessionPersist;
  } catch {
    return null;
  }
}

export function writeAnnotatorSession(state: AnnotatorUiState): void {
  try {
    sessionStorage.setItem(
      ANNOTATOR_SESSION_KEY,
      JSON.stringify({
        workspacePath: state.workspacePath,
      } satisfies AnnotatorSessionPersist),
    );
  } catch {
    // ignore
  }
}

export function createInitialAnnotatorUiState(): AnnotatorUiState {
  return createInitialState();
}

export const annotatorUiAtom = Atom.make(createInitialState()).pipe(Atom.keepAlive);

function patchAnnotatorUi(
  set: (update: StateUpdater<AnnotatorUiState>) => void,
  patch: Partial<AnnotatorUiState> | ((state: AnnotatorUiState) => AnnotatorUiState),
): void {
  set((state) => {
    const next = typeof patch === "function" ? patch(state) : { ...state, ...patch };
    writeAnnotatorSession(next);
    return next;
  });
}

export const annotatorUiActions = {
  setWorkspacePath(set: (update: StateUpdater<AnnotatorUiState>) => void, workspacePath: string | null) {
    patchAnnotatorUi(set, (state) => {
      if (state.workspacePath === workspacePath) return state;
      return {
        ...state,
        workspacePath,
        selection: defaultSelection,
        activeLabelId: null,
        frame: null,
        contrast: null,
        contrastDomain: defaultContrastDomain,
        contrastMin: 0,
        contrastMax: 255,
        scanError: null,
        frameError: null,
        annotationError: null,
        saveError: null,
        labelError: null,
        status: null,
      };
    });
  },
  setSelection(set: (update: StateUpdater<AnnotatorUiState>) => void, patch: Partial<RoiSelection>) {
    patchAnnotatorUi(set, (state) => ({ ...state, selection: { ...state.selection, ...patch } }));
  },
  setActiveLabelId(set: (update: StateUpdater<AnnotatorUiState>) => void, activeLabelId: string | null) {
    patchAnnotatorUi(set, (state) => ({ ...state, activeLabelId }));
  },
  syncActiveLabelFromLabels(
    set: (update: StateUpdater<AnnotatorUiState>) => void,
    labelIds: readonly string[],
  ) {
    patchAnnotatorUi(set, (state) => {
      if (state.activeLabelId && labelIds.includes(state.activeLabelId)) return state;
      return { ...state, activeLabelId: labelIds[0] ?? null };
    });
  },
  applySavedLabels(
    set: (update: StateUpdater<AnnotatorUiState>) => void,
    labels: readonly { id: string }[],
  ) {
    patchAnnotatorUi(set, (state) => ({
      ...state,
      activeLabelId: labels[0]?.id ?? null,
      labelDialogOpen: false,
      labelError: null,
    }));
  },
  setMode(set: (update: StateUpdater<AnnotatorUiState>) => void, mode: AnnotationMode) {
    patchAnnotatorUi(set, (state) => ({ ...state, mode }));
  },
  setTool(set: (update: StateUpdater<AnnotatorUiState>) => void, tool: AnnotationTool) {
    patchAnnotatorUi(set, (state) => ({ ...state, tool }));
  },
  setBrushSize(set: (update: StateUpdater<AnnotatorUiState>) => void, brushSize: number) {
    patchAnnotatorUi(set, (state) => ({ ...state, brushSize }));
  },
  setOverlayOpacity(set: (update: StateUpdater<AnnotatorUiState>) => void, overlayOpacity: number) {
    patchAnnotatorUi(set, (state) => ({ ...state, overlayOpacity }));
  },
  setFrame(set: (update: StateUpdater<AnnotatorUiState>) => void, frame: FrameResult | null) {
    patchAnnotatorUi(set, (state) => ({ ...state, frame }));
  },
  setContrast(set: (update: StateUpdater<AnnotatorUiState>) => void, contrast: ContrastWindow | null) {
    patchAnnotatorUi(set, (state) => ({
      ...state,
      contrast,
      contrastMin: contrast?.min ?? state.contrastMin,
      contrastMax: contrast?.max ?? state.contrastMax,
    }));
  },
  setContrastState(set: (update: StateUpdater<AnnotatorUiState>) => void, frame: FrameResult) {
    patchAnnotatorUi(set, (state) => ({
      ...state,
      contrastDomain: frame.contrastDomain ?? defaultContrastDomain,
      contrastMin: frame.appliedContrast?.min ?? state.contrastMin,
      contrastMax: frame.appliedContrast?.max ?? state.contrastMax,
    }));
  },
  setFrameLoading(set: (update: StateUpdater<AnnotatorUiState>) => void, frameLoading: boolean) {
    patchAnnotatorUi(set, (state) => ({ ...state, frameLoading }));
  },
  setAnnotationLoading(
    set: (update: StateUpdater<AnnotatorUiState>) => void,
    annotationLoading: boolean,
  ) {
    patchAnnotatorUi(set, (state) => ({ ...state, annotationLoading }));
  },
  setSaving(set: (update: StateUpdater<AnnotatorUiState>) => void, saving: boolean) {
    patchAnnotatorUi(set, (state) => ({ ...state, saving }));
  },
  setScanError(set: (update: StateUpdater<AnnotatorUiState>) => void, scanError: string | null) {
    patchAnnotatorUi(set, (state) => ({ ...state, scanError }));
  },
  setFrameError(set: (update: StateUpdater<AnnotatorUiState>) => void, frameError: string | null) {
    patchAnnotatorUi(set, (state) => ({ ...state, frameError }));
  },
  setAnnotationError(
    set: (update: StateUpdater<AnnotatorUiState>) => void,
    annotationError: string | null,
  ) {
    patchAnnotatorUi(set, (state) => ({ ...state, annotationError }));
  },
  setSaveError(set: (update: StateUpdater<AnnotatorUiState>) => void, saveError: string | null) {
    patchAnnotatorUi(set, (state) => ({ ...state, saveError }));
  },
  setLabelError(set: (update: StateUpdater<AnnotatorUiState>) => void, labelError: string | null) {
    patchAnnotatorUi(set, (state) => ({ ...state, labelError }));
  },
  setStatus(set: (update: StateUpdater<AnnotatorUiState>) => void, status: string | null) {
    patchAnnotatorUi(set, (state) => ({ ...state, status }));
  },
  setLabelDialogOpen(set: (update: StateUpdater<AnnotatorUiState>) => void, labelDialogOpen: boolean) {
    patchAnnotatorUi(set, (state) => ({ ...state, labelDialogOpen }));
  },
};

import type {
  ContrastWindow,
  RoiIndexEntry,
  RoiPositionScan,
  RoiWorkspaceScan,
} from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { defaultContrastDomain, deriveContrastUiState } from "@lisca/utils";
export type { AnnotationTool } from "@lisca/utils";
export { ANNOTATION_TOOL_DEFINITIONS, toolCanRunWithoutLabel } from "@lisca/utils";
import type { AnnotationTool } from "@lisca/utils";
import { touchAnnotatorWorkSessionFromState } from "../session/work-session";
import { liscaSessionStorage, readStorageJson, writeStorageJson } from "@lisca/utils";
import { Atom } from "effect/unstable/reactivity";
export type AnnotationMode = "classification" | "segmentation";

export type RoiSelection = {
  pos: number | null;
  roi: number | null;
  channel: number | null;
  timeIndex: number;
  zIndex: number;
};

export type StateUpdater<T> = T | ((current: T) => T);

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

const initialContrastDomain = defaultContrastDomain(undefined);

export function createDefaultAnnotatorUiState(): AnnotatorUiState {
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
    contrastDomain: initialContrastDomain,
    contrastMin: 0,
    contrastMax: initialContrastDomain.max,
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

export type AnnotatorUiAtom<State extends AnnotatorUiState = AnnotatorUiState> = ReturnType<
  typeof Atom.make<State>
>;

export function createAnnotatorUiAtom(): AnnotatorUiAtom {
  return Atom.make(createInitialAnnotatorUiState()).pipe(Atom.keepAlive);
}

export const ANNOTATOR_SESSION_KEY = "lisca-annotator-session";

export type AnnotatorSessionPersist = {
  workspacePath: string | null;
};

export type AnnotatorUiPersist<State extends AnnotatorUiState = AnnotatorUiState> = {
  write: (state: State) => void;
  read: () => Partial<State> | null;
};

export function createAnnotatorPersist(sessionKey: string): AnnotatorUiPersist {
  return {
    write(state: AnnotatorUiState) {
      writeStorageJson(liscaSessionStorage(), sessionKey, {
        state: { workspacePath: state.workspacePath },
      });
      touchAnnotatorWorkSessionFromState(state);
    },
    read(): Partial<AnnotatorUiState> | null {
      const parsed = readStorageJson<{
        state?: { workspacePath: string | null };
        workspacePath?: string | null;
      }>(liscaSessionStorage(), sessionKey);
      if (!parsed) return null;
      const workspacePath = parsed.state?.workspacePath ?? parsed.workspacePath ?? null;
      if (!workspacePath?.trim()) return null;
      return { workspacePath };
    },
  };
}

export function createInitialAnnotatorUiState(): AnnotatorUiState {
  const session = annotatorPersist.read();
  if (!session) return createDefaultAnnotatorUiState();
  return {
    ...createDefaultAnnotatorUiState(),
    workspacePath: session.workspacePath ?? null,
  };
}

export function patchAnnotatorUi<State extends AnnotatorUiState>(
  set: (update: StateUpdater<State>) => void,
  persist: Pick<AnnotatorUiPersist<State>, "write">,
  patchValue: Partial<State> | ((state: State) => State),
): void {
  set((state) => {
    const next = typeof patchValue === "function" ? patchValue(state) : { ...state, ...patchValue };
    if (next === state) return state;
    persist.write(next);
    return next;
  });
}

export function resetAnnotatorWorkspace<State extends AnnotatorUiState>(
  state: State,
  workspacePath: string | null,
): State {
  if (state.workspacePath === workspacePath) return state;
  return {
    ...state,
    workspacePath,
    selection: defaultSelection,
    activeLabelId: null,
    frame: null,
    contrast: null,
    contrastDomain: initialContrastDomain,
    contrastMin: 0,
    contrastMax: initialContrastDomain.max,
    scanError: null,
    frameError: null,
    annotationError: null,
    saveError: null,
    labelError: null,
    status: null,
  };
}

export function createAnnotatorUiActions<State extends AnnotatorUiState = AnnotatorUiState>(
  persist: Pick<AnnotatorUiPersist<State>, "write">,
) {
  const patch = (
    set: (update: StateUpdater<State>) => void,
    patchValue: Partial<State> | ((state: State) => State),
  ) => patchAnnotatorUi(set, persist, patchValue);

  return {
    setWorkspacePath(set: (update: StateUpdater<State>) => void, workspacePath: string | null) {
      patch(set, (state) => resetAnnotatorWorkspace(state, workspacePath));
    },
    setSelection(
      set: (update: StateUpdater<State>) => void,
      selectionPatch: Partial<RoiSelection>,
    ) {
      patch(set, (state) => {
        const nextSelection = { ...state.selection, ...selectionPatch };
        const keys = Object.keys(selectionPatch) as (keyof RoiSelection)[];
        if (keys.every((key) => state.selection[key] === nextSelection[key])) return state;
        return { ...state, selection: nextSelection };
      });
    },
    setActiveLabelId(set: (update: StateUpdater<State>) => void, activeLabelId: string | null) {
      patch(set, (state) =>
        state.activeLabelId === activeLabelId ? state : { ...state, activeLabelId },
      );
    },
    syncActiveLabelFromLabels(
      set: (update: StateUpdater<State>) => void,
      labelIds: readonly string[],
    ) {
      patch(set, (state) => {
        if (state.activeLabelId && labelIds.includes(state.activeLabelId)) return state;
        return { ...state, activeLabelId: labelIds[0] ?? null };
      });
    },
    applySavedLabels(
      set: (update: StateUpdater<State>) => void,
      labels: readonly { id: string }[],
    ) {
      patch(set, (state) => ({
        ...state,
        activeLabelId: labels[0]?.id ?? null,
        labelDialogOpen: false,
        labelError: null,
      }));
    },
    setMode(set: (update: StateUpdater<State>) => void, mode: AnnotationMode) {
      patch(set, (state) => ({ ...state, mode }));
    },
    setTool(set: (update: StateUpdater<State>) => void, tool: AnnotationTool) {
      patch(set, (state) => ({ ...state, tool }));
    },
    setBrushSize(set: (update: StateUpdater<State>) => void, brushSize: number) {
      patch(set, (state) => ({ ...state, brushSize }));
    },
    setOverlayOpacity(set: (update: StateUpdater<State>) => void, overlayOpacity: number) {
      patch(set, (state) => ({ ...state, overlayOpacity }));
    },
    setFrame(set: (update: StateUpdater<State>) => void, frame: FrameResult | null) {
      patch(set, (state) => (state.frame === frame ? state : { ...state, frame }));
    },
    setContrast(set: (update: StateUpdater<State>) => void, contrast: ContrastWindow | null) {
      patch(set, (state) => ({
        ...state,
        contrast,
        contrastMin: contrast?.min ?? state.contrastDomain.min,
        contrastMax: contrast?.max ?? state.contrastDomain.max,
      }));
    },
    setContrastState(set: (update: StateUpdater<State>) => void, frame: FrameResult) {
      patch(set, (state) => ({
        ...state,
        ...deriveContrastUiState(frame, state.contrast),
      }));
    },
    setFrameLoading(set: (update: StateUpdater<State>) => void, frameLoading: boolean) {
      patch(set, (state) =>
        state.frameLoading === frameLoading ? state : { ...state, frameLoading },
      );
    },
    setAnnotationLoading(set: (update: StateUpdater<State>) => void, annotationLoading: boolean) {
      patch(set, (state) =>
        state.annotationLoading === annotationLoading ? state : { ...state, annotationLoading },
      );
    },
    setSaving(set: (update: StateUpdater<State>) => void, saving: boolean) {
      patch(set, (state) => (state.saving === saving ? state : { ...state, saving }));
    },
    setScanError(set: (update: StateUpdater<State>) => void, scanError: string | null) {
      patch(set, (state) => (state.scanError === scanError ? state : { ...state, scanError }));
    },
    setFrameError(set: (update: StateUpdater<State>) => void, frameError: string | null) {
      patch(set, (state) => (state.frameError === frameError ? state : { ...state, frameError }));
    },
    setAnnotationError(set: (update: StateUpdater<State>) => void, annotationError: string | null) {
      patch(set, (state) =>
        state.annotationError === annotationError ? state : { ...state, annotationError },
      );
    },
    setSaveError(set: (update: StateUpdater<State>) => void, saveError: string | null) {
      patch(set, (state) => (state.saveError === saveError ? state : { ...state, saveError }));
    },
    setLabelError(set: (update: StateUpdater<State>) => void, labelError: string | null) {
      patch(set, (state) => (state.labelError === labelError ? state : { ...state, labelError }));
    },
    setStatus(set: (update: StateUpdater<State>) => void, status: string | null) {
      patch(set, (state) => (state.status === status ? state : { ...state, status }));
    },
    setLabelDialogOpen(set: (update: StateUpdater<State>) => void, labelDialogOpen: boolean) {
      patch(set, (state) => ({ ...state, labelDialogOpen }));
    },
  };
}

export type AnnotatorUiActions<State extends AnnotatorUiState = AnnotatorUiState> = ReturnType<
  typeof createAnnotatorUiActions<State>
>;

const annotatorPersist = createAnnotatorPersist(ANNOTATOR_SESSION_KEY);

export const annotatorUiAtom: AnnotatorUiAtom = createAnnotatorUiAtom();

export const annotatorUiActions = createAnnotatorUiActions(annotatorPersist);

export function readAnnotatorSession(): AnnotatorSessionPersist | null {
  const session = annotatorPersist.read();
  if (!session) return null;
  return { workspacePath: session.workspacePath ?? null };
}

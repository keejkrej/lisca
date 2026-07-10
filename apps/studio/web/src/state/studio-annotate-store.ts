import type {
  AnalysisProgress,
  ContrastWindow,
  RoiIndexEntry,
  RoiPositionScan,
  RoiWorkspaceScan,
  StudioAnalysisCsvFile,
} from "@lisca/contracts";
import type {
  AnnotationMode,
  AnnotationTool,
  AnnotatorUiState,
  RoiSelection,
} from "@lisca/client/atoms/annotator-ui";
import type { FrameResult } from "@lisca/utils";
import { deriveContrastUiState } from "@lisca/utils";
import { liscaSessionStorage, readStorageJson, writeStorageJson } from "@lisca/storage";
import { Atom, useAtom } from "@effect-atom/atom-solid";

export type StudioAnnotateSelection = RoiSelection;

type StateUpdater<T> = T | ((current: T) => T);

export type StudioAnnotateStoreState = AnnotatorUiState & {
  analysisStartConfirm: boolean;
  analysisRequestId: string | null;
  analysisProgress: AnalysisProgress | null;
  analysisResultFiles: StudioAnalysisCsvFile[];
};

type StudioAnnotateStoreActions = {
  setWorkspacePath: (workspacePath: string | null) => void;
  setAnalysisStartConfirm: (value: boolean) => void;
  setAnalysisRequestId: (requestId: string | null) => void;
  setAnalysisProgress: (progress: AnalysisProgress | null) => void;
  setAnalysisResultFiles: (files: StudioAnalysisCsvFile[]) => void;
  setSelection: (patch: Partial<StudioAnnotateSelection>) => void;
  setActiveLabelId: (activeLabelId: string | null) => void;
  setMode: (mode: AnnotationMode) => void;
  setTool: (tool: AnnotationTool) => void;
  setBrushSize: (brushSize: number) => void;
  setOverlayOpacity: (overlayOpacity: number) => void;
  setFrame: (frame: FrameResult | null) => void;
  setContrast: (contrast: ContrastWindow | null) => void;
  setContrastState: (frame: FrameResult) => void;
  setFrameLoading: (frameLoading: boolean) => void;
  setAnnotationLoading: (annotationLoading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setScanError: (scanError: string | null) => void;
  setFrameError: (frameError: string | null) => void;
  setAnnotationError: (annotationError: string | null) => void;
  setSaveError: (saveError: string | null) => void;
  setLabelError: (labelError: string | null) => void;
  setStatus: (status: string | null) => void;
  setLabelDialogOpen: (labelDialogOpen: boolean) => void;
};

export type StudioAnnotateStore = StudioAnnotateStoreState & StudioAnnotateStoreActions;

const defaultSelection: StudioAnnotateSelection = {
  pos: null,
  roi: null,
  channel: null,
  timeIndex: 0,
  zIndex: 0,
};

const defaultContrastDomain: ContrastWindow = {
  min: 0,
  max: 255,
};

function createInitialState(): StudioAnnotateStoreState {
  return {
    analysisStartConfirm: false,
    analysisRequestId: null,
    analysisProgress: null,
    analysisResultFiles: [],
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

export function currentAnnotatePosition(scan: RoiWorkspaceScan | null, pos: number | null) {
  if (!scan || pos == null) return null;
  return scan.positions.find((entry) => entry.pos === pos) ?? null;
}

export function currentAnnotateRoi(position: RoiPositionScan | null, roi: number | null) {
  if (!position || roi == null) return null;
  return position.rois.find((entry) => entry.roi === roi) ?? null;
}

export function annotateRequestKey(
  position: RoiPositionScan | null,
  roi: RoiIndexEntry | null,
  selection: StudioAnnotateSelection,
) {
  const time = position?.times[selection.timeIndex];
  const z = position?.zSlices[selection.zIndex];
  if (!position || !roi || selection.channel == null || time == null || z == null) return "none";
  return `${position.pos}:${roi.roi}:${selection.channel}:${time}:${z}`;
}

export const STUDIO_ANNOTATE_SESSION_KEY = "lisca-studio-annotate-session";

export type StudioAnnotateSessionPersist = Pick<
  StudioAnnotateStoreState,
  "workspacePath" | "selection" | "activeLabelId" | "mode" | "tool" | "brushSize" | "overlayOpacity"
>;

export function readStudioAnnotateSession(): StudioAnnotateSessionPersist | null {
  const parsed = readStorageJson<{
    state?: StudioAnnotateSessionPersist;
  }>(liscaSessionStorage(), STUDIO_ANNOTATE_SESSION_KEY);
  if (!parsed) return null;
  return parsed.state ?? (parsed as StudioAnnotateSessionPersist);
}

function writeStudioAnnotateSession(state: StudioAnnotateStoreState): void {
  writeStorageJson(liscaSessionStorage(), STUDIO_ANNOTATE_SESSION_KEY, {
    state: {
      workspacePath: state.workspacePath,
      selection: state.selection,
      activeLabelId: state.activeLabelId,
      mode: state.mode,
      tool: state.tool,
      brushSize: state.brushSize,
      overlayOpacity: state.overlayOpacity,
    } satisfies StudioAnnotateSessionPersist,
  });
}

export function createInitialStudioAnnotateUiState(): StudioAnnotateStoreState {
  return createInitialState();
}

export const studioAnnotateUiAtom = Atom.make(createInitialState()).pipe(Atom.keepAlive);

function patchStudioAnnotateUi(
  set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
  patch:
    | Partial<StudioAnnotateStoreState>
    | ((state: StudioAnnotateStoreState) => StudioAnnotateStoreState),
): void {
  set((state) => {
    const next =
      typeof patch === "function"
        ? patch(state)
        : {
            ...state,
            ...patch,
          };
    writeStudioAnnotateSession(next);
    return next;
  });
}

export const studioAnnotateUiActions = {
  setWorkspacePath(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    workspacePath: string | null,
  ) {
    patchStudioAnnotateUi(set, (state) => {
      if (state.workspacePath === workspacePath) return state;
      return {
        ...state,
        workspacePath,
        analysisStartConfirm: false,
        analysisRequestId: null,
        analysisProgress: null,
        analysisResultFiles: [],
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
  setAnalysisStartConfirm(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    value: boolean,
  ) {
    patchStudioAnnotateUi(set, (state) => ({
      ...state,
      analysisStartConfirm: value,
    }));
  },
  setAnalysisRequestId(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    requestId: string | null,
  ) {
    patchStudioAnnotateUi(set, (state) => ({
      ...state,
      analysisRequestId: requestId,
    }));
  },
  setAnalysisProgress(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    progress: AnalysisProgress | null,
  ) {
    patchStudioAnnotateUi(set, (state) => ({
      ...state,
      analysisProgress: progress,
    }));
  },
  setAnalysisResultFiles(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    files: StudioAnalysisCsvFile[],
  ) {
    patchStudioAnnotateUi(set, (state) => ({
      ...state,
      analysisResultFiles: files,
    }));
  },
  setSelection(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    patch: Partial<StudioAnnotateSelection>,
  ) {
    patchStudioAnnotateUi(set, (state) => ({
      ...state,
      selection: { ...state.selection, ...patch },
    }));
  },
  setActiveLabelId(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    activeLabelId: string | null,
  ) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, activeLabelId }));
  },
  syncActiveLabelFromLabels(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    labelIds: readonly string[],
  ) {
    patchStudioAnnotateUi(set, (state) => {
      if (state.activeLabelId && labelIds.includes(state.activeLabelId)) return state;
      return { ...state, activeLabelId: labelIds[0] ?? null };
    });
  },
  applySavedLabels(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    labels: readonly { id: string }[],
  ) {
    patchStudioAnnotateUi(set, (state) => ({
      ...state,
      activeLabelId: labels[0]?.id ?? null,
      labelDialogOpen: false,
      labelError: null,
    }));
  },
  setMode(set: (update: StateUpdater<StudioAnnotateStoreState>) => void, mode: AnnotationMode) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, mode }));
  },
  setTool(set: (update: StateUpdater<StudioAnnotateStoreState>) => void, tool: AnnotationTool) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, tool }));
  },
  setBrushSize(set: (update: StateUpdater<StudioAnnotateStoreState>) => void, brushSize: number) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, brushSize }));
  },
  setOverlayOpacity(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    overlayOpacity: number,
  ) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, overlayOpacity }));
  },
  setFrame(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    frame: FrameResult | null,
  ) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, frame }));
  },
  setContrast(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    contrast: ContrastWindow | null,
  ) {
    patchStudioAnnotateUi(set, (state) => ({
      ...state,
      contrast,
      contrastMin: contrast?.min ?? state.contrastDomain.min,
      contrastMax: contrast?.max ?? state.contrastDomain.max,
    }));
  },
  setContrastState(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    frame: FrameResult,
  ) {
    patchStudioAnnotateUi(set, (state) => ({
      ...state,
      ...deriveContrastUiState(frame, state.contrast),
    }));
  },
  setFrameLoading(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    frameLoading: boolean,
  ) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, frameLoading }));
  },
  setAnnotationLoading(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    annotationLoading: boolean,
  ) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, annotationLoading }));
  },
  setSaving(set: (update: StateUpdater<StudioAnnotateStoreState>) => void, saving: boolean) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, saving }));
  },
  setScanError(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    scanError: string | null,
  ) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, scanError }));
  },
  setFrameError(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    frameError: string | null,
  ) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, frameError }));
  },
  setAnnotationError(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    annotationError: string | null,
  ) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, annotationError }));
  },
  setSaveError(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    saveError: string | null,
  ) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, saveError }));
  },
  setLabelError(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    labelError: string | null,
  ) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, labelError }));
  },
  setStatus(set: (update: StateUpdater<StudioAnnotateStoreState>) => void, status: string | null) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, status }));
  },
  setLabelDialogOpen(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    labelDialogOpen: boolean,
  ) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, labelDialogOpen }));
  },
};

export function useStudioAnnotateStore(): StudioAnnotateStore {
  const [ui, setUi] = useAtom(studioAnnotateUiAtom);
  return {
    get analysisStartConfirm() {
      return ui().analysisStartConfirm;
    },
    get analysisRequestId() {
      return ui().analysisRequestId;
    },
    get analysisProgress() {
      return ui().analysisProgress;
    },
    get analysisResultFiles() {
      return ui().analysisResultFiles;
    },
    get workspacePath() {
      return ui().workspacePath;
    },
    get selection() {
      return ui().selection;
    },
    get activeLabelId() {
      return ui().activeLabelId;
    },
    get mode() {
      return ui().mode;
    },
    get tool() {
      return ui().tool;
    },
    get brushSize() {
      return ui().brushSize;
    },
    get overlayOpacity() {
      return ui().overlayOpacity;
    },
    get frame() {
      return ui().frame;
    },
    get contrast() {
      return ui().contrast;
    },
    get contrastDomain() {
      return ui().contrastDomain;
    },
    get contrastMin() {
      return ui().contrastMin;
    },
    get contrastMax() {
      return ui().contrastMax;
    },
    get frameLoading() {
      return ui().frameLoading;
    },
    get annotationLoading() {
      return ui().annotationLoading;
    },
    get saving() {
      return ui().saving;
    },
    get scanError() {
      return ui().scanError;
    },
    get frameError() {
      return ui().frameError;
    },
    get annotationError() {
      return ui().annotationError;
    },
    get saveError() {
      return ui().saveError;
    },
    get labelError() {
      return ui().labelError;
    },
    get status() {
      return ui().status;
    },
    get labelDialogOpen() {
      return ui().labelDialogOpen;
    },
    setWorkspacePath: (workspacePath) =>
      studioAnnotateUiActions.setWorkspacePath(setUi, workspacePath),
    setAnalysisStartConfirm: (value) =>
      studioAnnotateUiActions.setAnalysisStartConfirm(setUi, value),
    setAnalysisRequestId: (requestId) =>
      studioAnnotateUiActions.setAnalysisRequestId(setUi, requestId),
    setAnalysisProgress: (progress) =>
      studioAnnotateUiActions.setAnalysisProgress(setUi, progress),
    setAnalysisResultFiles: (files) =>
      studioAnnotateUiActions.setAnalysisResultFiles(setUi, files),
    setSelection: (patch) => studioAnnotateUiActions.setSelection(setUi, patch),
    setActiveLabelId: (activeLabelId) =>
      studioAnnotateUiActions.setActiveLabelId(setUi, activeLabelId),
    setMode: (mode) => studioAnnotateUiActions.setMode(setUi, mode),
    setTool: (tool) => studioAnnotateUiActions.setTool(setUi, tool),
    setBrushSize: (brushSize) => studioAnnotateUiActions.setBrushSize(setUi, brushSize),
    setOverlayOpacity: (overlayOpacity) =>
      studioAnnotateUiActions.setOverlayOpacity(setUi, overlayOpacity),
    setFrame: (frame) => studioAnnotateUiActions.setFrame(setUi, frame),
    setContrast: (contrast) => studioAnnotateUiActions.setContrast(setUi, contrast),
    setContrastState: (frame) => studioAnnotateUiActions.setContrastState(setUi, frame),
    setFrameLoading: (frameLoading) =>
      studioAnnotateUiActions.setFrameLoading(setUi, frameLoading),
    setAnnotationLoading: (annotationLoading) =>
      studioAnnotateUiActions.setAnnotationLoading(setUi, annotationLoading),
    setSaving: (saving) => studioAnnotateUiActions.setSaving(setUi, saving),
    setScanError: (scanError) => studioAnnotateUiActions.setScanError(setUi, scanError),
    setFrameError: (frameError) => studioAnnotateUiActions.setFrameError(setUi, frameError),
    setAnnotationError: (annotationError) =>
      studioAnnotateUiActions.setAnnotationError(setUi, annotationError),
    setSaveError: (saveError) => studioAnnotateUiActions.setSaveError(setUi, saveError),
    setLabelError: (labelError) => studioAnnotateUiActions.setLabelError(setUi, labelError),
    setStatus: (status) => studioAnnotateUiActions.setStatus(setUi, status),
    setLabelDialogOpen: (labelDialogOpen) =>
      studioAnnotateUiActions.setLabelDialogOpen(setUi, labelDialogOpen),
  };
}
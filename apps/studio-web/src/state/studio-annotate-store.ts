import type {
  AnalysisProgress,
  ContrastWindow,
  FrameResult,
  RoiIndexEntry,
  RoiPositionScan,
  RoiWorkspaceScan,
  StudioAnalysisCsvFile,
} from "@lisca/contracts";
import { Atom, useAtom } from "@effect-atom/atom-react";
import { useMemo } from "react";

export type StudioAnnotateSelection = {
  pos: number | null;
  roi: number | null;
  channel: number | null;
  timeIndex: number;
  zIndex: number;
};

type StateUpdater<T> = T | ((current: T) => T);

type StudioAnnotateStoreState = {
  analysisStartConfirm: boolean;
  analysisRequestId: string | null;
  analysisProgress: AnalysisProgress | null;
  analysisResultFiles: StudioAnalysisCsvFile[];
  workspacePath: string | null;
  selection: StudioAnnotateSelection;
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  contrastDomain: ContrastWindow;
  contrastMin: number;
  contrastMax: number;
  frameLoading: boolean;
  scanError: string | null;
  frameError: string | null;
  status: string | null;
};

type StudioAnnotateStoreActions = {
  setWorkspacePath: (workspacePath: string | null) => void;
  setAnalysisStartConfirm: (value: boolean) => void;
  setAnalysisRequestId: (requestId: string | null) => void;
  setAnalysisProgress: (progress: AnalysisProgress | null) => void;
  setAnalysisResultFiles: (files: StudioAnalysisCsvFile[]) => void;
  setSelection: (patch: Partial<StudioAnnotateSelection>) => void;
  setFrame: (frame: FrameResult | null) => void;
  setContrast: (contrast: ContrastWindow | null) => void;
  setContrastState: (frame: FrameResult) => void;
  setFrameLoading: (frameLoading: boolean) => void;
  setScanError: (scanError: string | null) => void;
  setFrameError: (frameError: string | null) => void;
  setStatus: (status: string | null) => void;
};

export type StudioAnnotateStore = StudioAnnotateStoreState & StudioAnnotateStoreActions;

const defaultSelection: StudioAnnotateSelection = {
  pos: null,
  roi: null,
  channel: null,
  timeIndex: 0,
  zIndex: 0,
};
const defaultContrastDomain: ContrastWindow = { min: 0, max: 255 };

function createInitialState(): StudioAnnotateStoreState {
  return {
    analysisStartConfirm: false,
    analysisRequestId: null,
    analysisProgress: null,
    analysisResultFiles: [],
    workspacePath: null,
    selection: defaultSelection,
    frame: null,
    contrast: null,
    contrastDomain: defaultContrastDomain,
    contrastMin: 0,
    contrastMax: 255,
    frameLoading: false,
    scanError: null,
    frameError: null,
    status: null,
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
  "workspacePath" | "selection"
>;

export function readStudioAnnotateSession(): StudioAnnotateSessionPersist | null {
  try {
    const raw = sessionStorage.getItem(STUDIO_ANNOTATE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: StudioAnnotateSessionPersist };
    return parsed.state ?? (parsed as StudioAnnotateSessionPersist);
  } catch {
    return null;
  }
}

function writeStudioAnnotateSession(state: StudioAnnotateStoreState): void {
  try {
    sessionStorage.setItem(
      STUDIO_ANNOTATE_SESSION_KEY,
      JSON.stringify({
        state: {
          workspacePath: state.workspacePath,
          selection: state.selection,
        } satisfies StudioAnnotateSessionPersist,
      }),
    );
  } catch {
    // ignore
  }
}

export function createInitialStudioAnnotateUiState(): StudioAnnotateStoreState {
  return createInitialState();
}

export const studioAnnotateUiAtom = Atom.make(createInitialState()).pipe(Atom.keepAlive);

function patchStudioAnnotateUi(
  set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
  patch: Partial<StudioAnnotateStoreState> | ((state: StudioAnnotateStoreState) => StudioAnnotateStoreState),
): void {
  set((state) => {
    const next = typeof patch === "function" ? patch(state) : { ...state, ...patch };
    writeStudioAnnotateSession(next);
    return next;
  });
}

export const studioAnnotateUiActions = {
  setWorkspacePath(set: (update: StateUpdater<StudioAnnotateStoreState>) => void, workspacePath: string | null) {
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
        frame: null,
        contrast: null,
        contrastDomain: defaultContrastDomain,
        contrastMin: 0,
        contrastMax: 255,
        scanError: null,
        frameError: null,
        status: null,
      };
    });
  },
  setAnalysisStartConfirm(set: (update: StateUpdater<StudioAnnotateStoreState>) => void, value: boolean) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, analysisStartConfirm: value }));
  },
  setAnalysisRequestId(set: (update: StateUpdater<StudioAnnotateStoreState>) => void, requestId: string | null) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, analysisRequestId: requestId }));
  },
  setAnalysisProgress(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    progress: AnalysisProgress | null,
  ) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, analysisProgress: progress }));
  },
  setAnalysisResultFiles(
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    files: StudioAnalysisCsvFile[],
  ) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, analysisResultFiles: files }));
  },
  setSelection(set: (update: StateUpdater<StudioAnnotateStoreState>) => void, patch: Partial<StudioAnnotateSelection>) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, selection: { ...state.selection, ...patch } }));
  },
  setFrame(set: (update: StateUpdater<StudioAnnotateStoreState>) => void, frame: FrameResult | null) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, frame }));
  },
  setContrast(set: (update: StateUpdater<StudioAnnotateStoreState>) => void, contrast: ContrastWindow | null) {
    patchStudioAnnotateUi(set, (state) => ({
      ...state,
      contrast,
      contrastMin: contrast?.min ?? state.contrastMin,
      contrastMax: contrast?.max ?? state.contrastMax,
    }));
  },
  setContrastState(set: (update: StateUpdater<StudioAnnotateStoreState>) => void, frame: FrameResult) {
    patchStudioAnnotateUi(set, (state) => ({
      ...state,
      contrastDomain: frame.contrastDomain ?? defaultContrastDomain,
      contrastMin: frame.appliedContrast?.min ?? state.contrastMin,
      contrastMax: frame.appliedContrast?.max ?? state.contrastMax,
    }));
  },
  setFrameLoading(set: (update: StateUpdater<StudioAnnotateStoreState>) => void, frameLoading: boolean) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, frameLoading }));
  },
  setScanError(set: (update: StateUpdater<StudioAnnotateStoreState>) => void, scanError: string | null) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, scanError }));
  },
  setFrameError(set: (update: StateUpdater<StudioAnnotateStoreState>) => void, frameError: string | null) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, frameError }));
  },
  setStatus(set: (update: StateUpdater<StudioAnnotateStoreState>) => void, status: string | null) {
    patchStudioAnnotateUi(set, (state) => ({ ...state, status }));
  },
};

function bindStudioAnnotateStore(
  state: StudioAnnotateStoreState,
  set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
): StudioAnnotateStore {
  return {
    ...state,
    setWorkspacePath: (workspacePath) => studioAnnotateUiActions.setWorkspacePath(set, workspacePath),
    setAnalysisStartConfirm: (value) => studioAnnotateUiActions.setAnalysisStartConfirm(set, value),
    setAnalysisRequestId: (requestId) => studioAnnotateUiActions.setAnalysisRequestId(set, requestId),
    setAnalysisProgress: (progress) => studioAnnotateUiActions.setAnalysisProgress(set, progress),
    setAnalysisResultFiles: (files) => studioAnnotateUiActions.setAnalysisResultFiles(set, files),
    setSelection: (patch) => studioAnnotateUiActions.setSelection(set, patch),
    setFrame: (frame) => studioAnnotateUiActions.setFrame(set, frame),
    setContrast: (contrast) => studioAnnotateUiActions.setContrast(set, contrast),
    setContrastState: (frame) => studioAnnotateUiActions.setContrastState(set, frame),
    setFrameLoading: (frameLoading) => studioAnnotateUiActions.setFrameLoading(set, frameLoading),
    setScanError: (scanError) => studioAnnotateUiActions.setScanError(set, scanError),
    setFrameError: (frameError) => studioAnnotateUiActions.setFrameError(set, frameError),
    setStatus: (status) => studioAnnotateUiActions.setStatus(set, status),
  };
}

export function useStudioAnnotateStore(): StudioAnnotateStore {
  const [state, setState] = useAtom(studioAnnotateUiAtom);
  return useMemo(() => bindStudioAnnotateStore(state, setState), [state, setState]);
}

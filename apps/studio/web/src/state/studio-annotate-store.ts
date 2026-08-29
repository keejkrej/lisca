import type {
  AnnotatorUiActions,
  AnnotatorUiAtom,
  AnnotatorUiPersist,
  AnnotatorUiState,
  RoiSelection,
  StateUpdater,
} from "@lisca/client/atoms/annotator-ui";
import {
  createAnnotatorUiActions,
  createDefaultAnnotatorUiState,
  patchAnnotatorUi,
  resetAnnotatorWorkspace,
} from "@lisca/client/atoms/annotator-ui";
import type { AnalysisProgress, StudioAnalysisCsvFile } from "@lisca/contracts";
import { liscaSessionStorage, readStorageJson, writeStorageJson } from "@lisca/utils";
import { Atom } from "effect/unstable/reactivity";
import { useAtom } from "@effect/atom-solid";

export type StudioAnnotateSelection = RoiSelection;

export type StudioAnalysisState = {
  analysisStartConfirm: boolean;
  analysisRequestId: string | null;
  analysisProgress: AnalysisProgress | null;
  analysisResultFiles: StudioAnalysisCsvFile[];
};

export type StudioAnnotateStoreState = AnnotatorUiState & StudioAnalysisState;

const defaultAnalysisState = (): StudioAnalysisState => ({
  analysisStartConfirm: false,
  analysisRequestId: null,
  analysisProgress: null,
  analysisResultFiles: [],
});

export const STUDIO_ANNOTATE_SESSION_KEY = "lisca-studio-annotate-session";

export type StudioAnnotateSessionPersist = Pick<
  StudioAnnotateStoreState,
  "workspacePath" | "selection" | "activeLabelId" | "mode" | "tool" | "brushSize" | "overlayOpacity"
>;

export function readStudioAnnotateSession(): Partial<StudioAnnotateSessionPersist> | null {
  const parsed = readStorageJson<
    Partial<StudioAnnotateSessionPersist> & {
      state?: Partial<StudioAnnotateSessionPersist>;
    }
  >(liscaSessionStorage(), STUDIO_ANNOTATE_SESSION_KEY);
  if (!parsed) return null;
  return parsed.state ?? parsed;
}

const studioAnnotatePersist: AnnotatorUiPersist<StudioAnnotateStoreState> = {
  read: () => readStudioAnnotateSession(),
  write(state) {
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
  },
};

export function createInitialStudioAnnotateUiState(): StudioAnnotateStoreState {
  return {
    ...createDefaultAnnotatorUiState(),
    ...defaultAnalysisState(),
    ...studioAnnotatePersist.read(),
  };
}

export const studioAnnotateUiAtom: AnnotatorUiAtom<StudioAnnotateStoreState> = Atom.make(
  createInitialStudioAnnotateUiState(),
).pipe(Atom.keepAlive);

const annotatorActions = createAnnotatorUiActions(studioAnnotatePersist);

export const studioAnnotateUiActions: AnnotatorUiActions<StudioAnnotateStoreState> & {
  setAnalysisStartConfirm: (
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    value: boolean,
  ) => void;
  setAnalysisRequestId: (
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    requestId: string | null,
  ) => void;
  setAnalysisProgress: (
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    progress: AnalysisProgress | null,
  ) => void;
  setAnalysisResultFiles: (
    set: (update: StateUpdater<StudioAnnotateStoreState>) => void,
    files: StudioAnalysisCsvFile[],
  ) => void;
} = {
  ...annotatorActions,
  setWorkspacePath(set, workspacePath) {
    patchAnnotatorUi(set, studioAnnotatePersist, (state) => {
      const next = resetAnnotatorWorkspace(state, workspacePath);
      return next === state ? state : { ...next, ...defaultAnalysisState() };
    });
  },
  setAnalysisStartConfirm(set, analysisStartConfirm) {
    patchAnnotatorUi(set, studioAnnotatePersist, { analysisStartConfirm });
  },
  setAnalysisRequestId(set, analysisRequestId) {
    patchAnnotatorUi(set, studioAnnotatePersist, { analysisRequestId });
  },
  setAnalysisProgress(set, analysisProgress) {
    patchAnnotatorUi(set, studioAnnotatePersist, { analysisProgress });
  },
  setAnalysisResultFiles(set, analysisResultFiles) {
    patchAnnotatorUi(set, studioAnnotatePersist, { analysisResultFiles });
  },
};

export type StudioAnnotateStore = Pick<
  StudioAnnotateStoreState,
  "workspacePath" | "analysisProgress" | "analysisResultFiles"
> & {
  setAnalysisProgress: (progress: AnalysisProgress | null) => void;
  setAnalysisResultFiles: (files: StudioAnalysisCsvFile[]) => void;
};

export function useStudioAnnotateStore(): StudioAnnotateStore {
  const [ui, setUi] = useAtom(() => studioAnnotateUiAtom);
  return {
    get workspacePath() {
      return ui().workspacePath;
    },
    get analysisProgress() {
      return ui().analysisProgress;
    },
    get analysisResultFiles() {
      return ui().analysisResultFiles;
    },
    setAnalysisProgress: (progress) => studioAnnotateUiActions.setAnalysisProgress(setUi, progress),
    setAnalysisResultFiles: (files) => studioAnnotateUiActions.setAnalysisResultFiles(setUi, files),
  };
}

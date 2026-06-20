import type {
  AlignGridCellCoord,
  AlignGridState,
  AlignerSource,
  ContrastWindow,
  FrameRequest,
  SavedAlignState,
  WorkspaceScan,
} from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import type { AlignGridToolMode } from "@lisca/utils";
import { useAtom } from "@effect-atom/atom-react";
import {
  createAlignUiActions,
  createAlignUiAtom,
  createInitialAlignUiState,
  createStudioPersist,
  type AlignUiAtom,
  type AlignUiState,
  type LoadedSavedAlignState,
  type StateUpdater,
} from "./align-ui";
export const STUDIO_ALIGN_SESSION_KEY = "lisca-studio-align-session";
const studioPersist = createStudioPersist(STUDIO_ALIGN_SESSION_KEY);
export const studioAlignUiAtom: AlignUiAtom = createAlignUiAtom();
export const studioAlignUiActions = createAlignUiActions(studioPersist, {
  clearSourceOnWorkspaceChange: false,
  preserveSelectionOnScan: true,
  skipRedundantSourceSet: true,
  includeApplySavedAlignState: true,
});
export type StudioAlignStoreState = Omit<AlignUiState, "cropProgress">;
export type StudioAlignSessionPersist = Pick<
  StudioAlignStoreState,
  "workspacePath" | "source" | "selection"
>;
export function readStudioAlignSession(): StudioAlignSessionPersist | null {
  const session = studioPersist.read();
  if (!session) return null;
  return {
    workspacePath: session.workspacePath ?? null,
    source: session.source ?? null,
    selection: session.selection ?? {
      pos: 0,
      channel: 0,
      time: 0,
      z: 0,
    },
  };
}
export function createInitialStudioAlignUiState(): StudioAlignStoreState {
  const { cropProgress: _cropProgress, ...state } = createInitialAlignUiState();
  return state;
}
type StudioAlignStoreActions = {
  setWorkspacePath: (workspacePath: string | null) => void;
  setSource: (source: AlignerSource | null) => void;
  applySourceScan: (sourceKey: string, scan: WorkspaceScan) => void;
  applySavedAlignState: (stateKey: string, pos: number, saved: SavedAlignState | null) => void;
  applyLoadedFrame: (
    selection: FrameRequest,
    frame: FrameResult,
    savedAlignState: LoadedSavedAlignState | null,
  ) => void;
  setSelection: (patch: Partial<FrameRequest>) => void;
  setFrame: (frame: FrameResult | null) => void;
  setContrast: (contrast: ContrastWindow | null) => void;
  setGrid: (next: StateUpdater<AlignGridState>) => void;
  setToolMode: (mode: AlignGridToolMode) => void;
  setPatternZoomLocked: (locked: boolean) => void;
  setExcludedCellsForCurrentPosition: (cells: Iterable<AlignGridCellCoord>) => void;
  setFrameLoading: (frameLoading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  setStatus: (status: string | null) => void;
};
export type StudioAlignStore = StudioAlignStoreState & StudioAlignStoreActions;
export function useStudioAlignStore(): StudioAlignStore {
  const [state, setState] = useAtom(studioAlignUiAtom);
  const setWorkspacePath = (workspacePath: string | null) =>
    studioAlignUiActions.setWorkspacePath(setState, workspacePath);
  const setSource = (source: AlignerSource | null) =>
    studioAlignUiActions.setSource(setState, source);
  const applySourceScan = (nextSourceKey: string, scan: WorkspaceScan) =>
    studioAlignUiActions.applySourceScan(setState, nextSourceKey, scan);
  const applySavedAlignState = (stateKey: string, pos: number, saved: SavedAlignState | null) =>
    studioAlignUiActions.applySavedAlignState!(setState, stateKey, pos, saved);
  const applyLoadedFrame = (
    selection: FrameRequest,
    frame: FrameResult,
    savedAlignState: LoadedSavedAlignState | null,
  ) => studioAlignUiActions.applyLoadedFrame(setState, selection, frame, savedAlignState);
  const setSelection = (patch: Partial<FrameRequest>) =>
    studioAlignUiActions.setSelection(setState, patch);
  const setFrame = (frame: FrameResult | null) => studioAlignUiActions.setFrame(setState, frame);
  const setContrast = (contrast: ContrastWindow | null) =>
    studioAlignUiActions.setContrast(setState, contrast);
  const setGrid = (next: StateUpdater<AlignGridState>) =>
    studioAlignUiActions.setGrid(setState, next);
  const setToolMode = (mode: AlignGridToolMode) => studioAlignUiActions.setToolMode(setState, mode);
  const setPatternZoomLocked = (locked: boolean) =>
    studioAlignUiActions.setPatternZoomLocked(setState, locked);
  const setExcludedCellsForCurrentPosition = (cells: Iterable<AlignGridCellCoord>) =>
    studioAlignUiActions.setExcludedCellsForCurrentPosition(setState, cells);
  const setFrameLoading = (frameLoading: boolean) =>
    studioAlignUiActions.setFrameLoading(setState, frameLoading);
  const setSaving = (saving: boolean) => studioAlignUiActions.setSaving(setState, saving);
  const setError = (error: string | null) => studioAlignUiActions.setError(setState, error);
  const setStatus = (status: string | null) => studioAlignUiActions.setStatus(setState, status);
  const { cropProgress: _cropProgress, ...storeState } = state;
  return {
    ...storeState,
    setWorkspacePath,
    setSource,
    applySourceScan,
    applySavedAlignState,
    applyLoadedFrame,
    setSelection,
    setFrame,
    setContrast,
    setGrid,
    setToolMode,
    setPatternZoomLocked,
    setExcludedCellsForCurrentPosition,
    setFrameLoading,
    setSaving,
    setError,
    setStatus,
  };
}

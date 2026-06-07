import type { AlignGridCellCoord, AlignGridState, AlignerSource, ContrastWindow, FrameRequest, FrameResult, SavedAlignState, WorkspaceScan } from "@lisca/contracts";
import type { AlignGridToolMode } from "@lisca/utils";
import { useAtom } from "@effect-atom/atom-react";
import { useCallback } from "react";

import {
  createAlignUiActions,
  createAlignUiAtom,
  createInitialAlignUiState,
  createStudioPersist,
  type AlignUiAtom,
  type AlignUiState,
  type LoadedSavedAlignState,
  type StateUpdater,
} from "./align-ui.ts";

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

export type StudioAlignSessionPersist = Pick<StudioAlignStoreState, "workspacePath" | "source" | "selection">;

export function readStudioAlignSession(): StudioAlignSessionPersist | null {
  const session = studioPersist.read();
  if (!session) return null;
  return {
    workspacePath: session.workspacePath ?? null,
    source: session.source ?? null,
    selection: session.selection ?? { pos: 0, channel: 0, time: 0, z: 0 },
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

  const setWorkspacePath = useCallback(
    (workspacePath: string | null) => studioAlignUiActions.setWorkspacePath(setState, workspacePath),
    [setState],
  );
  const setSource = useCallback(
    (source: AlignerSource | null) => studioAlignUiActions.setSource(setState, source),
    [setState],
  );
  const applySourceScan = useCallback(
    (nextSourceKey: string, scan: WorkspaceScan) =>
      studioAlignUiActions.applySourceScan(setState, nextSourceKey, scan),
    [setState],
  );
  const applySavedAlignState = useCallback(
    (stateKey: string, pos: number, saved: SavedAlignState | null) =>
      studioAlignUiActions.applySavedAlignState!(setState, stateKey, pos, saved),
    [setState],
  );
  const applyLoadedFrame = useCallback(
    (
      selection: FrameRequest,
      frame: FrameResult,
      savedAlignState: LoadedSavedAlignState | null,
    ) => studioAlignUiActions.applyLoadedFrame(setState, selection, frame, savedAlignState),
    [setState],
  );
  const setSelection = useCallback(
    (patch: Partial<FrameRequest>) => studioAlignUiActions.setSelection(setState, patch),
    [setState],
  );
  const setFrame = useCallback(
    (frame: FrameResult | null) => studioAlignUiActions.setFrame(setState, frame),
    [setState],
  );
  const setContrast = useCallback(
    (contrast: ContrastWindow | null) => studioAlignUiActions.setContrast(setState, contrast),
    [setState],
  );
  const setGrid = useCallback(
    (next: StateUpdater<AlignGridState>) => studioAlignUiActions.setGrid(setState, next),
    [setState],
  );
  const setToolMode = useCallback(
    (mode: AlignGridToolMode) => studioAlignUiActions.setToolMode(setState, mode),
    [setState],
  );
  const setPatternZoomLocked = useCallback(
    (locked: boolean) => studioAlignUiActions.setPatternZoomLocked(setState, locked),
    [setState],
  );
  const setExcludedCellsForCurrentPosition = useCallback(
    (cells: Iterable<AlignGridCellCoord>) =>
      studioAlignUiActions.setExcludedCellsForCurrentPosition(setState, cells),
    [setState],
  );
  const setFrameLoading = useCallback(
    (frameLoading: boolean) => studioAlignUiActions.setFrameLoading(setState, frameLoading),
    [setState],
  );
  const setSaving = useCallback(
    (saving: boolean) => studioAlignUiActions.setSaving(setState, saving),
    [setState],
  );
  const setError = useCallback(
    (error: string | null) => studioAlignUiActions.setError(setState, error),
    [setState],
  );
  const setStatus = useCallback(
    (status: string | null) => studioAlignUiActions.setStatus(setState, status),
    [setState],
  );

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

import type {
  AlignGridCellCoord,
  AlignGridState,
  AlignerSource,
  ContrastWindow,
  CropRoiProgress,
  FrameRequest,
  FrameResult,
  SavedAlignState,
  WorkspaceScan,
} from "@lisca/contracts";
import {
  createDefaultAlignGrid,
  normalizeAlignGridState,
  setExcludedAlignGridCellsForPosition,
  type AlignGridToolMode,
} from "@lisca/utils";
import { Atom } from "@effect-atom/atom-react";

export type ExcludedByPosition = Record<number, AlignGridCellCoord[]>;

type StateUpdater<T> = T | ((current: T) => T);
type LoadedSavedAlignState = {
  stateKey: string;
  pos: number;
  saved: SavedAlignState | null;
};

export type AlignerUiState = {
  workspacePath: string | null;
  source: AlignerSource | null;
  scan: WorkspaceScan | null;
  scanSourceKey: string | null;
  appliedAlignStateKey: string | null;
  selection: FrameRequest;
  loadedFrameSelection: FrameRequest | null;
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  grid: AlignGridState;
  toolMode: AlignGridToolMode;
  patternZoomLocked: boolean;
  excludedCellsByPosition: ExcludedByPosition;
  frameLoading: boolean;
  saving: boolean;
  cropProgress: CropRoiProgress | null;
  error: string | null;
  status: string | null;
};

const defaultSelection: FrameRequest = {
  pos: 0,
  channel: 0,
  time: 0,
  z: 0,
};

function firstOrZero(values: number[] | undefined): number {
  return values?.[0] ?? 0;
}

function resolveNextValue<T>(current: T, next: StateUpdater<T>): T {
  return typeof next === "function" ? (next as (value: T) => T)(current) : next;
}

export function sourceKey(source: AlignerSource | null): string | null {
  return source ? JSON.stringify(source) : null;
}

export function savedAlignStateKey(workspacePath: string, pos: number): string {
  return `${workspacePath}:pos:${pos}`;
}

export function createInitialAlignerUiState(): AlignerUiState {
  return createInitialState();
}

function createInitialState(): AlignerUiState {
  return {
    workspacePath: null,
    source: null,
    scan: null,
    scanSourceKey: null,
    appliedAlignStateKey: null,
    selection: defaultSelection,
    loadedFrameSelection: null,
    frame: null,
    contrast: null,
    grid: normalizeAlignGridState(createDefaultAlignGrid()),
    toolMode: "pan",
    patternZoomLocked: true,
    excludedCellsByPosition: {},
    frameLoading: false,
    saving: false,
    cropProgress: null,
    error: null,
    status: null,
  };
}

function createVisibleDefaultAlignGrid(): AlignGridState {
  return normalizeAlignGridState({ ...createDefaultAlignGrid(), enabled: true });
}

export const ALIGNER_SESSION_KEY = "lisca-aligner-session";

export type AlignerSessionPersist = {
  workspacePath: string | null;
  source: AlignerSource | null;
};

export function readAlignerSession(): AlignerSessionPersist | null {
  try {
    const raw = sessionStorage.getItem(ALIGNER_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AlignerSessionPersist;
  } catch {
    return null;
  }
}

export function writeAlignerSession(state: AlignerUiState): void {
  try {
    sessionStorage.setItem(
      ALIGNER_SESSION_KEY,
      JSON.stringify({
        workspacePath: state.workspacePath,
        source: state.source,
      } satisfies AlignerSessionPersist),
    );
  } catch {
    // ignore
  }
}

export const alignerUiAtom = Atom.make(createInitialState()).pipe(Atom.keepAlive);

export function patchAlignerUi(
  set: (update: StateUpdater<AlignerUiState>) => void,
  patch: Partial<AlignerUiState> | ((state: AlignerUiState) => AlignerUiState),
): void {
  set((state) => {
    const next = typeof patch === "function" ? patch(state) : { ...state, ...patch };
    writeAlignerSession(next);
    return next;
  });
}

export const alignerUiActions = {
  setWorkspacePath(set: (update: StateUpdater<AlignerUiState>) => void, workspacePath: string | null) {
    patchAlignerUi(set, (state) => {
      if (state.workspacePath === workspacePath) return state;
      return {
        ...state,
        workspacePath,
        source: null,
        scan: null,
        scanSourceKey: null,
        appliedAlignStateKey: null,
        loadedFrameSelection: null,
        frame: null,
        error: null,
        status: null,
      };
    });
  },
  setSource(set: (update: StateUpdater<AlignerUiState>) => void, source: AlignerSource | null) {
    patchAlignerUi(set, (state) => ({
      ...state,
      source,
      scan: null,
      scanSourceKey: null,
      appliedAlignStateKey: null,
      selection: defaultSelection,
      loadedFrameSelection: null,
      frame: null,
      contrast: null,
      grid: normalizeAlignGridState(createDefaultAlignGrid()),
      excludedCellsByPosition: {},
      error: null,
      status: source ? "Scanning source" : null,
    }));
  },
  applySourceScan(
    set: (update: StateUpdater<AlignerUiState>) => void,
    nextSourceKey: string,
    scan: WorkspaceScan,
  ) {
    patchAlignerUi(set, (state) => {
      if (state.scanSourceKey === nextSourceKey) return state;
      return {
        ...state,
        scan,
        scanSourceKey: nextSourceKey,
        appliedAlignStateKey: null,
        loadedFrameSelection: null,
        selection: {
          pos: firstOrZero(scan.positions),
          channel: firstOrZero(scan.channels),
          time: firstOrZero(scan.times),
          z: firstOrZero(scan.zSlices),
        },
        frame: null,
        contrast: null,
        grid: createVisibleDefaultAlignGrid(),
        excludedCellsByPosition: {},
        error: null,
        status: "Source loaded",
      };
    });
  },
  applyLoadedFrame(
    set: (update: StateUpdater<AlignerUiState>) => void,
    loadedFrameSelection: FrameRequest,
    frame: FrameResult,
    savedAlignState: LoadedSavedAlignState | null,
  ) {
    patchAlignerUi(set, (state) => {
      const nextState = { ...state, loadedFrameSelection, frame, status: null };
      if (!savedAlignState || state.appliedAlignStateKey === savedAlignState.stateKey) {
        return nextState;
      }
      const nextExcluded = savedAlignState.saved
        ? setExcludedAlignGridCellsForPosition(
            state.excludedCellsByPosition,
            savedAlignState.pos,
            savedAlignState.saved.excludedCells,
          )
        : state.excludedCellsByPosition;
      return {
        ...nextState,
        appliedAlignStateKey: savedAlignState.stateKey,
        grid: savedAlignState.saved
          ? normalizeAlignGridState(savedAlignState.saved.grid)
          : state.grid,
        excludedCellsByPosition: nextExcluded,
      };
    });
  },
  setSelection(set: (update: StateUpdater<AlignerUiState>) => void, patch: Partial<FrameRequest>) {
    patchAlignerUi(set, (state) => ({
      ...state,
      selection: { ...state.selection, ...patch },
      appliedAlignStateKey:
        patch.pos != null && patch.pos !== state.selection.pos ? null : state.appliedAlignStateKey,
    }));
  },
  setFrame(set: (update: StateUpdater<AlignerUiState>) => void, frame: FrameResult | null) {
    patchAlignerUi(set, (state) => ({
      ...state,
      frame,
      loadedFrameSelection: frame ? state.loadedFrameSelection : null,
    }));
  },
  setContrast(set: (update: StateUpdater<AlignerUiState>) => void, contrast: ContrastWindow | null) {
    patchAlignerUi(set, (state) => ({ ...state, contrast }));
  },
  setGrid(
    set: (update: StateUpdater<AlignerUiState>) => void,
    next: StateUpdater<AlignGridState>,
  ) {
    patchAlignerUi(set, (state) => ({
      ...state,
      grid: normalizeAlignGridState(resolveNextValue(state.grid, next)),
    }));
  },
  setToolMode(set: (update: StateUpdater<AlignerUiState>) => void, toolMode: AlignGridToolMode) {
    patchAlignerUi(set, (state) => ({ ...state, toolMode }));
  },
  setPatternZoomLocked(set: (update: StateUpdater<AlignerUiState>) => void, patternZoomLocked: boolean) {
    patchAlignerUi(set, (state) => ({ ...state, patternZoomLocked }));
  },
  setExcludedCellsForCurrentPosition(
    set: (update: StateUpdater<AlignerUiState>) => void,
    cells: Iterable<AlignGridCellCoord>,
  ) {
    patchAlignerUi(set, (state) => ({
      ...state,
      excludedCellsByPosition: setExcludedAlignGridCellsForPosition(
        state.excludedCellsByPosition,
        state.selection.pos,
        cells,
      ),
    }));
  },
  setFrameLoading(set: (update: StateUpdater<AlignerUiState>) => void, frameLoading: boolean) {
    patchAlignerUi(set, (state) => ({ ...state, frameLoading }));
  },
  setSaving(set: (update: StateUpdater<AlignerUiState>) => void, saving: boolean) {
    patchAlignerUi(set, (state) => ({ ...state, saving }));
  },
  setCropProgress(set: (update: StateUpdater<AlignerUiState>) => void, cropProgress: CropRoiProgress | null) {
    patchAlignerUi(set, (state) => ({ ...state, cropProgress }));
  },
  setError(set: (update: StateUpdater<AlignerUiState>) => void, error: string | null) {
    patchAlignerUi(set, (state) => ({ ...state, error }));
  },
  setStatus(set: (update: StateUpdater<AlignerUiState>) => void, status: string | null) {
    patchAlignerUi(set, (state) => ({ ...state, status }));
  },
};

export function hydrateAlignerSession(
  set: (update: StateUpdater<AlignerUiState>) => void,
): void {
  const session = readAlignerSession();
  if (!session) return;
  patchAlignerUi(set, (state) => ({
    ...state,
    workspacePath: session.workspacePath,
    source: session.source,
  }));
}

import type { AlignGridCellCoord, AlignGridState, AlignerSource, ContrastWindow, CropRoiProgress, FrameRequest, SavedAlignState, WorkspaceScan } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import {
  createDefaultAlignGrid,
  normalizeAlignGridState,
  resolveAxisSelection,
  setExcludedAlignGridCellsForPosition,
  type AlignGridToolMode,
} from "@lisca/utils";
import { liscaSessionStorage, readStorageJson, writeStorageJson } from "@lisca/storage";
import { Atom } from "@effect-atom/atom-react";
import { touchAlignerWorkSessionFromState } from "../session/work-session";

export type ExcludedByPosition = Record<number, AlignGridCellCoord[]>;

export type StateUpdater<T> = T | ((current: T) => T);

export type LoadedSavedAlignState = {
  stateKey: string;
  pos: number;
  saved: SavedAlignState | null;
};

export type AlignUiState = {
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
  manualExclusionEnabled: boolean;
  excludedCellsByPosition: ExcludedByPosition;
  frameLoading: boolean;
  saving: boolean;
  cropProgress: CropRoiProgress | null;
  error: string | null;
  status: string | null;
};

const defaultSelection: FrameRequest = { pos: 0, channel: 0, time: 0, z: 0 };

function firstOrZero(values: number[] | undefined): number {
  return values?.[0] ?? 0;
}

function scanValueOrFirst(values: number[] | undefined, preferred: number): number {
  return resolveAxisSelection(values, preferred);
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

export function createInitialAlignUiState(): AlignUiState {
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
    manualExclusionEnabled: false,
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

export type AlignUiPersist = {
  write: (state: AlignUiState) => void;
  read: () => Partial<AlignUiState> | null;
};

export type AlignUiBehavior = {
  /** Clearing workspace also clears source/scan (aligner). */
  clearSourceOnWorkspaceChange: boolean;
  /** After scan, keep prior selection dims when still valid (studio). */
  preserveSelectionOnScan: boolean;
  /** No-op setSource when serialized source unchanged (studio). */
  skipRedundantSourceSet: boolean;
  /** Expose applySavedAlignState reducer (studio). */
  includeApplySavedAlignState: boolean;
};

export type AlignUiAtom = ReturnType<typeof Atom.make<AlignUiState>>;

export function createAlignUiAtom(): AlignUiAtom {
  return Atom.make(createInitialAlignUiState()).pipe(Atom.keepAlive);
}

export function patchAlignUi(
  set: (update: StateUpdater<AlignUiState>) => void,
  persist: AlignUiPersist,
  patch: Partial<AlignUiState> | ((state: AlignUiState) => AlignUiState),
): void {
  set((state) => {
    const next = typeof patch === "function" ? patch(state) : { ...state, ...patch };
    persist.write(next);
    return next;
  });
}

export function createAlignUiActions(persist: AlignUiPersist, behavior: AlignUiBehavior) {
  const base = {
    setWorkspacePath(
      set: (update: StateUpdater<AlignUiState>) => void,
      workspacePath: string | null,
    ) {
      patchAlignUi(set, persist, (state) => {
        if (state.workspacePath === workspacePath) return state;
        if (behavior.clearSourceOnWorkspaceChange) {
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
        }
        return {
          ...state,
          workspacePath,
          appliedAlignStateKey: null,
          frame: null,
          error: null,
          status: null,
        };
      });
    },
    setSource(set: (update: StateUpdater<AlignUiState>) => void, source: AlignerSource | null) {
      patchAlignUi(set, persist, (state) => {
        if (behavior.skipRedundantSourceSet && sourceKey(state.source) === sourceKey(source)) {
          return state;
        }
        return {
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
        };
      });
    },
    applySourceScan(
      set: (update: StateUpdater<AlignUiState>) => void,
      nextSourceKey: string,
      scan: WorkspaceScan,
    ) {
      patchAlignUi(set, persist, (state) => {
        if (state.scanSourceKey === nextSourceKey) return state;
        const selection = behavior.preserveSelectionOnScan
          ? {
              pos: scanValueOrFirst(scan.positions, state.selection.pos),
              channel: scanValueOrFirst(scan.channels, state.selection.channel),
              time: scanValueOrFirst(scan.times, state.selection.time),
              z: scanValueOrFirst(scan.zSlices, state.selection.z),
            }
          : {
              pos: firstOrZero(scan.positions),
              channel: firstOrZero(scan.channels),
              time: firstOrZero(scan.times),
              z: firstOrZero(scan.zSlices),
            };
        return {
          ...state,
          scan,
          scanSourceKey: nextSourceKey,
          appliedAlignStateKey: null,
          loadedFrameSelection: null,
          selection,
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
      set: (update: StateUpdater<AlignUiState>) => void,
      loadedFrameSelection: FrameRequest,
      frame: FrameResult,
      savedAlignState: LoadedSavedAlignState | null,
    ) {
      patchAlignUi(set, persist, (state) => {
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
    setSelection(set: (update: StateUpdater<AlignUiState>) => void, patch: Partial<FrameRequest>) {
      patchAlignUi(set, persist, (state) => ({
        ...state,
        selection: { ...state.selection, ...patch },
        appliedAlignStateKey:
          patch.pos != null && patch.pos !== state.selection.pos
            ? null
            : state.appliedAlignStateKey,
      }));
    },
    setFrame(set: (update: StateUpdater<AlignUiState>) => void, frame: FrameResult | null) {
      patchAlignUi(set, persist, (state) => ({
        ...state,
        frame,
        loadedFrameSelection: frame ? state.loadedFrameSelection : null,
      }));
    },
    setContrast(
      set: (update: StateUpdater<AlignUiState>) => void,
      contrast: ContrastWindow | null,
    ) {
      patchAlignUi(set, persist, (state) => ({ ...state, contrast }));
    },
    setGrid(set: (update: StateUpdater<AlignUiState>) => void, next: StateUpdater<AlignGridState>) {
      patchAlignUi(set, persist, (state) => ({
        ...state,
        grid: normalizeAlignGridState(resolveNextValue(state.grid, next)),
      }));
    },
    setToolMode(set: (update: StateUpdater<AlignUiState>) => void, toolMode: AlignGridToolMode) {
      patchAlignUi(set, persist, (state) => ({ ...state, toolMode }));
    },
    setPatternZoomLocked(
      set: (update: StateUpdater<AlignUiState>) => void,
      patternZoomLocked: boolean,
    ) {
      patchAlignUi(set, persist, (state) => ({ ...state, patternZoomLocked }));
    },
    setManualExclusionEnabled(
      set: (update: StateUpdater<AlignUiState>) => void,
      manualExclusionEnabled: boolean,
    ) {
      patchAlignUi(set, persist, (state) => ({ ...state, manualExclusionEnabled }));
    },
    setExcludedCellsForCurrentPosition(
      set: (update: StateUpdater<AlignUiState>) => void,
      cells: Iterable<AlignGridCellCoord>,
    ) {
      patchAlignUi(set, persist, (state) => ({
        ...state,
        excludedCellsByPosition: setExcludedAlignGridCellsForPosition(
          state.excludedCellsByPosition,
          state.selection.pos,
          cells,
        ),
      }));
    },
    setFrameLoading(set: (update: StateUpdater<AlignUiState>) => void, frameLoading: boolean) {
      patchAlignUi(set, persist, (state) => ({ ...state, frameLoading }));
    },
    setSaving(set: (update: StateUpdater<AlignUiState>) => void, saving: boolean) {
      patchAlignUi(set, persist, (state) => ({ ...state, saving }));
    },
    setCropProgress(
      set: (update: StateUpdater<AlignUiState>) => void,
      cropProgress: CropRoiProgress | null,
    ) {
      patchAlignUi(set, persist, (state) => ({ ...state, cropProgress }));
    },
    setError(set: (update: StateUpdater<AlignUiState>) => void, error: string | null) {
      patchAlignUi(set, persist, (state) => ({ ...state, error }));
    },
    setStatus(set: (update: StateUpdater<AlignUiState>) => void, status: string | null) {
      patchAlignUi(set, persist, (state) => ({ ...state, status }));
    },
  };

  const applySavedAlignState = behavior.includeApplySavedAlignState
    ? {
        applySavedAlignState(
          set: (update: StateUpdater<AlignUiState>) => void,
          stateKey: string,
          pos: number,
          saved: SavedAlignState | null,
        ) {
          patchAlignUi(set, persist, (state) => {
            if (state.appliedAlignStateKey === stateKey) return state;
            const nextExcluded = saved
              ? setExcludedAlignGridCellsForPosition(
                  state.excludedCellsByPosition,
                  pos,
                  saved.excludedCells,
                )
              : state.excludedCellsByPosition;
            return {
              ...state,
              appliedAlignStateKey: stateKey,
              grid: saved ? normalizeAlignGridState(saved.grid) : state.grid,
              excludedCellsByPosition: nextExcluded,
              status: saved ? `Loaded align/Pos${pos}.json` : state.status,
            };
          });
        },
      }
    : {};

  return { ...base, ...applySavedAlignState };
}

export type AlignUiActions = ReturnType<typeof createAlignUiActions>;

export function createAlignerPersist(sessionKey: string): AlignUiPersist {
  return {
    write(state) {
      touchAlignerWorkSessionFromState(state);
    },
    read() {
      return null;
    },
  };
}

export function createStudioPersist(sessionKey: string): AlignUiPersist {
  return {
    write(state) {
      writeStorageJson(liscaSessionStorage(), sessionKey, {
        state: {
          workspacePath: state.workspacePath,
          source: state.source,
          selection: state.selection,
        },
      });
    },
    read() {
      const parsed = readStorageJson<{
        state?: {
          workspacePath: string | null;
          source: AlignerSource | null;
          selection: FrameRequest;
        };
      }>(liscaSessionStorage(), sessionKey);
      if (!parsed) return null;
      const session =
        parsed.state ??
        (parsed as {
          workspacePath: string | null;
          source: AlignerSource | null;
          selection: FrameRequest;
        });
      return {
        workspacePath: session.workspacePath,
        source: session.source,
        selection: session.selection,
      };
    },
  };
}

export function hydrateAlignUi(
  set: (update: StateUpdater<AlignUiState>) => void,
  persist: AlignUiPersist,
): void {
  const session = persist.read();
  if (!session) return;
  patchAlignUi(set, persist, (state) => ({ ...state, ...session }));
}

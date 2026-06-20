import type { AlignGridCellCoord, AlignGridState, ContrastWindow } from "@lisca/contracts";
import type { VariationExcludePreviewState } from "@lisca/ui/features";
import type { FrameResult } from "@lisca/utils";
import { Atom } from "@effect-atom/atom-react";
import { createDefaultAlignGrid, type AlignGridToolMode } from "@lisca/utils";

import type { SourceImageFormat } from "../browser/source-image-format";
import type { StateUpdater } from "./state-utils";

export type DemoAlignUiState = {
  fileName: string | null;
  sourceFormat: SourceImageFormat | null;
  frameLoading: boolean;
  saving: boolean;
  error: string | null;
  status: string | null;
  contrast: ContrastWindow | null;
  frame: FrameResult | null;
  grid: AlignGridState;
  toolMode: AlignGridToolMode;
  patternZoomLocked: boolean;
  manualExclusionEnabled: boolean;
  excludedCells: AlignGridCellCoord[];
  variationExcludePreview: VariationExcludePreviewState;
  variationExcludeLoading: boolean;
};

export type DemoAlignSession = Pick<
  DemoAlignUiState,
  | "fileName"
  | "sourceFormat"
  | "frame"
  | "contrast"
  | "grid"
  | "toolMode"
  | "patternZoomLocked"
  | "excludedCells"
>;

export function createInitialDemoAlignUiState(): DemoAlignUiState {
  return {
    fileName: null,
    sourceFormat: null,
    frameLoading: false,
    saving: false,
    error: null,
    status: null,
    contrast: null,
    frame: null,
    grid: {
      ...createDefaultAlignGrid(),
      enabled: true,
    },
    toolMode: "pan",
    patternZoomLocked: false,
    manualExclusionEnabled: false,
    excludedCells: [],
    variationExcludePreview: null,
    variationExcludeLoading: false,
  };
}

export function selectDemoAlignSession(state: DemoAlignUiState): DemoAlignSession {
  return {
    fileName: state.fileName,
    sourceFormat: state.sourceFormat,
    frame: state.frame,
    contrast: state.contrast,
    grid: state.grid,
    toolMode: state.toolMode,
    patternZoomLocked: state.patternZoomLocked,
    excludedCells: state.excludedCells,
  };
}

export function mergeDemoAlignSession(
  session: DemoAlignSession,
  current: DemoAlignUiState,
): DemoAlignUiState {
  return {
    ...current,
    ...session,
    status: session.fileName ? `Restored ${session.fileName}` : current.status,
  };
}

export type DemoAlignUiAtom = ReturnType<typeof Atom.make<DemoAlignUiState>>;

export const demoAlignUiAtom: DemoAlignUiAtom = Atom.make(createInitialDemoAlignUiState()).pipe(
  Atom.keepAlive,
);

function patchDemoAlignUi(
  set: (update: StateUpdater<DemoAlignUiState>) => void,
  patch: Partial<DemoAlignUiState> | ((state: DemoAlignUiState) => DemoAlignUiState),
): void {
  set((state) => (typeof patch === "function" ? patch(state) : { ...state, ...patch }));
}

export const demoAlignUiActions = {
  setContrast(
    set: (update: StateUpdater<DemoAlignUiState>) => void,
    contrast: ContrastWindow | null,
  ) {
    patchDemoAlignUi(set, { contrast });
  },
  setGrid(
    set: (update: StateUpdater<DemoAlignUiState>) => void,
    next: AlignGridState | ((current: AlignGridState) => AlignGridState),
  ) {
    patchDemoAlignUi(set, (state) => ({
      ...state,
      grid: typeof next === "function" ? next(state.grid) : next,
    }));
  },
  setToolMode(set: (update: StateUpdater<DemoAlignUiState>) => void, toolMode: AlignGridToolMode) {
    patchDemoAlignUi(set, { toolMode });
  },
  setPatternZoomLocked(set: (update: StateUpdater<DemoAlignUiState>) => void, locked: boolean) {
    patchDemoAlignUi(set, { patternZoomLocked: locked });
  },
  setManualExclusionEnabled(
    set: (update: StateUpdater<DemoAlignUiState>) => void,
    manualExclusionEnabled: boolean,
  ) {
    patchDemoAlignUi(set, { manualExclusionEnabled });
  },
  setExcludedCells(
    set: (update: StateUpdater<DemoAlignUiState>) => void,
    cells: AlignGridCellCoord[],
  ) {
    patchDemoAlignUi(set, { excludedCells: cells });
  },
  setVariationExcludePreview(
    set: (update: StateUpdater<DemoAlignUiState>) => void,
    preview: VariationExcludePreviewState,
  ) {
    patchDemoAlignUi(set, { variationExcludePreview: preview });
  },
  setVariationExcludeLoading(
    set: (update: StateUpdater<DemoAlignUiState>) => void,
    loading: boolean,
  ) {
    patchDemoAlignUi(set, { variationExcludeLoading: loading });
  },
  setFrameLoading(set: (update: StateUpdater<DemoAlignUiState>) => void, frameLoading: boolean) {
    patchDemoAlignUi(set, { frameLoading });
  },
  setSaving(set: (update: StateUpdater<DemoAlignUiState>) => void, saving: boolean) {
    patchDemoAlignUi(set, { saving });
  },
  setError(set: (update: StateUpdater<DemoAlignUiState>) => void, error: string | null) {
    patchDemoAlignUi(set, { error });
  },
  setStatus(set: (update: StateUpdater<DemoAlignUiState>) => void, status: string | null) {
    patchDemoAlignUi(set, { status });
  },
  applyLoadedImage(
    set: (update: StateUpdater<DemoAlignUiState>) => void,
    fileName: string,
    sourceFormat: SourceImageFormat,
    frame: FrameResult,
  ) {
    patchDemoAlignUi(set, {
      fileName,
      sourceFormat,
      frame,
      contrast: null,
      excludedCells: [],
      variationExcludePreview: null,
      grid: {
        ...createDefaultAlignGrid(),
        enabled: true,
      },
      error: null,
      status: null,
    });
  },
  applyDemoPreset(
    set: (update: StateUpdater<DemoAlignUiState>) => void,
    input: {
      fileName: string;
      frame: FrameResult;
      grid: AlignGridState;
      excludedCells?: AlignGridCellCoord[];
    },
  ) {
    patchDemoAlignUi(set, {
      fileName: input.fileName,
      sourceFormat: { kind: "png" },
      frame: input.frame,
      contrast: null,
      excludedCells: input.excludedCells ?? [],
      variationExcludePreview: null,
      grid: input.grid,
      error: null,
      status: "Sample image loaded — adjust the grid if needed",
    });
  },
  clearLoadedImage(set: (update: StateUpdater<DemoAlignUiState>) => void) {
    patchDemoAlignUi(set, {
      fileName: null,
      sourceFormat: null,
      frame: null,
      error: null,
      status: null,
    });
  },
};

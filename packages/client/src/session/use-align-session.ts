import type {
  AlignGridCellCoord,
  AlignGridState,
  AlignerSource,
  ContrastWindow,
  FrameRequest,
  WorkspaceScan,
} from "@lisca/contracts";
import type { AlignGridToolMode } from "@lisca/utils";
import { Result } from "@effect-atom/atom-solid";
import { createEffect, type Accessor } from "solid-js";
import {
  deriveCurrentExcludedCells,
  deriveDisplayedExcludedCells,
  deriveVisibleCounts,
  isCropping,
  shouldApplySourceScan,
} from "./align-session";
import type { AlignUiActions, AlignUiState, StateUpdater } from "../atoms/align-ui";
import { resultData, resultFailureMessage, resultLoading } from "../atoms/result-utils";

export type AlignSessionMeta = {
  scanLoading: boolean;
  frameLoading: boolean;
  saving: boolean;
  cropping: boolean;
};

export type AlignSessionActions = {
  setSource: (source: AlignerSource | null) => void;
  setSelection: (patch: Partial<FrameRequest>) => void;
  setContrast: (contrast: ContrastWindow | null) => void;
  setGrid: (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) => void;
  setToolMode: (mode: AlignGridToolMode) => void;
  setPatternZoomLocked: (locked: boolean) => void;
  setManualExclusionEnabled: (enabled: boolean) => void;
  setExcludedCellsForCurrentPosition: (cells: Iterable<AlignGridCellCoord>) => void;
};

export type AlignWorkspaceSync = {
  workspacePath: Accessor<string | null>;
  setWorkspacePath: (path: string | null) => void;
  sourcePath: Accessor<string | null>;
  setSourcePath: (path: string | null) => void;
};

export type AlignScanAtoms = {
  scanResult: Accessor<Result.Result<WorkspaceScan, unknown> | undefined>;
  activeSourceKey: Accessor<string | null>;
};

export type UseAlignSessionCoreOptions = {
  ui: Accessor<AlignUiState>;
  setUi: (update: StateUpdater<AlignUiState>) => void;
  actions: AlignUiActions;
  workspace?: AlignWorkspaceSync;
  scan: AlignScanAtoms;
  toErrorMessage: (cause: unknown, fallback: string) => void;
  /** Override selection used for excluded-cell derivation (studio locked selection). */
  effectiveSelection?: Accessor<FrameRequest>;
};

export function useAlignSessionCore(options: UseAlignSessionCoreOptions) {
  const { ui, setUi, actions, workspace, scan, effectiveSelection } = options;

  const sessionActions: AlignSessionActions = {
    setSource: (source: AlignerSource | null) => actions.setSource(setUi, source),
    setSelection: (patch) => actions.setSelection(setUi, patch),
    setContrast: (contrast) => actions.setContrast(setUi, contrast),
    setGrid: (next) => actions.setGrid(setUi, next),
    setToolMode: (mode) => actions.setToolMode(setUi, mode),
    setPatternZoomLocked: (locked) => actions.setPatternZoomLocked(setUi, locked),
    setManualExclusionEnabled: (enabled) => actions.setManualExclusionEnabled(setUi, enabled),
    setExcludedCellsForCurrentPosition: (cells) =>
      actions.setExcludedCellsForCurrentPosition(setUi, cells),
  };

  createEffect(() => {
    if (!workspace) return;
    const currentUi = ui();
    const shellWorkspacePath = workspace.workspacePath();
    if (shellWorkspacePath === currentUi.workspacePath) return;
    if (shellWorkspacePath == null && currentUi.workspacePath != null) {
      workspace.setWorkspacePath(currentUi.workspacePath);
      return;
    }
    actions.setWorkspacePath(setUi, shellWorkspacePath);
  });

  createEffect(() => {
    if (!workspace) return;
    const sourcePath = ui().source?.path ?? null;
    if (workspace.sourcePath() !== sourcePath) {
      workspace.setSourcePath(sourcePath);
    }
  });

  createEffect(() => {
    const currentUi = ui();
    if (!currentUi.source || !resultLoading(scan.scanResult())) return;
    if (currentUi.error === null && currentUi.status === "Scanning source") return;
    actions.setError(setUi, null);
    actions.setStatus(setUi, "Scanning source");
  });

  createEffect(() => {
    const currentUi = ui();
    const scanData = resultData(scan.scanResult());
    const activeSourceKey = scan.activeSourceKey();
    if (!scanData || !activeSourceKey) return;
    if (!shouldApplySourceScan(currentUi.scanSourceKey, activeSourceKey)) return;
    actions.applySourceScan(setUi, activeSourceKey, scanData);
  });

  createEffect(() => {
    const message = resultFailureMessage(scan.scanResult());
    if (message == null || message === "") return;
    actions.setFrame(setUi, null);
    actions.setError(setUi, message);
  });

  const derived = () => {
    const currentUi = ui();
    const selection = effectiveSelection?.() ?? currentUi.selection;
    const scanLoading = currentUi.source != null && resultLoading(scan.scanResult());
    const currentExcludedCells = deriveCurrentExcludedCells(
      currentUi.excludedCellsByPosition,
      selection.pos,
    );
    const displayedExcludedCells = deriveDisplayedExcludedCells(
      currentUi.excludedCellsByPosition,
      currentUi.loadedFrameSelection?.pos,
      selection.pos,
    );
    const visibleCounts = deriveVisibleCounts(
      currentUi.frame,
      currentUi.grid,
      displayedExcludedCells,
    );
    const cropping = isCropping(currentUi.cropProgress);
    const meta: AlignSessionMeta = {
      scanLoading,
      frameLoading: currentUi.frameLoading,
      saving: currentUi.saving,
      cropping,
    };
    return {
      currentExcludedCells,
      displayedExcludedCells,
      visibleCounts,
      selection,
      meta,
    };
  };

  return {
    state: ui,
    actions: sessionActions,
    meta: () => derived().meta,
    derived: () => {
      const { meta: _meta, ...rest } = derived();
      return rest;
    },
  };
}
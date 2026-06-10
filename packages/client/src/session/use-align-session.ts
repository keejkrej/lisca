import type { AlignGridCellCoord, AlignGridState, AlignerSource, ContrastWindow, FrameRequest, WorkspaceScan } from "@lisca/contracts";
import type { AlignGridToolMode } from "@lisca/utils";
import { Result } from "@effect-atom/atom-react";
import { useEffect } from "react";
import {
  deriveCurrentExcludedCells,
  deriveDisplayedExcludedCells,
  deriveVisibleCounts,
  isCropping,
  shouldApplySourceScan,
} from "./align-session.ts";
import type { AlignUiActions, AlignUiState, StateUpdater } from "../atoms/align-ui.ts";
import { resultData, resultFailureMessage, resultLoading } from "../atoms/result-utils.ts";
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
  setExcludedCellsForCurrentPosition: (cells: Iterable<AlignGridCellCoord>) => void;
};
export type AlignWorkspaceSync = {
  workspacePath: string | null;
  setWorkspacePath: (path: string | null) => void;
  sourcePath: string | null;
  setSourcePath: (path: string | null) => void;
};
export type AlignScanAtoms = {
  scanResult: Result.Result<WorkspaceScan, unknown> | undefined;
  activeSourceKey: string | null;
};
export type UseAlignSessionCoreOptions = {
  ui: AlignUiState;
  setUi: (update: StateUpdater<AlignUiState>) => void;
  actions: AlignUiActions;
  workspace?: AlignWorkspaceSync;
  scan: AlignScanAtoms;
  toErrorMessage: (cause: unknown, fallback: string) => void;
  /** Override selection used for excluded-cell derivation (studio locked selection). */
  effectiveSelection?: FrameRequest;
};
export function useAlignSessionCore(options: UseAlignSessionCoreOptions) {
  const { ui, setUi, actions, workspace, scan, effectiveSelection } = options;
  const selection = effectiveSelection ?? ui.selection;
  const scanLoading = ui.source != null && resultLoading(scan.scanResult);
  const currentExcludedCells = deriveCurrentExcludedCells(
    ui.excludedCellsByPosition,
    selection.pos,
  );
  const displayedExcludedCells = deriveDisplayedExcludedCells(
    ui.excludedCellsByPosition,
    ui.loadedFrameSelection?.pos,
    selection.pos,
  );
  const visibleCounts = deriveVisibleCounts(ui.frame, ui.grid, displayedExcludedCells);
  const cropping = isCropping(ui.cropProgress);
  const meta: AlignSessionMeta = {
    scanLoading,
    frameLoading: ui.frameLoading,
    saving: ui.saving,
    cropping,
  };
  const sessionActions: AlignSessionActions = {
    setSource: (source: AlignerSource | null) => actions.setSource(setUi, source),
    setSelection: (patch) => actions.setSelection(setUi, patch),
    setContrast: (contrast) => actions.setContrast(setUi, contrast),
    setGrid: (next) => actions.setGrid(setUi, next),
    setToolMode: (mode) => actions.setToolMode(setUi, mode),
    setPatternZoomLocked: (locked) => actions.setPatternZoomLocked(setUi, locked),
    setExcludedCellsForCurrentPosition: (cells) =>
      actions.setExcludedCellsForCurrentPosition(setUi, cells),
  };
  useEffect(() => {
    if (!workspace) return;
    if (workspace.workspacePath === ui.workspacePath) return;
    if (workspace.workspacePath == null && ui.workspacePath != null) {
      workspace.setWorkspacePath(ui.workspacePath);
      return;
    }
    actions.setWorkspacePath(setUi, workspace.workspacePath);
  }, [actions, setUi, ui.workspacePath, workspace]);
  useEffect(() => {
    if (!workspace) return;
    const sourcePath = ui.source?.path ?? null;
    if (workspace.sourcePath !== sourcePath) {
      workspace.setSourcePath(sourcePath);
    }
  }, [ui.source, workspace]);
  useEffect(() => {
    if (!ui.source || !scanLoading) return;
    actions.setError(setUi, null);
    actions.setStatus(setUi, "Scanning source");
  }, [actions, scanLoading, setUi, ui.source]);
  useEffect(() => {
    const scanData = resultData(scan.scanResult);
    if (!scanData || !scan.activeSourceKey) return;
    if (!shouldApplySourceScan(ui.scanSourceKey, scan.activeSourceKey)) return;
    actions.applySourceScan(setUi, scan.activeSourceKey, scanData);
  }, [actions, scan.activeSourceKey, scan.scanResult, setUi, ui.scanSourceKey]);
  useEffect(() => {
    const message = resultFailureMessage(scan.scanResult);
    if (message == null || message === "") return;
    actions.setFrame(setUi, null);
    actions.setError(setUi, message);
  }, [actions, scan.scanResult, setUi]);
  return {
    state: ui,
    actions: sessionActions,
    meta,
    derived: {
      currentExcludedCells,
      displayedExcludedCells,
      visibleCounts,
      selection,
    },
  };
}

import type { AnnotationLabel, RoiWorkspaceScan } from "@lisca/contracts";
import type { Result } from "@effect-atom/atom-react";
import { clamp } from "@lisca/utils";
import { useEffect } from "react";
import type {
  AnnotatorUiActions,
  AnnotatorUiState,
  RoiSelection,
  StateUpdater,
} from "./atoms/annotator-ui.ts";
import { currentPosition } from "./atoms/annotator-ui.ts";
import { resultData, resultFailureMessage, resultLoading } from "./atoms/result-utils.ts";
export type AnnotateWorkspaceSync = {
  workspacePath: string | null;
  setWorkspacePath: (path: string | null) => void;
};
export type AnnotateScanAtoms = {
  scanResult: Result.Result<RoiWorkspaceScan, unknown> | undefined;
  labelsResult: Result.Result<readonly AnnotationLabel[], unknown> | undefined;
  shellWorkspacePath: string | null;
};
export type AnnotateSessionMeta = {
  scanLoading: boolean;
};
export type AnnotateSessionActions = {
  setSelection: (patch: Partial<RoiSelection>) => void;
  setContrast: (contrast: AnnotatorUiState["contrast"]) => void;
  setMode: (mode: AnnotatorUiState["mode"]) => void;
  setTool: (tool: AnnotatorUiState["tool"]) => void;
  setBrushSize: (brushSize: number) => void;
  setOverlayOpacity: (overlayOpacity: number) => void;
  setActiveLabelId: (activeLabelId: string | null) => void;
  setLabelDialogOpen: (open: boolean) => void;
  setLabelError: (error: string | null) => void;
};
export type UseAnnotateSessionCoreOptions = {
  ui: AnnotatorUiState;
  setUi: (update: StateUpdater<AnnotatorUiState>) => void;
  actions: AnnotatorUiActions;
  workspace: AnnotateWorkspaceSync;
  scan: AnnotateScanAtoms;
  toErrorMessage: (cause: unknown, fallback: string) => string;
};
export function useAnnotateSessionCore(options: UseAnnotateSessionCoreOptions) {
  const { ui, setUi, actions, workspace, scan, toErrorMessage } = options;
  const scanLoading = Boolean(
    scan.shellWorkspacePath && (resultLoading(scan.scanResult) || resultLoading(scan.labelsResult)),
  );
  const sessionActions: AnnotateSessionActions = {
    setSelection: (patch) => actions.setSelection(setUi, patch),
    setContrast: (contrast) => actions.setContrast(setUi, contrast),
    setMode: (mode) => actions.setMode(setUi, mode),
    setTool: (tool) => actions.setTool(setUi, tool),
    setBrushSize: (brushSize) => actions.setBrushSize(setUi, brushSize),
    setOverlayOpacity: (overlayOpacity) => actions.setOverlayOpacity(setUi, overlayOpacity),
    setActiveLabelId: (activeLabelId) => actions.setActiveLabelId(setUi, activeLabelId),
    setLabelDialogOpen: (open) => actions.setLabelDialogOpen(setUi, open),
    setLabelError: (error) => actions.setLabelError(setUi, error),
  };
  const { setSelection } = sessionActions;
  useEffect(() => {
    if (workspace.workspacePath === ui.workspacePath) return;
    if (workspace.workspacePath == null && ui.workspacePath != null) {
      workspace.setWorkspacePath(ui.workspacePath);
      return;
    }
    actions.setWorkspacePath(setUi, workspace.workspacePath);
  }, [actions, setUi, ui.workspacePath, workspace]);
  useEffect(() => {
    if (scanLoading) {
      actions.setScanError(setUi, null);
      actions.setStatus(setUi, "Scanning ROI workspace");
    }
  }, [actions, scanLoading, setUi]);
  useEffect(() => {
    if (ui.workspacePath !== scan.shellWorkspacePath) return;
    const scanData = resultData(scan.scanResult);
    if (scanData) actions.setStatus(setUi, "ROI workspace loaded");
  }, [actions, scan.scanResult, scan.shellWorkspacePath, setUi, ui.workspacePath]);
  useEffect(() => {
    if (ui.workspacePath !== scan.shellWorkspacePath) return;
    const labels = resultData(scan.labelsResult);
    if (!labels || labels.length === 0) return;
    actions.syncActiveLabelFromLabels(
      setUi,
      labels.map((label) => label.id),
    );
  }, [actions, scan.labelsResult, scan.shellWorkspacePath, setUi, ui.workspacePath]);
  useEffect(() => {
    if (ui.workspacePath !== scan.shellWorkspacePath) return;
    const scanLoadError = resultFailureMessage(scan.scanResult);
    const labelsLoadError = resultFailureMessage(scan.labelsResult);
    const error = scanLoadError ?? labelsLoadError;
    if (!error) return;
    actions.setFrame(setUi, null);
    actions.setScanError(setUi, toErrorMessage(error, "ROI workspace load failed"));
  }, [
    actions,
    scan.labelsResult,
    scan.scanResult,
    scan.shellWorkspacePath,
    setUi,
    toErrorMessage,
    ui.workspacePath,
  ]);
  const scanData = resultData(scan.scanResult);
  useEffect(() => {
    const firstPosition = scanData?.positions[0] ?? null;
    if (!firstPosition) {
      if (
        ui.selection.pos !== null ||
        ui.selection.roi !== null ||
        ui.selection.channel !== null ||
        ui.selection.timeIndex !== 0 ||
        ui.selection.zIndex !== 0
      ) {
        setSelection({
          pos: null,
          roi: null,
          channel: null,
          timeIndex: 0,
          zIndex: 0,
        });
      }
      return;
    }
    if (!scanData?.positions.some((entry) => entry.pos === ui.selection.pos)) {
      setSelection({
        pos: firstPosition.pos,
      });
    }
  }, [scanData, setSelection, ui.selection]);
  const position = currentPosition(scanData ?? null, ui.selection.pos);
  useEffect(() => {
    if (!position) return;
    const patch = {
      channel: position.channels.includes(ui.selection.channel ?? Number.NaN)
        ? ui.selection.channel
        : (position.channels[0] ?? null),
      roi: position.rois.some((entry) => entry.roi === ui.selection.roi)
        ? ui.selection.roi
        : (position.rois[0]?.roi ?? null),
      timeIndex: clamp(ui.selection.timeIndex, 0, Math.max(0, position.times.length - 1)),
      zIndex: clamp(ui.selection.zIndex, 0, Math.max(0, position.zSlices.length - 1)),
    };
    if (
      patch.channel !== ui.selection.channel ||
      patch.roi !== ui.selection.roi ||
      patch.timeIndex !== ui.selection.timeIndex ||
      patch.zIndex !== ui.selection.zIndex
    ) {
      setSelection(patch);
    }
  }, [position, setSelection, ui.selection]);
  return {
    state: ui,
    actions: sessionActions,
    meta: {
      scanLoading,
    } satisfies AnnotateSessionMeta,
    derived: {
      scan: scanData ?? null,
      position,
    },
  };
}

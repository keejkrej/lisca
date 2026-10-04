import type { AnnotationLabel, RoiWorkspaceScan } from "@lisca/contracts";
import type { AsyncResult } from "effect/unstable/reactivity";
import { clamp } from "@lisca/utils";
import { createEffect, on, untrack, type Accessor } from "solid-js";
import type {
  AnnotatorUiActions,
  AnnotatorUiState,
  RoiSelection,
  StateUpdater,
} from "../atoms/annotator-ui";
import { currentPosition } from "../atoms/annotator-ui";
import { resultData, resultFailureMessage, resultLoading } from "../atoms/result-utils";

export type AnnotateWorkspaceSync = {
  workspacePath: string | null;
  setWorkspacePath: (path: string | null) => void;
};

export type AnnotateScanAtoms = {
  scanResult: Accessor<AsyncResult.AsyncResult<RoiWorkspaceScan, unknown> | undefined>;
  labelsResult: Accessor<AsyncResult.AsyncResult<readonly AnnotationLabel[], unknown> | undefined>;
  shellWorkspacePath: Accessor<string | null>;
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

export type AnnotateTimePreference = "first" | "last";

/**
 * Frame to show before the user picks one.
 * "first" leaves the stored index alone, clamped into the scan. "last" snaps
 * an untouched 0 to the final frame. Studio leaves this unset: Annotate walks
 * every frame and does not inherit Align's first or last frame.
 */
export function resolveAnnotateTimeIndex(input: {
  current: number;
  timeCount: number;
  preference: AnnotateTimePreference;
  timeChosen: boolean;
}): number {
  const max = Math.max(0, input.timeCount - 1);
  if (input.preference === "last" && !input.timeChosen && input.current === 0 && max > 0) {
    return max;
  }
  return clamp(input.current, 0, max);
}

export type UseAnnotateSessionCoreOptions<State extends AnnotatorUiState = AnnotatorUiState> = {
  ui: Accessor<State>;
  setUi: (update: StateUpdater<State>) => void;
  actions: AnnotatorUiActions<State>;
  workspace: AnnotateWorkspaceSync;
  scan: AnnotateScanAtoms;
  toErrorMessage: (cause: unknown, fallback: string) => string;
  /** Defaults to the first stored index. Pass "last" to snap an untouched 0. */
  initialTimeIndex?: AnnotateTimePreference;
};

export function useAnnotateSessionCore<State extends AnnotatorUiState>(
  options: UseAnnotateSessionCoreOptions<State>,
) {
  const { ui, setUi, actions, workspace, scan, toErrorMessage } = options;
  const timePreference = options.initialTimeIndex ?? "first";
  let timeChosen = false;

  const sessionActions: AnnotateSessionActions = {
    setSelection: (patch) => {
      if ("timeIndex" in patch) timeChosen = true;
      actions.setSelection(setUi, patch);
    },
    setContrast: (contrast) => actions.setContrast(setUi, contrast),
    setMode: (mode) => actions.setMode(setUi, mode),
    setTool: (tool) => actions.setTool(setUi, tool),
    setBrushSize: (brushSize) => actions.setBrushSize(setUi, brushSize),
    setOverlayOpacity: (overlayOpacity) => actions.setOverlayOpacity(setUi, overlayOpacity),
    setActiveLabelId: (activeLabelId) => actions.setActiveLabelId(setUi, activeLabelId),
    setLabelDialogOpen: (open) => actions.setLabelDialogOpen(setUi, open),
    setLabelError: (error) => actions.setLabelError(setUi, error),
  };

  let trackedWorkspace = untrack(() => ui().workspacePath);
  createEffect(() => {
    const path = ui().workspacePath;
    if (path === trackedWorkspace) return;
    trackedWorkspace = path;
    timeChosen = false;
  });

  createEffect(() => {
    const currentUi = ui();
    if (workspace.workspacePath === currentUi.workspacePath) return;
    if (workspace.workspacePath == null && currentUi.workspacePath != null) {
      workspace.setWorkspacePath(currentUi.workspacePath);
      return;
    }
    actions.setWorkspacePath(setUi, workspace.workspacePath);
  });

  createEffect(() => {
    const shellWorkspacePath = scan.shellWorkspacePath();
    const scanLoading = Boolean(
      shellWorkspacePath &&
      (resultLoading(scan.scanResult()) || resultLoading(scan.labelsResult())),
    );
    if (scanLoading) {
      actions.setScanError(setUi, null);
      actions.setStatus(setUi, "Scanning ROI workspace");
    }
  });

  // Announce a finished scan once. Tracking the whole UI atom here rewrote the
  // status on save and on every ROI change, so "ROI workspace loaded" replaced
  // the result the user had just asked about.
  createEffect(
    on(
      () => [scan.shellWorkspacePath(), resultData(scan.scanResult())] as const,
      ([shellWorkspacePath, scanData]) => {
        const workspacePath = untrack(() => ui().workspacePath);
        if (!scanData || workspacePath !== shellWorkspacePath) return;
        actions.setStatus(setUi, "ROI workspace loaded");
      },
    ),
  );

  createEffect(() => {
    const currentUi = ui();
    const shellWorkspacePath = scan.shellWorkspacePath();
    if (currentUi.workspacePath !== shellWorkspacePath) return;
    const labels = resultData(scan.labelsResult());
    if (!labels || labels.length === 0) return;
    actions.syncActiveLabelFromLabels(
      setUi,
      labels.map((label) => label.id),
    );
  });

  createEffect(() => {
    const shellWorkspacePath = scan.shellWorkspacePath();
    const workspacePath = untrack(() => ui().workspacePath);
    if (workspacePath !== shellWorkspacePath) return;
    const scanLoadError = resultFailureMessage(scan.scanResult());
    const labelsLoadError = resultFailureMessage(scan.labelsResult());
    const error = scanLoadError ?? labelsLoadError;
    if (!error) return;
    actions.setFrame(setUi, null);
    actions.setScanError(setUi, toErrorMessage(error, "ROI workspace load failed"));
  });

  const derived = () => {
    const currentUi = ui();
    const shellWorkspacePath = scan.shellWorkspacePath();
    const scanLoading = Boolean(
      shellWorkspacePath &&
      (resultLoading(scan.scanResult()) || resultLoading(scan.labelsResult())),
    );
    const scanData = resultData(scan.scanResult());
    const position = currentPosition(scanData ?? null, currentUi.selection.pos);
    return {
      scanLoading,
      scan: scanData ?? null,
      position,
    };
  };

  createEffect(() => {
    const currentUi = ui();
    const scanData = resultData(scan.scanResult());
    const firstPosition = scanData?.positions[0] ?? null;
    if (!firstPosition) {
      if (
        currentUi.selection.pos !== null ||
        currentUi.selection.roi !== null ||
        currentUi.selection.channel !== null ||
        currentUi.selection.timeIndex !== 0 ||
        currentUi.selection.zIndex !== 0
      ) {
        actions.setSelection(setUi, {
          pos: null,
          roi: null,
          channel: null,
          timeIndex: 0,
          zIndex: 0,
        });
      }
      return;
    }
    if (!scanData?.positions.some((entry) => entry.pos === currentUi.selection.pos)) {
      actions.setSelection(setUi, {
        pos: firstPosition.pos,
      });
    }
  });

  createEffect(() => {
    const currentUi = ui();
    const position = derived().position;
    if (!position) return;
    const patch = {
      channel: position.channels.includes(currentUi.selection.channel ?? Number.NaN)
        ? currentUi.selection.channel
        : (position.channels[0] ?? null),
      roi: position.rois.some((entry) => entry.roi === currentUi.selection.roi)
        ? currentUi.selection.roi
        : (position.rois[0]?.roi ?? null),
      timeIndex: resolveAnnotateTimeIndex({
        current: currentUi.selection.timeIndex,
        timeCount: position.times.length,
        preference: timePreference,
        timeChosen,
      }),
      zIndex: clamp(currentUi.selection.zIndex, 0, Math.max(0, position.zSlices.length - 1)),
    };
    if (
      patch.channel !== currentUi.selection.channel ||
      patch.roi !== currentUi.selection.roi ||
      patch.timeIndex !== currentUi.selection.timeIndex ||
      patch.zIndex !== currentUi.selection.zIndex
    ) {
      actions.setSelection(setUi, patch);
    }
  });

  return {
    state: ui,
    actions: sessionActions,
    meta: () =>
      ({
        scanLoading: derived().scanLoading,
      }) satisfies AnnotateSessionMeta,
    derived: () => {
      const { scanLoading: _scanLoading, ...rest } = derived();
      return rest;
    },
  };
}

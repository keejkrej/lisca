import type {
  AlignDrift,
  AlignGridPatternCoord,
  AlignGridShape,
  AlignGridState,
  AlignerSource,
  ContrastWindow,
  CropRoiProgress,
  FrameRequest,
  VariationExcludePreviewResponse,
  WorkspaceScan,
} from "@lisca/contracts";
import type { AlignGridPointerIntent, AlignGridToolMode, FrameResult } from "@lisca/utils";
import {
  alignSnapshotKey,
  nextAlignPosition,
  nextUnsavedAlignPosition,
  type CropConfirmState,
  type VariationExcludePreview,
} from "@lisca/client/align-session";
import { createAlignSessionController } from "@lisca/client/align-session/controller";
import { logClientEvent } from "@lisca/client/client-log";
import { runClientEffect } from "@lisca/client/runtime";
import { catalogFromScan, resolveStoredFileIds } from "@lisca/client/studio/position-index";
import {
  collectAssayPositions,
  filterScanPositionsForAssay,
} from "@lisca/client/studio/sample-positions";
import {
  defaultStudioAlignTime,
  lockedStudioSelection,
  recallStudioAlignChannel,
  recallStudioAlignFrame,
  recallStudioAlignZ,
  rememberStudioAlignChannel,
  rememberStudioAlignFrame,
  rememberStudioAlignZ,
  studioAlignFrameDefault,
  studioAlignFrameMemoryKey,
  studioAlignPositionNav,
  toStudioSource,
} from "@lisca/client/studio/source";
import type { AtomRegistry } from "effect/reactivity";

import { studioClient, toErrorMessage } from "../api/studio-port";
import { scanIdleAtom, scanSourceAtom } from "../atoms/studio-query-atoms";
import { openStudioTaskCenter } from "../components/studio-task-center-open";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";
import { studioAlignUiActions, studioAlignUiAtom } from "./studio-align-store";
import { refreshStudioRoi, watchStudioCrop } from "./studio-crop-watch";
import { studioRegistry } from "./studio-registry";
import { studioWizardAtom } from "./studio-store";

export type AlignPositionSaveState = "saved" | "unsaved" | "changed";

type AlignBaseline = {
  pos: number;
  grid: AlignGridState;
  drift: AlignDrift | null;
  patterns: AlignGridPatternCoord[];
  key: string;
};

export type CropStartConfirmState = {
  positions: number[];
  /** Positions without saved alignment; cropping waits until this is empty. */
  unaligned: number[];
};

export type { CropConfirmState };

export type StudioAlignState = {
  workspacePath: string | null;
  source: AlignerSource | null;
  scan: WorkspaceScan | null;
  alignPositions: number[];
  scanLoading: boolean;
  frameLoading: boolean;
  error: string | null;
  selection: FrameRequest;
  setSelection: (patch: Partial<FrameRequest>) => void;
  contrast: ContrastWindow | null;
  setContrast: (contrast: ContrastWindow | null) => void;
  contrastLocked: boolean;
  setContrastLocked: (locked: boolean) => void;
  frame: FrameResult | null;
  grid: AlignGridState;
  drift: AlignDrift | null;
  effectiveGrid: AlignGridState;
  assayDefaultTime: number | null;
  setGrid: (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) => void;
  adjustTranslation: (dx: number, dy: number) => void;
  setDriftDelta: (dx: number, dy: number) => void;
  commitCanvas: (
    preview: AlignGridState,
    intent: AlignGridPointerIntent,
    startGrid: AlignGridState,
  ) => void;
  setKeyframe: () => void;
  clearKeyframe: () => void;
  clearDrift: () => void;
  setReference: () => void;
  toolMode: AlignGridToolMode;
  setToolMode: (mode: AlignGridToolMode) => void;
  spacingZoomLocked: boolean;
  setSpacingZoomLocked: (locked: boolean) => void;
  patternZoomLocked: boolean;
  setPatternZoomLocked: (locked: boolean) => void;
  manualExclusionEnabled: boolean;
  setManualExclusionEnabled: (enabled: boolean) => void;
  setExcludedPatternsForCurrentPosition: (patterns: Iterable<AlignGridPatternCoord>) => void;
  currentExcludedPatterns: AlignGridPatternCoord[];
  displayedExcludedPatterns: AlignGridPatternCoord[];
  visibleCounts: {
    included: number;
    excluded: number;
  };
  saving: boolean;
  cropping: boolean;
  cropProgress: CropRoiProgress | null;
  cropStartConfirm: CropStartConfirmState | null;
  cropConfirm: CropConfirmState | null;
  /** Scanning saved positions after Crop was pressed. */
  preparingCrop: boolean;
  status: string | null;
  /** Save state of the current position: stored on disk, never saved, or edited since last save/load. */
  positionSaveState: AlignPositionSaveState;
  canGoBack: boolean;
  canGoNext: boolean;
  goBack: () => void;
  goNext: () => void;
  /** Guarded position change (Navigation select / steppers). */
  changePosition: (pos: number) => void;
  resetCurrent: () => void;
  saveCurrentPosition: () => Promise<boolean>;
  /** Crop: confirm when every position is aligned, else list the unaligned ones. */
  requestCrop: () => Promise<void>;
  /** From the crop prompt, jump to the next unaligned position. */
  goToUnalignedPosition: () => void;
  unsavedChangesPrompt: boolean;
  resolveUnsavedChanges: (choice: "save" | "discard" | "cancel") => Promise<void>;
  startConfirmedCrop: () => void;
  cancelCropStartConfirm: () => void;
  confirmCropOverwrite: () => void;
  skipExistingCrop: () => void;
  cancelCropConfirm: () => void;
  cancelCrop: () => Promise<void>;
  variationExcludePreview: VariationExcludePreview | null;
  setVariationExcludeThreshold: (threshold: number) => void;
  cancelVariationExclude: () => void;
  dismissVariationExcludePreview: () => void;
  applyVariationExclude: () => void;
  showVariationExcludePreview: (preview: VariationExcludePreviewResponse) => void;
  reportStatus: (message: string | null) => void;
  reportError: (message: string | null) => void;
  detecting: boolean;
  detectReport: string | null;
  detectLowConfidence: boolean;
  detectGrid: (shape?: AlignGridShape) => Promise<void>;
};

export type StudioAlignControllerOptions = {
  readonly onNavigate: (to: string) => void;
  readonly registry?: AtomRegistry.AtomRegistry | undefined;
};

export type StudioAlignController = {
  readonly getState: () => StudioAlignState;
  readonly subscribe: (listener: () => void) => () => void;
  readonly syncExternal: () => void;
  readonly dispose: () => void;
};

function clampedAlignPosition(positions: readonly number[], pos: number): number {
  return positions.includes(pos) ? pos : (positions[0] ?? pos);
}

export function createStudioAlignController(
  options: StudioAlignControllerOptions,
): StudioAlignController {
  const registry = options.registry ?? studioRegistry;
  let disposed = false;
  let preparingCrop = false;
  let savedPositions: ReadonlySet<number> = new Set();
  let baseline: AlignBaseline | null = null;
  let pendingNavigation: (() => void) | null = null;
  let cropStartConfirm: CropStartConfirmState | null = null;
  let lastSavedScanWorkspace: string | null | undefined = undefined;
  let lastScanWarningKey = "";
  let reconciling = false;

  const listeners = new Set<() => void>();
  const notify = () => {
    if (disposed) return;
    for (const listener of listeners) listener();
  };

  const getWizard = () => registry.get(studioWizardAtom);

  const activeSource = (): AlignerSource | null => {
    const wizard = getWizard();
    return toStudioSource({
      kind: wizard.dataSourceKind,
      dataPath: wizard.dataPath,
      folderTemplate: wizard.folderTemplate,
    });
  };

  const activeWorkspacePath = (): string | null => getWizard().workspacePath.trim() || null;

  const assayPositions = (): number[] => collectAssayPositions({ samples: getWizard().samples });

  const alignPositionsForScan = (scan: WorkspaceScan | null): number[] => {
    if (!scan) return [];
    const wizard = getWizard();
    const catalog = catalogFromScan(wizard.dataSourceKind, scan);
    if (!catalog) return filterScanPositionsForAssay(scan.positions, assayPositions());
    const allowed = new Set<number>();
    for (const row of wizard.samples) {
      const resolved = resolveStoredFileIds(row.positions, wizard.positionIndexVersion, catalog);
      if (!resolved.ok) continue;
      for (const id of resolved.ids) allowed.add(id);
    }
    return scan.positions.filter((pos) => allowed.has(pos));
  };

  const frameMemoryKey = () =>
    studioAlignFrameMemoryKey({
      workspacePath: activeWorkspacePath(),
      source: activeSource(),
      assayId: getWizard().assayId,
    });

  let scanTimes: (() => readonly number[] | undefined) | null = null;
  const assayDefaultTime = () =>
    defaultStudioAlignTime(scanTimes?.(), studioAlignFrameDefault(getWizard().assayId));

  const session = createAlignSessionController({
    registry,
    store: {
      atom: studioAlignUiAtom,
      actions: studioAlignUiActions,
    },
    backend: {
      client: studioClient,
      loadFrame: loadFrameEffect,
      toErrorMessage,
      frameErrorMessage: effectErrorMessage,
    },
    scan: {
      forSource: scanSourceAtom,
      idle: scanIdleAtom,
    },
    policy: {
      workspacePath: activeWorkspacePath,
      source: activeSource,
      selection: (state) => {
        if (!state.scan) return state.selection;
        const positions = alignPositionsForScan(state.scan);
        const position = clampedAlignPosition(positions, state.selection.pos);
        const key = frameMemoryKey();
        const rememberedTime = recallStudioAlignFrame(key, position);
        const rememberedChannel = recallStudioAlignChannel(key, position);
        const rememberedZ = recallStudioAlignZ(key, position);
        return lockedStudioSelection(state.scan, state.selection, positions, {
          frameDefault: studioAlignFrameDefault(getWizard().assayId),
          ...(rememberedTime !== undefined ? { rememberedTime } : {}),
          ...(rememberedChannel !== undefined ? { rememberedChannel } : {}),
          ...(rememberedZ !== undefined ? { rememberedZ } : {}),
        });
      },
      canLoadFrame: (state) => alignPositionsForScan(state.scan).length > 0,
      preserveFrameOnContrastFailure: true,
      cropRequestPrefix: "studio-crop",
      onCropStarted: ({ requestId, workspacePath: cropWorkspace }) => {
        watchStudioCrop(requestId, cropWorkspace);
        openStudioTaskCenter("crop");
        options.onNavigate("/annotate");
      },
      onCropSkippedAll: () => {
        const cropWorkspace = activeWorkspacePath();
        if (cropWorkspace) refreshStudioRoi(cropWorkspace);
        options.onNavigate("/annotate");
      },
    },
    assayDefaultTime,
  });

  scanTimes = () => session.getState().scan?.times;

  const currentAlignPositions = () => alignPositionsForScan(session.getState().scan);

  const captureBaseline = (pos: number) => {
    const current = session.getState();
    const patterns = current.currentExcludedPatterns;
    const grid = current.grid;
    const drift = current.drift;
    baseline = {
      pos,
      grid,
      drift,
      patterns,
      key: alignSnapshotKey(grid, patterns, drift),
    };
  };

  const isDirty = (): boolean => {
    const current = session.getState();
    if (!baseline || baseline.pos !== current.selection.pos) return false;
    const snapshot = alignSnapshotKey(current.grid, current.currentExcludedPatterns, current.drift);
    return baseline.key !== snapshot;
  };

  const refreshSavedPositions = async (): Promise<ReadonlySet<number>> => {
    const workspacePath = session.getState().workspacePath;
    if (!workspacePath) {
      savedPositions = new Set<number>();
      notify();
      return savedPositions;
    }
    const saved = new Set(
      await runClientEffect(studioClient.listSavedBboxPositions(workspacePath)),
    );
    if (!disposed) {
      savedPositions = saved;
      notify();
    }
    return saved;
  };

  const reconcileDerived = () => {
    if (disposed || reconciling) return;
    reconciling = true;
    try {
      const uiState = registry.get(studioAlignUiAtom);
      const current = session.getState();
      const pos = current.selection.pos;

      if (
        !current.frameLoading &&
        current.frame &&
        uiState.loadedFrameSelection?.pos === pos &&
        baseline?.pos !== pos
      ) {
        captureBaseline(pos);
      }

      if (current.workspacePath !== lastSavedScanWorkspace) {
        lastSavedScanWorkspace = current.workspacePath;
        void refreshSavedPositions().catch((cause) => {
          if (!disposed) {
            session.getState().reportError(toErrorMessage(cause, "Saved position scan failed"));
          }
        });
      }

      const scan = current.scan;
      if (scan) {
        const positions = alignPositionsForScan(scan);
        const expected = assayPositions();
        const warningKey = `${scan.positions.join(",")}|${positions.join(",")}|${expected.join(",")}`;
        if (warningKey !== lastScanWarningKey) {
          lastScanWarningKey = warningKey;
          if (positions.length === 0) {
            current.reportError(
              "No assay positions found in source scan — check position ranges on the Metadata step",
            );
          } else {
            const skipped = expected.length - positions.length;
            if (skipped > 0) {
              current.reportStatus(`${skipped} assay position(s) not found in source scan`);
            }
          }
        }
      } else {
        lastScanWarningKey = "";
      }
    } finally {
      reconciling = false;
    }
  };

  const setSelection = (patch: Partial<FrameRequest>) => {
    const current = session.getState();
    const positions = currentAlignPositions();
    const position = clampedAlignPosition(positions, patch.pos ?? current.selection.pos);
    if (typeof patch.channel === "number") {
      rememberStudioAlignChannel(frameMemoryKey(), position, patch.channel);
      logClientEvent(`align channel ${patch.channel} pos ${position}`);
    }
    if (typeof patch.time === "number") {
      rememberStudioAlignFrame(frameMemoryKey(), position, patch.time);
    }
    if (typeof patch.z === "number") {
      rememberStudioAlignZ(frameMemoryKey(), position, patch.z);
    }
    current.setSelection(patch);
  };

  const guardNavigation = (navigate: () => void) => {
    if (session.getState().saving) return;
    if (isDirty()) {
      pendingNavigation = navigate;
      notify();
      return;
    }
    navigate();
  };

  const changePosition = (pos: number) => {
    if (pos === session.getState().selection.pos) return;
    guardNavigation(() => setSelection({ pos }));
  };

  const goBack = () => {
    const positions = currentAlignPositions();
    const index = positions.indexOf(session.getState().selection.pos);
    if (index <= 0) return;
    changePosition(positions[index - 1]!);
  };

  const goNext = () => {
    const nextPos = nextAlignPosition(currentAlignPositions(), session.getState().selection.pos);
    if (nextPos != null) changePosition(nextPos);
  };

  const resetCurrent = () => {
    const current = session.getState();
    if (current.saving) return;
    current.cancelVariationExclude();
    current.setManualExclusionEnabled(false);
    current.setExcludedPatternsForCurrentPosition([]);
    current.reportStatus(`Reset Pos${current.selection.pos}`);
  };

  const saveCurrentPosition = async (): Promise<boolean> => {
    const current = session.getState();
    if (current.saving) return false;
    const pos = current.selection.pos;
    if (!(await current.saveCurrent(current.currentExcludedPatterns))) return false;
    captureBaseline(pos);
    savedPositions = new Set([...savedPositions, pos]);
    current.reportStatus(`Saved Pos${pos}`);
    notify();
    return true;
  };

  const requestCrop = async (): Promise<void> => {
    const current = session.getState();
    const positions = currentAlignPositions();
    if (!current.workspacePath || positions.length === 0 || current.saving || preparingCrop) return;
    if (isDirty()) {
      pendingNavigation = () => void requestCrop();
      notify();
      return;
    }
    preparingCrop = true;
    notify();
    current.reportError(null);
    try {
      const saved = await refreshSavedPositions();
      if (!disposed) {
        cropStartConfirm = {
          positions,
          unaligned: positions.filter((pos) => !saved.has(pos)),
        };
      }
    } catch (cause) {
      if (!disposed) {
        session.getState().reportError(toErrorMessage(cause, "Saved position scan failed"));
      }
    } finally {
      if (!disposed) {
        preparingCrop = false;
        notify();
      }
    }
  };

  const goToUnalignedPosition = () => {
    const next = cropStartConfirm;
    cropStartConfirm = null;
    notify();
    if (!next || next.unaligned.length === 0) return;
    const currentPos = session.getState().selection.pos;
    const target = nextUnsavedAlignPosition(
      next.positions,
      currentPos,
      new Set(next.positions.filter((pos) => !next.unaligned.includes(pos))),
    );
    if (target != null && target !== currentPos) setSelection({ pos: target });
  };

  const resolveUnsavedChanges = async (choice: "save" | "discard" | "cancel"): Promise<void> => {
    const navigate = pendingNavigation;
    if (choice === "cancel" || !navigate) {
      pendingNavigation = null;
      notify();
      return;
    }
    if (choice === "save") {
      if (!(await saveCurrentPosition())) return;
    } else {
      const current = session.getState();
      if (baseline && baseline.pos === current.selection.pos) {
        current.cancelVariationExclude();
        current.setManualExclusionEnabled(false);
        current.setGrid(baseline.grid);
        current.replaceDrift(baseline.drift);
        current.setExcludedPatternsForCurrentPosition(baseline.patterns);
      }
    }
    pendingNavigation = null;
    notify();
    navigate();
  };

  const startConfirmedCrop = () => {
    const next = cropStartConfirm;
    if (!next || next.unaligned.length > 0) return;
    cropStartConfirm = null;
    notify();
    void session.getState().checkCropOverwrite(next.positions, "batch");
  };

  const cancelCropStartConfirm = () => {
    cropStartConfirm = null;
    notify();
  };

  const unsubscribeSession = session.subscribe(() => {
    reconcileDerived();
    notify();
  });

  const unsubscribeWizard = registry.subscribe(studioWizardAtom, () => {
    session.syncExternal();
    reconcileDerived();
    notify();
  });

  reconcileDerived();

  const getState = (): StudioAlignState => {
    const current = session.getState();
    const alignPositions = alignPositionsForScan(current.scan);
    const positionNav = studioAlignPositionNav(alignPositions, current.selection.pos);
    const positionSaveState: AlignPositionSaveState = isDirty()
      ? "changed"
      : savedPositions.has(current.selection.pos)
        ? "saved"
        : "unsaved";

    return {
      workspacePath: current.workspacePath,
      source: current.source,
      scan: current.scan,
      alignPositions,
      scanLoading: current.scanLoading,
      frameLoading: current.frameLoading,
      error: current.error,
      selection: current.selection,
      setSelection,
      contrast: current.contrast,
      setContrast: current.setContrast,
      contrastLocked: current.contrastLocked,
      setContrastLocked: current.setContrastLocked,
      frame: current.frame,
      grid: current.grid,
      drift: current.drift,
      effectiveGrid: current.effectiveGrid,
      assayDefaultTime: current.assayDefaultTime,
      setGrid: current.setGrid,
      adjustTranslation: current.adjustTranslation,
      setDriftDelta: current.setDriftDelta,
      commitCanvas: current.commitCanvas,
      setKeyframe: current.setKeyframe,
      clearKeyframe: current.clearKeyframe,
      clearDrift: current.clearDrift,
      setReference: current.setReference,
      toolMode: current.toolMode,
      setToolMode: current.setToolMode,
      spacingZoomLocked: current.spacingZoomLocked,
      setSpacingZoomLocked: current.setSpacingZoomLocked,
      patternZoomLocked: current.patternZoomLocked,
      setPatternZoomLocked: current.setPatternZoomLocked,
      manualExclusionEnabled: current.manualExclusionEnabled,
      setManualExclusionEnabled: current.setManualExclusionEnabled,
      setExcludedPatternsForCurrentPosition: current.setExcludedPatternsForCurrentPosition,
      currentExcludedPatterns: current.currentExcludedPatterns,
      displayedExcludedPatterns: current.displayedExcludedPatterns,
      visibleCounts: current.visibleCounts,
      saving: current.saving,
      cropping: current.cropping,
      cropProgress: current.cropProgress,
      cropStartConfirm,
      cropConfirm: current.cropConfirm,
      preparingCrop,
      status: current.status,
      positionSaveState,
      canGoBack: positionNav.canGoBack,
      canGoNext: positionNav.canGoNext,
      goBack,
      goNext,
      changePosition,
      resetCurrent,
      saveCurrentPosition,
      requestCrop,
      goToUnalignedPosition,
      unsavedChangesPrompt: pendingNavigation != null,
      resolveUnsavedChanges,
      startConfirmedCrop,
      cancelCropStartConfirm,
      confirmCropOverwrite: current.confirmCropOverwrite,
      skipExistingCrop: current.skipExistingCrop,
      cancelCropConfirm: current.cancelCropConfirm,
      cancelCrop: current.cancelCrop,
      variationExcludePreview: current.variationExcludePreview,
      setVariationExcludeThreshold: current.setVariationExcludeThreshold,
      cancelVariationExclude: current.cancelVariationExclude,
      dismissVariationExcludePreview: current.dismissVariationExcludePreview,
      applyVariationExclude: current.applyVariationExclude,
      showVariationExcludePreview: current.showVariationExcludePreview,
      reportStatus: current.reportStatus,
      reportError: current.reportError,
      detecting: current.detecting,
      detectReport: current.detectReport,
      detectLowConfidence: current.detectLowConfidence,
      detectGrid: current.detectGrid,
    };
  };

  return {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    syncExternal() {
      session.syncExternal();
      reconcileDerived();
      notify();
    },
    dispose() {
      disposed = true;
      unsubscribeSession();
      unsubscribeWizard();
      session.dispose();
      listeners.clear();
    },
  };
}

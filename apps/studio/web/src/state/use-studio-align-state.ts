import type {
  AlignDrift,
  AlignGridPatternCoord,
  AlignGridState,
  AlignerSource,
  VariationExcludePreviewResponse,
  ContrastWindow,
  CropRoiProgress,
  FrameRequest,
  WorkspaceScan,
} from "@lisca/contracts";
import type { AlignGridPointerIntent, FrameResult } from "@lisca/utils";
import {
  alignSnapshotKey,
  nextAlignPosition,
  nextUnsavedAlignPosition,
  type CropConfirmState,
  type VariationExcludePreview,
} from "@lisca/client/align-session";
import { useAlignSessionCore } from "@lisca/client/align-session/solid";
import { useCanvasResourceTransaction } from "@lisca/ui/features";
import { createDefaultAlignGrid, type AlignGridToolMode } from "@lisca/utils";
import { useNavigate } from "@tanstack/solid-router";
import { createEffect, createMemo, createSignal, on } from "solid-js";
import { studioClient, toErrorMessage } from "../api/studio-port";
import { openStudioTaskCenter } from "../components/studio-task-center-open";
import { studioNavigate } from "../navigation/use-studio-navigate";
import { scanIdleAtom, scanSourceAtom } from "../atoms/studio-query-atoms";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";
import { logClientEvent } from "@lisca/client/client-log";
import { runClientEffect } from "@lisca/client/runtime";
import {
  defaultStudioAlignTime,
  lockedStudioSelection,
  recallStudioAlignChannel,
  recallStudioAlignFrame,
  rememberStudioAlignChannel,
  rememberStudioAlignFrame,
  studioAlignFrameDefault,
  studioAlignFrameMemoryKey,
  studioAlignPositionNav,
  toStudioSource,
} from "@lisca/client/studio/source";
import {
  collectAssayPositions,
  filterScanPositionsForAssay,
} from "@lisca/client/studio/sample-positions";
import { studioAlignUiActions, studioAlignUiAtom } from "./studio-align-store";
import { refreshStudioRoi, watchStudioCrop } from "./studio-crop-watch";
import { useStudioStore } from "./studio-store";

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
  frame: FrameResult | null;
  grid: AlignGridState;
  drift: AlignDrift | null;
  effectiveGrid: AlignGridState;
  assayDefaultTime: number | null;
  setGrid: (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) => void;
  adjustTranslation: (dx: number, dy: number) => void;
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
  applySmartExclusion: (modelPatterns: AlignGridPatternCoord[]) => void;
  showVariationExcludePreview: (preview: VariationExcludePreviewResponse) => void;
  reportStatus: (message: string | null) => void;
  reportError: (message: string | null) => void;
};
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

function clampedAlignPosition(positions: readonly number[], pos: number): number {
  return positions.includes(pos) ? pos : (positions[0] ?? pos);
}

export function useStudioAlignState(): StudioAlignState {
  const navigate = useNavigate();
  const dataPath = useStudioStore((state) => state.dataPath);
  const folderTemplate = useStudioStore((state) => state.folderTemplate);
  const workspacePath = useStudioStore((state) => state.workspacePath);
  const samples = useStudioStore((state) => state.samples);
  const dataSourceKind = useStudioStore((state) => state.dataSourceKind);
  const assayId = useStudioStore((state) => state.assayId);
  const [preparingCrop, setPreparingCrop] = createSignal(false);
  const [savedPositions, setSavedPositions] = createSignal<ReadonlySet<number>>(new Set());
  const [baseline, setBaseline] = createSignal<AlignBaseline | null>(null);
  const [pendingNavigation, setPendingNavigation] = createSignal<(() => void) | null>(null);
  const [cropStartConfirm, setCropStartConfirm] = createSignal<CropStartConfirmState | null>(null);
  const activeSource = createMemo(() =>
    toStudioSource({
      kind: dataSourceKind(),
      dataPath: dataPath(),
      folderTemplate: folderTemplate(),
    }),
  );
  const activeWorkspacePath = createMemo(() => workspacePath().trim() || null);
  const assayPositions = createMemo(() => collectAssayPositions({ samples: samples() }));
  const alignPositionsForScan = (scan: WorkspaceScan | null) =>
    scan ? filterScanPositionsForAssay(scan.positions, assayPositions()) : [];
  const frameMemoryKey = () =>
    studioAlignFrameMemoryKey({
      workspacePath: activeWorkspacePath(),
      source: activeSource(),
      assayId: assayId(),
    });
  let scanTimes: (() => readonly number[] | undefined) | null = null;
  const assayDefaultTime = () =>
    defaultStudioAlignTime(scanTimes?.(), studioAlignFrameDefault(assayId()));
  const session = useAlignSessionCore({
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
    resources: {
      transact: useCanvasResourceTransaction(),
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
        return lockedStudioSelection(state.scan, state.selection, positions, {
          frameDefault: studioAlignFrameDefault(assayId()),
          rememberedTime: recallStudioAlignFrame(frameMemoryKey(), position),
          rememberedChannel: recallStudioAlignChannel(frameMemoryKey(), position),
        });
      },
      canLoadFrame: (state) => alignPositionsForScan(state.scan).length > 0,
      preserveFrameOnContrastFailure: true,
      cropRequestPrefix: "studio-crop",
      onCropStarted: ({ requestId, workspacePath: cropWorkspace }) => {
        watchStudioCrop(requestId, cropWorkspace);
        openStudioTaskCenter("crop");
        studioNavigate(navigate, "/annotate");
      },
      onCropSkippedAll: () => {
        const cropWorkspace = activeWorkspacePath();
        if (cropWorkspace) refreshStudioRoi(cropWorkspace);
        studioNavigate(navigate, "/annotate");
      },
    },
    assayDefaultTime,
  });
  const ui = session.state;
  scanTimes = () => ui().scan?.times;
  const alignPositions = createMemo(() => alignPositionsForScan(ui().scan));
  const lockedSelection = () => session.derived().selection;
  const {
    setContrast,
    setExcludedPatternsForCurrentPosition,
    setGrid,
    setManualExclusionEnabled,
    setSpacingZoomLocked,
    setPatternZoomLocked,
    setSelection: setStoredSelection,
    setToolMode,
  } = session.actions;
  // Write the chosen frame and channel before the lock policy runs. Otherwise a
  // new position's defaults (channel 0, assay frame) replace the control.
  const setSelection = (patch: Partial<FrameRequest>) => {
    const positions = alignPositions();
    const position = clampedAlignPosition(positions, patch.pos ?? lockedSelection().pos);
    if (typeof patch.channel === "number") {
      rememberStudioAlignChannel(frameMemoryKey(), position, patch.channel);
      logClientEvent(`align channel ${patch.channel} pos ${position}`);
    }
    if (typeof patch.time === "number") {
      rememberStudioAlignFrame(frameMemoryKey(), position, patch.time);
    }
    setStoredSelection(patch);
  };
  const setError = session.actions.reportError;
  const setStatus = session.actions.reportStatus;
  const applySmartExclusion = session.applySmartExclusion;
  const positionIndex = () => alignPositions().indexOf(lockedSelection().pos);
  const currentSnapshot = () =>
    alignSnapshotKey(ui().grid, session.derived().currentExcludedPatterns, ui().drift);
  const captureBaseline = (pos: number) => {
    const patterns = session.derived().currentExcludedPatterns;
    const grid = ui().grid;
    const drift = ui().drift;
    setBaseline({ pos, grid, drift, patterns, key: alignSnapshotKey(grid, patterns, drift) });
  };
  // Snapshot each position once its frame (and any saved grid/exclusions) has loaded.
  createEffect(() => {
    const current = ui();
    const pos = lockedSelection().pos;
    if (current.frameLoading || !current.frame || current.loadedFrameSelection?.pos !== pos) return;
    if (baseline()?.pos === pos) return;
    captureBaseline(pos);
  });
  const dirty = createMemo(() => {
    const base = baseline();
    return base != null && base.pos === lockedSelection().pos && base.key !== currentSnapshot();
  });
  const positionSaveState = createMemo<AlignPositionSaveState>(() => {
    if (dirty()) return "changed";
    return savedPositions().has(lockedSelection().pos) ? "saved" : "unsaved";
  });
  const refreshSavedPositions = async () => {
    const workspacePath = ui().workspacePath;
    if (!workspacePath) {
      setSavedPositions(new Set<number>());
      return savedPositions();
    }
    const saved = new Set(
      await runClientEffect(studioClient.listSavedBboxPositions(workspacePath)),
    );
    setSavedPositions(saved);
    return saved;
  };
  createEffect(
    on(
      () => ui().workspacePath,
      () => {
        void refreshSavedPositions().catch((cause) =>
          setError(toErrorMessage(cause, "Saved position scan failed")),
        );
      },
    ),
  );
  /** Run a position change now, or hold it behind the unsaved-changes prompt. */
  const guardNavigation = (navigate: () => void) => {
    if (ui().saving) return;
    if (dirty()) {
      setPendingNavigation(() => navigate);
      return;
    }
    navigate();
  };
  const changePosition = (pos: number) => {
    if (pos === lockedSelection().pos) return;
    guardNavigation(() => setSelection({ pos }));
  };
  const positionNav = createMemo(() =>
    studioAlignPositionNav(alignPositions(), lockedSelection().pos),
  );
  const canGoBack = () => positionNav().canGoBack;
  const goBack = () => {
    if (positionIndex() <= 0) return;
    changePosition(alignPositions()[positionIndex() - 1]!);
  };
  const canGoNext = () => positionNav().canGoNext;
  const goNext = () => {
    const nextPos = nextAlignPosition(alignPositions(), lockedSelection().pos);
    if (nextPos != null) changePosition(nextPos);
  };
  const resetCurrent = () => {
    if (ui().saving) return;
    session.variation.cancel();
    setManualExclusionEnabled(false);
    setExcludedPatternsForCurrentPosition([]);
    setStatus(`Reset Pos${lockedSelection().pos}`);
  };
  const saveCurrentPosition = async () => {
    if (ui().saving) return false;
    const pos = lockedSelection().pos;
    if (!(await session.saveCurrent(session.derived().currentExcludedPatterns))) return false;
    captureBaseline(pos);
    setSavedPositions((saved) => new Set([...saved, pos]));
    setStatus(`Saved Pos${pos}`);
    return true;
  };
  const requestCrop = async () => {
    const positions = alignPositions();
    if (!ui().workspacePath || positions.length === 0 || ui().saving || preparingCrop()) return;
    if (dirty()) {
      setPendingNavigation(() => () => void requestCrop());
      return;
    }
    setPreparingCrop(true);
    setError(null);
    try {
      const saved = await refreshSavedPositions();
      setCropStartConfirm({ positions, unaligned: positions.filter((pos) => !saved.has(pos)) });
    } catch (cause) {
      setError(toErrorMessage(cause, "Saved position scan failed"));
    } finally {
      setPreparingCrop(false);
    }
  };
  const goToUnalignedPosition = () => {
    const next = cropStartConfirm();
    setCropStartConfirm(null);
    if (!next || next.unaligned.length === 0) return;
    const target = nextUnsavedAlignPosition(
      next.positions,
      lockedSelection().pos,
      new Set(next.positions.filter((pos) => !next.unaligned.includes(pos))),
    );
    if (target != null && target !== lockedSelection().pos) setSelection({ pos: target });
  };
  const resolveUnsavedChanges = async (choice: "save" | "discard" | "cancel") => {
    const navigate = pendingNavigation();
    if (choice === "cancel" || !navigate) {
      setPendingNavigation(null);
      return;
    }
    if (choice === "save") {
      if (!(await saveCurrentPosition())) return;
    } else {
      const base = baseline();
      if (base && base.pos === lockedSelection().pos) {
        session.variation.cancel();
        setManualExclusionEnabled(false);
        setGrid(base.grid);
        session.replaceDrift(base.drift);
        setExcludedPatternsForCurrentPosition(base.patterns);
      }
    }
    setPendingNavigation(null);
    navigate();
  };
  const startConfirmedCrop = () => {
    const next = cropStartConfirm();
    if (!next || next.unaligned.length > 0) return;
    setCropStartConfirm(null);
    void session.crop.checkOverwrite(next.positions, "batch");
  };
  const cancelCropStartConfirm = () => {
    setCropStartConfirm(null);
  };
  createEffect(() => {
    const scan = ui().scan;
    const positions = alignPositions();
    if (!scan) return;
    if (positions.length === 0) {
      setError(
        "No assay positions found in source scan — check position ranges on the Metadata step",
      );
      return;
    }
    const skipped = assayPositions().length - positions.length;
    if (skipped > 0) {
      setStatus(`${skipped} assay position(s) not found in source scan`);
    }
  });
  return {
    get workspacePath() {
      return ui().workspacePath;
    },
    get source() {
      return ui().source;
    },
    get scan() {
      return ui().scan;
    },
    get alignPositions() {
      return alignPositions();
    },
    get scanLoading() {
      return session.meta().scanLoading;
    },
    get frameLoading() {
      return ui().frameLoading;
    },
    get error() {
      return ui().error;
    },
    get selection() {
      return lockedSelection();
    },
    setSelection,
    get contrast() {
      return ui().contrast;
    },
    setContrast,
    get frame() {
      return ui().frame;
    },
    get grid() {
      return ui().grid;
    },
    get drift() {
      return ui().drift;
    },
    get effectiveGrid() {
      return session.derived().effectiveGrid;
    },
    get assayDefaultTime() {
      return assayDefaultTime();
    },
    setGrid,
    adjustTranslation: session.adjustTranslation,
    commitCanvas: session.commitCanvas,
    setKeyframe: session.setKeyframe,
    clearKeyframe: session.clearKeyframe,
    clearDrift: session.clearDrift,
    setReference: session.setReference,
    get toolMode() {
      return ui().toolMode;
    },
    setToolMode,
    get spacingZoomLocked() {
      return ui().spacingZoomLocked;
    },
    setSpacingZoomLocked,
    get patternZoomLocked() {
      return ui().patternZoomLocked;
    },
    setPatternZoomLocked,
    get manualExclusionEnabled() {
      return ui().manualExclusionEnabled;
    },
    setManualExclusionEnabled,
    setExcludedPatternsForCurrentPosition,
    get currentExcludedPatterns() {
      return session.derived().currentExcludedPatterns;
    },
    get displayedExcludedPatterns() {
      return session.derived().displayedExcludedPatterns;
    },
    get visibleCounts() {
      return session.derived().visibleCounts;
    },
    get saving() {
      return ui().saving;
    },
    get cropping() {
      return session.meta().cropping;
    },
    get cropProgress() {
      return ui().cropProgress;
    },
    get cropStartConfirm() {
      return cropStartConfirm();
    },
    get cropConfirm() {
      return session.crop.confirm();
    },
    get preparingCrop() {
      return preparingCrop();
    },
    get status() {
      return ui().status;
    },
    get positionSaveState() {
      return positionSaveState();
    },
    get canGoBack() {
      return canGoBack();
    },
    get canGoNext() {
      return canGoNext();
    },
    goBack,
    goNext,
    changePosition,
    resetCurrent,
    saveCurrentPosition,
    requestCrop,
    goToUnalignedPosition,
    get unsavedChangesPrompt() {
      return pendingNavigation() != null;
    },
    resolveUnsavedChanges,
    startConfirmedCrop,
    cancelCropStartConfirm,
    confirmCropOverwrite: session.crop.confirmOverwrite,
    skipExistingCrop: session.crop.skipExisting,
    cancelCropConfirm: session.crop.cancelConfirm,
    cancelCrop: session.crop.cancel,
    get variationExcludePreview() {
      return session.variation.preview();
    },
    setVariationExcludeThreshold: session.variation.setThreshold,
    cancelVariationExclude: session.variation.cancel,
    dismissVariationExcludePreview: session.variation.dismiss,
    applyVariationExclude: session.variation.apply,
    applySmartExclusion,
    showVariationExcludePreview: session.variation.showPreview,
    reportStatus: setStatus,
    reportError: setError,
  };
}

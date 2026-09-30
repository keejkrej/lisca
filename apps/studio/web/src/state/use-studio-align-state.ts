import type {
  AlignGridPatternCoord,
  AlignGridState,
  AlignerSource,
  VariationExcludePreviewResponse,
  ContrastWindow,
  CropRoiProgress,
  FrameRequest,
  WorkspaceScan,
} from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
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
import { createEffect, createMemo, createSignal, on } from "solid-js";
import { studioClient, toErrorMessage } from "../api/studio-port";
import { scanIdleAtom, scanSourceAtom } from "../atoms/studio-query-atoms";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";
import { runClientEffect } from "@lisca/client/runtime";
import {
  lockedStudioSelection,
  studioBrightfieldChannel,
  toStudioSource,
} from "@lisca/client/studio/source";
import {
  collectAssayPositions,
  filterScanPositionsForAssay,
} from "@lisca/client/studio/sample-positions";
import { studioAlignUiActions, studioAlignUiAtom } from "./studio-align-store";
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
  setGrid: (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) => void;
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
  continuing: boolean;
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
  /** Go to the next unsaved position (wrapping); when all are saved, offer to crop. */
  continueAlign: () => Promise<void>;
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
  patterns: AlignGridPatternCoord[];
  key: string;
};
export type CropStartConfirmState = {
  positions: number[];
};
export type { CropConfirmState };
export function useStudioAlignState(): StudioAlignState {
  const dataPath = useStudioStore((state) => state.dataPath);
  const folderTemplate = useStudioStore((state) => state.folderTemplate);
  const workspacePath = useStudioStore((state) => state.workspacePath);
  const samples = useStudioStore((state) => state.samples);
  const dataSourceKind = useStudioStore((state) => state.dataSourceKind);
  const [continuing, setContinuing] = createSignal(false);
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
  const brightfieldChannel = createMemo(() => studioBrightfieldChannel(samples()));
  const assayPositions = createMemo(() => collectAssayPositions({ samples: samples() }));
  const alignPositionsForScan = (scan: WorkspaceScan | null) =>
    scan ? filterScanPositionsForAssay(scan.positions, assayPositions()) : [];
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
      selection: (state) =>
        state.scan
          ? lockedStudioSelection(
              state.scan,
              state.selection,
              brightfieldChannel(),
              alignPositionsForScan(state.scan),
            )
          : state.selection,
      canLoadFrame: (state) => alignPositionsForScan(state.scan).length > 0,
      preserveFrameOnContrastFailure: true,
      cropRequestPrefix: "studio-crop",
    },
  });
  const ui = session.state;
  const alignPositions = createMemo(() => alignPositionsForScan(ui().scan));
  const lockedSelection = () => session.derived().selection;
  const {
    setContrast,
    setExcludedPatternsForCurrentPosition,
    setGrid,
    setManualExclusionEnabled,
    setSpacingZoomLocked,
    setPatternZoomLocked,
    setSelection,
    setToolMode,
  } = session.actions;
  const setError = session.actions.reportError;
  const setStatus = session.actions.reportStatus;
  const applySmartExclusion = session.applySmartExclusion;
  const positionIndex = () => alignPositions().indexOf(lockedSelection().pos);
  const currentSnapshot = () =>
    alignSnapshotKey(ui().grid, session.derived().currentExcludedPatterns);
  const captureBaseline = (pos: number) => {
    const patterns = session.derived().currentExcludedPatterns;
    const grid = ui().grid;
    setBaseline({ pos, grid, patterns, key: alignSnapshotKey(grid, patterns) });
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
  const canGoBack = () => positionIndex() > 0;
  const goBack = () => {
    if (positionIndex() <= 0) return;
    changePosition(alignPositions()[positionIndex() - 1]!);
  };
  const canGoNext = () => nextAlignPosition(alignPositions(), lockedSelection().pos) != null;
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
  const continueAlign = async () => {
    const positions = alignPositions();
    if (!ui().workspacePath || positions.length === 0 || ui().saving || continuing()) return;
    if (dirty()) {
      setPendingNavigation(() => () => void continueAlign());
      return;
    }
    setContinuing(true);
    setError(null);
    try {
      const saved = await refreshSavedPositions();
      const current = lockedSelection().pos;
      const target = nextUnsavedAlignPosition(positions, current, saved);
      if (target == null) {
        setCropStartConfirm({ positions });
      } else if (target === current) {
        setStatus(`Save Pos${current} to continue`);
      } else {
        setSelection({ pos: target });
      }
    } catch (cause) {
      setError(toErrorMessage(cause, "Saved position scan failed"));
    } finally {
      setContinuing(false);
    }
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
        setExcludedPatternsForCurrentPosition(base.patterns);
      }
    }
    setPendingNavigation(null);
    navigate();
  };
  const startConfirmedCrop = () => {
    const next = cropStartConfirm();
    if (!next) return;
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
    setGrid,
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
    get continuing() {
      return continuing();
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
    continueAlign,
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

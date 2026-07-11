import type {
  AlignGridCellCoord,
  AlignGridState,
  AlignerSource,
  ContrastWindow,
  CropRoiProgress,
  FrameRequest,
  WorkspaceScan,
} from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import {
  allAlignPositionsSaved,
  nextAlignPosition,
  resolveFirstUnalignedTarget,
  type VariationExcludePreview,
} from "@lisca/client/align-session";
import { useAlignSessionCore } from "@lisca/client/align-session/solid";
import { useCanvasResourceTransaction } from "@lisca/ui/features";
import { createDefaultAlignGrid, type AlignGridToolMode } from "@lisca/utils";
import { useNavigate } from "@tanstack/solid-router";
import { createEffect, createMemo, createSignal } from "solid-js";
import { studioClient, toErrorMessage } from "../api/studio-port";
import { studioNavigate } from "../navigation/use-studio-navigate";
import { scanIdleAtom, scanSourceAtom } from "../atoms/studio-query-atoms";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";
import { runClientEffect } from "@lisca/client/runtime";
import {
  lockedStudioSelection,
  studioMaskChannel,
  toStudioSource,
} from "@lisca/client/studio/source";
import {
  collectAssayPositions,
  filterScanPositionsForAssay,
} from "@lisca/client/studio/sample-positions";
import {
  studioAlignUiActions,
  studioAlignUiAtom,
  type ExcludedByPosition,
} from "./studio-align-store";
import { useStudioStore } from "./studio-store";

const nextExclusionPreviewMs = 1000;
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
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
  patternZoomLocked: boolean;
  setPatternZoomLocked: (locked: boolean) => void;
  manualExclusionEnabled: boolean;
  setManualExclusionEnabled: (enabled: boolean) => void;
  excludedCellsByPosition: ExcludedByPosition;
  setExcludedCellsForCurrentPosition: (cells: Iterable<AlignGridCellCoord>) => void;
  currentExcludedCells: AlignGridCellCoord[];
  displayedExcludedCells: AlignGridCellCoord[];
  visibleCounts: {
    included: number;
    excluded: number;
  };
  saving: boolean;
  cropping: boolean;
  cropProgress: CropRoiProgress | null;
  cropStartConfirm: CropStartConfirmState | null;
  cropConfirm: CropConfirmState | null;
  findingFirstUnaligned: boolean;
  status: string | null;
  canGoBack: boolean;
  goBack: () => void;
  resetCurrent: () => void;
  goToFirstUnaligned: () => Promise<void>;
  startConfirmedCrop: () => void;
  cancelCropStartConfirm: () => void;
  confirmCropOverwrite: () => void;
  skipExistingCrop: () => void;
  cancelCropConfirm: () => void;
  cancelCrop: () => Promise<void>;
  variationExcludePreview: VariationExcludePreview | null;
  variationExcludeLoading: boolean;
  variationExclude: () => Promise<void>;
  setVariationExcludeThreshold: (threshold: number) => void;
  cancelVariationExclude: () => void;
  applyVariationExclude: () => void;
  applySmartExclusion: (modelCells: AlignGridCellCoord[]) => void;
  saveAndAdvanceWithModelCells: (modelCells: AlignGridCellCoord[]) => Promise<boolean>;
  reportError: (message: string | null) => void;
};
export type CropStartConfirmState = {
  positions: number[];
};
export type CropConfirmState = {
  positions: number[];
  existingPositions: number[];
};
export function useStudioAlignState(): StudioAlignState {
  const info1 = useStudioStore((state) => state.info1);
  const info3 = useStudioStore((state) => state.info3);
  const dataSourceKind = useStudioStore((state) => state.dataSourceKind);
  const [findingFirstUnaligned, setFindingFirstUnaligned] = createSignal(false);
  const [cropStartConfirm, setCropStartConfirm] = createSignal<CropStartConfirmState | null>(null);
  const activeSource = createMemo(() => toStudioSource(dataSourceKind(), info1()));
  const activeWorkspacePath = createMemo(() => info1().saveTo.trim() || null);
  const maskChannel = createMemo(() => studioMaskChannel(info3()));
  const assayPositions = createMemo(() => collectAssayPositions(info3()));
  const navigate = useNavigate();
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
              maskChannel(),
              alignPositionsForScan(state.scan),
            )
          : state.selection,
      canLoadFrame: (state) => alignPositionsForScan(state.scan).length > 0,
      preserveFrameOnContrastFailure: true,
      cropRequestPrefix: "studio-crop",
      onCropCompleted: () => studioNavigate(navigate, "/annotate"),
      onCropSkippedAll: () => studioNavigate(navigate, "/annotate"),
    },
  });
  const ui = session.state;
  const alignPositions = createMemo(() => alignPositionsForScan(ui().scan));
  const lockedSelection = () => session.derived().selection;
  const {
    setContrast,
    setExcludedCellsForCurrentPosition,
    setGrid,
    setManualExclusionEnabled,
    setPatternZoomLocked,
    setSelection,
    setToolMode,
  } = session.actions;
  const setError = session.actions.reportError;
  const setStatus = session.actions.reportStatus;
  const applySmartExclusion = session.applySmartExclusion;
  const positionIndex = () => alignPositions().indexOf(lockedSelection().pos);
  const canGoBack = () => positionIndex() > 0;
  const goBack = () => {
    if (ui().saving || positionIndex() <= 0) return;
    setSelection({
      pos: alignPositions()[positionIndex() - 1],
    });
  };
  const resetCurrent = () => {
    if (ui().saving) return;
    setGrid({
      ...createDefaultAlignGrid(),
      enabled: true,
    });
    setExcludedCellsForCurrentPosition([]);
    setStatus(`Reset Pos${lockedSelection().pos}`);
  };
  const goToFirstUnaligned = async () => {
    const workspacePath = ui().workspacePath;
    const positions = alignPositions();
    if (!workspacePath || positions.length === 0 || ui().saving || findingFirstUnaligned()) return;
    setFindingFirstUnaligned(true);
    setError(null);
    try {
      setStatus("Finding jump target");
      const savedPositions = new Set(
        await runClientEffect(studioClient.listSavedBboxPositions(workspacePath)),
      );
      const firstUnaligned = resolveFirstUnalignedTarget(positions, savedPositions);
      if (firstUnaligned == null) return;
      setSelection({
        pos: firstUnaligned,
      });
      setStatus(`Jumped to Pos${firstUnaligned}`);
    } catch (cause) {
      setError(toErrorMessage(cause, "Saved position scan failed"));
    } finally {
      setFindingFirstUnaligned(false);
    }
  };
  const advanceToNextPosition = () => {
    const nextPos = nextAlignPosition(alignPositions(), lockedSelection().pos);
    if (nextPos == null) return false;
    setSelection({
      pos: nextPos,
    });
    return true;
  };
  const maybeCropWhenAllPositionsSaved = async () => {
    const workspacePath = ui().workspacePath;
    const positions = alignPositions();
    if (!workspacePath || positions.length === 0) return;
    const savedPositions = new Set(
      await runClientEffect(studioClient.listSavedBboxPositions(workspacePath)),
    );
    if (!allAlignPositionsSaved(positions, savedPositions)) return;
    setCropStartConfirm({
      positions,
    });
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
  const saveAndAdvanceWithModelCells = async (modelCells: AlignGridCellCoord[]) => {
    if (!(await session.saveWithSmartExclusion(modelCells))) return false;
    const advanced = advanceToNextPosition();
    if (!advanced) {
      await maybeCropWhenAllPositionsSaved();
      return true;
    }
    await delay(nextExclusionPreviewMs);
    return true;
  };
  createEffect(() => {
    const scan = ui().scan;
    const positions = alignPositions();
    if (!scan) return;
    if (positions.length === 0) {
      setError("No assay positions found in source scan — check position ranges in basic info");
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
    get patternZoomLocked() {
      return ui().patternZoomLocked;
    },
    setPatternZoomLocked,
    get manualExclusionEnabled() {
      return ui().manualExclusionEnabled;
    },
    setManualExclusionEnabled,
    get excludedCellsByPosition() {
      return ui().excludedCellsByPosition;
    },
    setExcludedCellsForCurrentPosition,
    get currentExcludedCells() {
      return session.derived().currentExcludedCells;
    },
    get displayedExcludedCells() {
      return session.derived().displayedExcludedCells;
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
      const confirmation = session.crop.confirm();
      return confirmation
        ? {
            positions: confirmation.positions,
            existingPositions: confirmation.existingPositions,
          }
        : null;
    },
    get findingFirstUnaligned() {
      return findingFirstUnaligned();
    },
    get status() {
      return ui().status;
    },
    get canGoBack() {
      return canGoBack();
    },
    goBack,
    resetCurrent,
    goToFirstUnaligned,
    startConfirmedCrop,
    cancelCropStartConfirm,
    confirmCropOverwrite: session.crop.confirmOverwrite,
    skipExistingCrop: session.crop.skipExisting,
    cancelCropConfirm: session.crop.cancelConfirm,
    cancelCrop: session.crop.cancel,
    get variationExcludePreview() {
      return session.variation.preview();
    },
    get variationExcludeLoading() {
      return session.variation.loading();
    },
    variationExclude: session.variation.exclude,
    setVariationExcludeThreshold: session.variation.setThreshold,
    cancelVariationExclude: session.variation.cancel,
    applyVariationExclude: session.variation.apply,
    applySmartExclusion,
    saveAndAdvanceWithModelCells,
    reportError: setError,
  };
}

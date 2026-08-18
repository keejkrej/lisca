import type {
  AlignGridCellCoord,
  AlignGridState,
  AlignerSource,
  AutoExcludePreviewResponse,
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
  type CropConfirmState,
  type VariationExcludePreview,
} from "@lisca/client/align-session";
import { useAlignSessionCore } from "@lisca/client/align-session/solid";
import { useCanvasResourceTransaction } from "@lisca/ui/features";
import { createDefaultAlignGrid, type AlignGridToolMode } from "@lisca/utils";
import { currentServerKey } from "@lisca/client/session/work-session";
import { createEffect, createMemo, createSignal } from "solid-js";
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
import {
  studioAlignUiActions,
  studioAlignUiAtom,
  type ExcludedByPosition,
} from "./studio-align-store";
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
  dismissVariationExcludePreview: () => void;
  applyVariationExclude: () => void;
  applySmartExclusion: (modelCells: AlignGridCellCoord[]) => void;
  saveAndAdvanceWithExcludedCells: (excludedCells: AlignGridCellCoord[]) => Promise<boolean>;
  showVariationExcludePreview: (preview: AutoExcludePreviewResponse) => void;
  reportStatus: (message: string | null) => void;
  reportError: (message: string | null) => void;
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
  const [findingFirstUnaligned, setFindingFirstUnaligned] = createSignal(false);
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
      cropServerIdentity: () => currentServerKey("studio"),
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
    setSpacingZoomLocked,
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
    session.variation.cancel();
    setManualExclusionEnabled(false);
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
      const savedPositions = new Set(
        await runClientEffect(studioClient.listSavedBboxPositions(workspacePath)),
      );
      const firstUnaligned = resolveFirstUnalignedTarget(positions, savedPositions);
      if (firstUnaligned == null) return;
      setSelection({
        pos: firstUnaligned,
      });
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
  const saveAndAdvanceWithExcludedCells = async (excludedCells: AlignGridCellCoord[]) => {
    if (!(await session.saveCurrent(excludedCells))) return false;
    const advanced = advanceToNextPosition();
    if (!advanced) {
      await maybeCropWhenAllPositionsSaved();
    }
    return true;
  };
  createEffect(() => {
    const scan = ui().scan;
    const positions = alignPositions();
    if (!scan) return;
    if (positions.length === 0) {
      setError("No assay positions found in source scan — check position ranges on the Info step");
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
      return session.crop.confirm();
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
    dismissVariationExcludePreview: session.variation.dismiss,
    applyVariationExclude: session.variation.apply,
    applySmartExclusion,
    saveAndAdvanceWithExcludedCells,
    showVariationExcludePreview: session.variation.showPreview,
    reportStatus: setStatus,
    reportError: setError,
  };
}

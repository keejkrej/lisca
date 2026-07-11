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
import { cellsBelowVariationThreshold, type CropConfirmState } from "../session/align-session";
import {
  useAlignSessionCore,
  type AlignScanSource,
  type AlignSessionBackend,
  type AlignSessionStore,
} from "../session/use-align-session";
import {
  collectAlignGridEdgeCells,
  computeAutoExcludePreview,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
  type AlignGridToolMode,
} from "@lisca/utils";
import { createMemo, createSignal, type Accessor } from "solid-js";
import type { ExcludedByPosition, StateUpdater } from "../atoms/align-ui";
import type { CanvasResourceTransactionOptions } from "../canvas-resource-transaction";

export type { CropConfirmState };

export type VariationExcludePreview = {
  preview: AutoExcludePreviewResponse;
  threshold: number;
};

export type AlignState = {
  workspacePath: string | null;
  source: AlignerSource | null;
  setSource: (source: AlignerSource | null) => void;
  scan: WorkspaceScan | null;
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
  cropConfirm: CropConfirmState | null;
  status: string | null;
  saveCurrent: () => Promise<boolean>;
  cropCurrent: () => Promise<void>;
  cropBatch: () => Promise<void>;
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
  autoExclude: () => Promise<void>;
  applySmartExclusion: (modelCells: AlignGridCellCoord[]) => void;
  reportError: (message: string | null) => void;
};

export type UseAlignStateCoreDeps = {
  store: AlignSessionStore;
  backend: AlignSessionBackend;
  scan: AlignScanSource;
  host: {
    useWorkspace: () => {
      workspacePath: string | null;
      setWorkspacePath: (path: string | null) => void;
      sourcePath: string | null;
      setSourcePath: (path: string | null) => void;
    };
    useCanvasTransaction: () => <T>(options: CanvasResourceTransactionOptions<T>) => () => void;
  };
};

export function useAlignStateCore(deps: UseAlignStateCoreDeps): Accessor<AlignState> {
  const workspace = deps.host.useWorkspace();
  const transact = deps.host.useCanvasTransaction();
  const [variationExcludePreview, setVariationExcludePreview] =
    createSignal<VariationExcludePreview | null>(null);
  const [variationExcludeLoading, setVariationExcludeLoading] = createSignal(false);

  const session = useAlignSessionCore({
    store: deps.store,
    backend: deps.backend,
    resources: { transact },
    scan: deps.scan,
    workspace: {
      workspacePath: () => workspace.workspacePath,
      setWorkspacePath: workspace.setWorkspacePath,
      sourcePath: () => workspace.sourcePath,
      setSourcePath: workspace.setSourcePath,
    },
  });
  const ui = session.state;

  const {
    setSource,
    setSelection,
    setContrast,
    setGrid,
    setToolMode,
    setPatternZoomLocked,
    setManualExclusionEnabled,
    setExcludedCellsForCurrentPosition,
  } = session.actions;

  const previewVariationExclude = async () => {
    const currentUi = ui();
    const { frame, grid } = currentUi;
    if (!frame) return null;
    const cells = enumerateVisibleAlignGridCells(frame, grid);
    if (cells.length === 0) return null;
    setVariationExcludeLoading(true);
    try {
      return computeAutoExcludePreview(frame, cells);
    } finally {
      setVariationExcludeLoading(false);
    }
  };

  const variationExclude = async () => {
    const currentUi = ui();
    const { source, frame } = currentUi;
    if (!source || !frame) return;
    session.actions.reportStatus("Var exclude preview");
    try {
      const preview = await previewVariationExclude();
      if (!preview) {
        session.actions.reportStatus("No visible cells for var exclude");
        return;
      }
      setVariationExcludePreview({
        preview,
        threshold: preview.threshold,
      });
    } catch (cause) {
      session.actions.reportError(deps.backend.toErrorMessage(cause, "Var exclude preview failed"));
    }
  };

  const setVariationExcludeThreshold = (threshold: number) => {
    setVariationExcludePreview((current) =>
      current
        ? {
            ...current,
            threshold,
          }
        : current,
    );
  };

  const cancelVariationExclude = () => {
    setVariationExcludePreview(null);
    session.actions.reportStatus("Var exclude cancelled");
  };

  const applyVariationExclude = () => {
    const preview = variationExcludePreview();
    if (!preview) return;
    const currentExcludedCells = session.derived().currentExcludedCells;
    const variationCells = cellsBelowVariationThreshold(preview.preview, preview.threshold);
    setExcludedCellsForCurrentPosition(
      mergeExcludedAlignGridCells(currentExcludedCells, variationCells),
    );
    setVariationExcludePreview(null);
    session.actions.reportStatus(
      `Var excluded ${variationCells.length} of ${preview.preview.eligibleCellCount} cells`,
    );
  };

  const autoExclude = async () => {
    const currentUi = ui();
    const { source, frame, grid } = currentUi;
    const currentExcludedCells = session.derived().currentExcludedCells;
    if (!source || !frame) return;
    session.actions.reportStatus("Auto exclude");
    try {
      const edgeCells = collectAlignGridEdgeCells(frame, grid);
      const preview = await previewVariationExclude();
      const variationCells = preview
        ? cellsBelowVariationThreshold(preview, preview.threshold)
        : [];
      const finalExcludedCells = mergeExcludedAlignGridCells(currentExcludedCells, [
        ...edgeCells,
        ...variationCells,
      ]);
      setExcludedCellsForCurrentPosition(finalExcludedCells);
      session.actions.reportStatus(
        `Auto excluded ${finalExcludedCells.length - currentExcludedCells.length} cells`,
      );
    } catch (cause) {
      session.actions.reportError(deps.backend.toErrorMessage(cause, "Auto exclude failed"));
    }
  };

  return createMemo<AlignState>(() => {
    const currentUi = ui();
    const meta = session.meta();
    const derived = session.derived();
    return {
      workspacePath: currentUi.workspacePath,
      source: currentUi.source,
      setSource,
      scan: currentUi.scan,
      scanLoading: meta.scanLoading,
      frameLoading: currentUi.frameLoading,
      error: currentUi.error,
      selection: derived.selection,
      setSelection,
      contrast: currentUi.contrast,
      setContrast,
      frame: currentUi.frame,
      grid: currentUi.grid,
      setGrid,
      toolMode: currentUi.toolMode,
      setPatternZoomLocked,
      patternZoomLocked: currentUi.patternZoomLocked,
      setToolMode,
      manualExclusionEnabled: currentUi.manualExclusionEnabled,
      setManualExclusionEnabled,
      excludedCellsByPosition: currentUi.excludedCellsByPosition,
      setExcludedCellsForCurrentPosition,
      currentExcludedCells: derived.currentExcludedCells,
      displayedExcludedCells: derived.displayedExcludedCells,
      visibleCounts: derived.visibleCounts,
      saving: currentUi.saving,
      cropping: meta.cropping,
      cropProgress: currentUi.cropProgress,
      cropConfirm: session.crop.confirm(),
      status: currentUi.status,
      saveCurrent: session.saveCurrent,
      cropCurrent: session.crop.current,
      cropBatch: session.crop.saved,
      confirmCropOverwrite: session.crop.confirmOverwrite,
      skipExistingCrop: session.crop.skipExisting,
      cancelCropConfirm: session.crop.cancelConfirm,
      cancelCrop: session.crop.cancel,
      variationExcludePreview: variationExcludePreview(),
      variationExcludeLoading: variationExcludeLoading(),
      variationExclude,
      setVariationExcludeThreshold,
      cancelVariationExclude,
      applyVariationExclude,
      autoExclude,
      applySmartExclusion: session.applySmartExclusion,
      reportError: session.actions.reportError,
    };
  });
}

export type { ExcludedByPosition, StateUpdater };

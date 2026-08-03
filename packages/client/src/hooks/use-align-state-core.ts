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
import { type CropConfirmState, type VariationExcludePreview } from "../session/align-session";
import {
  useAlignSessionCore,
  type AlignScanSource,
  type AlignSessionBackend,
  type AlignSessionStore,
} from "../session/use-align-session";
import { type AlignGridToolMode } from "@lisca/utils";
import { createMemo, type Accessor } from "solid-js";
import type { ExcludedByPosition, StateUpdater } from "../atoms/align-ui";
import type { CanvasResourceTransactionOptions } from "../canvas-resource-transaction";

export type { CropConfirmState, VariationExcludePreview };

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
  showVariationExcludePreview: (preview: AutoExcludePreviewResponse) => void;
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
  /** Default true. Standalone Aligner sets false (light shell — no crop jobs). */
  enableCrop?: boolean;
};

export function useAlignStateCore(deps: UseAlignStateCoreDeps): Accessor<AlignState> {
  const workspace = deps.host.useWorkspace();
  const transact = deps.host.useCanvasTransaction();

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
    policy: {
      enableCrop: deps.enableCrop,
    },
  });
  const ui = session.state;
  const variation = session.variation;

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
      variationExcludePreview: variation.preview(),
      variationExcludeLoading: variation.loading(),
      variationExclude: variation.exclude,
      showVariationExcludePreview: variation.showPreview,
      setVariationExcludeThreshold: variation.setThreshold,
      cancelVariationExclude: variation.cancel,
      applyVariationExclude: variation.apply,
      autoExclude: variation.autoExclude,
      applySmartExclusion: session.applySmartExclusion,
      reportError: session.actions.reportError,
    };
  });
}

export type { ExcludedByPosition, StateUpdater };

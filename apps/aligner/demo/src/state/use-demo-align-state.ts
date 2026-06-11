import type { AlignGridCellCoord, AlignGridState, ContrastWindow } from "@lisca/contracts";
import type { AutoExcludePreviewResponse } from "@lisca/contracts";
import type { VariationExcludePreviewState } from "@lisca/ui/features";
import type { FrameResult } from "@lisca/utils";
import { buildRoiExportZip, downloadBlob, loadImageFile, stemName } from "@lisca/web-demo/browser";
import { cellsBelowVariationThreshold } from "@lisca/client/align-session";
import {
  collectAlignGridEdgeCells,
  computeAutoExcludePreview,
  countVisibleAlignGridCells,
  createDefaultAlignGrid,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
  type AlignGridToolMode,
} from "@lisca/utils";
import { useState } from "react";

export type DemoAlignState = {
  fileName: string | null;
  frameLoading: boolean;
  saving: boolean;
  error: string | null;
  status: string | null;
  contrast: ContrastWindow | null;
  setContrast: (contrast: ContrastWindow | null) => void;
  frame: FrameResult | null;
  grid: AlignGridState;
  setGrid: (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) => void;
  toolMode: AlignGridToolMode;
  setToolMode: (mode: AlignGridToolMode) => void;
  patternZoomLocked: boolean;
  setPatternZoomLocked: (locked: boolean) => void;
  excludedCells: AlignGridCellCoord[];
  setExcludedCells: (cells: Iterable<AlignGridCellCoord>) => void;
  excludeAllCells: () => void;
  excludeEdgeCells: () => void;
  resetExcludedCells: () => void;
  variationExcludePreview: VariationExcludePreviewState;
  variationExcludeLoading: boolean;
  variationExclude: () => Promise<void>;
  setVariationExcludeThreshold: (threshold: number) => void;
  cancelVariationExclude: () => void;
  applyVariationExclude: () => void;
  autoExclude: () => Promise<void>;
  visibleCounts: {
    included: number;
    excluded: number;
  };
  openImage: (file: File) => Promise<void>;
  saveCurrent: () => Promise<boolean>;
};

export function useDemoAlignState(): DemoAlignState {
  const [fileName, setFileName] = useState<string | null>(null);
  const [frameLoading, setFrameLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [contrast, setContrast] = useState<ContrastWindow | null>(null);
  const [frame, setFrame] = useState<FrameResult | null>(null);
  const [grid, setGrid] = useState<AlignGridState>(() => ({
    ...createDefaultAlignGrid(),
    enabled: true,
  }));
  const [toolMode, setToolMode] = useState<AlignGridToolMode>("pan");
  const [patternZoomLocked, setPatternZoomLocked] = useState(false);
  const [excludedCells, setExcludedCellsState] = useState<AlignGridCellCoord[]>([]);
  const [variationExcludePreview, setVariationExcludePreview] =
    useState<VariationExcludePreviewState>(null);
  const [variationExcludeLoading, setVariationExcludeLoading] = useState(false);

  const setExcludedCells = (cells: Iterable<AlignGridCellCoord>) => {
    setExcludedCellsState(Array.from(cells));
  };
  const resetExcludedCells = () => {
    setExcludedCellsState([]);
  };
  const excludeAllCells = () => {
    if (!frame) return;
    setExcludedCellsState(
      enumerateVisibleAlignGridCells(frame, grid).map(({ i, j }) => ({
        i,
        j,
      })),
    );
  };
  const excludeEdgeCells = () => {
    if (!frame) return;
    setExcludedCellsState((current) =>
      mergeExcludedAlignGridCells(current, collectAlignGridEdgeCells(frame, grid)),
    );
  };
  const previewVariationExclude = (): AutoExcludePreviewResponse | null => {
    if (!frame) return null;
    const cells = enumerateVisibleAlignGridCells(frame, grid);
    if (cells.length === 0) return null;
    return computeAutoExcludePreview(frame, cells);
  };
  const variationExclude = async () => {
    if (!frame) return;
    setStatus("Var exclude preview");
    setVariationExcludeLoading(true);
    try {
      const preview = previewVariationExclude();
      if (!preview) {
        setStatus("No visible cells for var exclude");
        return;
      }
      setVariationExcludePreview({
        preview,
        threshold: preview.threshold,
      });
      setStatus(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setVariationExcludeLoading(false);
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
    setStatus("Var exclude cancelled");
  };
  const applyVariationExclude = () => {
    if (!variationExcludePreview) return;
    const variationCells = cellsBelowVariationThreshold(
      variationExcludePreview.preview,
      variationExcludePreview.threshold,
    );
    setExcludedCellsState((current) =>
      mergeExcludedAlignGridCells(current, variationCells),
    );
    setVariationExcludePreview(null);
    setStatus(
      `Var excluded ${variationCells.length} of ${variationExcludePreview.preview.eligibleCellCount} cells`,
    );
  };
  const autoExclude = async () => {
    if (!frame) return;
    setStatus("Auto exclude");
    setVariationExcludeLoading(true);
    try {
      const edgeCells = collectAlignGridEdgeCells(frame, grid);
      const preview = previewVariationExclude();
      const variationCells = preview
        ? cellsBelowVariationThreshold(preview, preview.threshold)
        : [];
      const nextExcluded = mergeExcludedAlignGridCells(excludedCells, [
        ...edgeCells,
        ...variationCells,
      ]);
      setExcludedCellsState(nextExcluded);
      setStatus(`Auto excluded ${nextExcluded.length - excludedCells.length} cells`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setVariationExcludeLoading(false);
    }
  };
  const visibleCounts = frame
    ? countVisibleAlignGridCells(frame, grid, excludedCells)
    : {
        included: 0,
        excluded: 0,
      };
  const openImage = async (file: File) => {
    setFrameLoading(true);
    setError(null);
    setStatus("Loading image");
    try {
      const nextFrame = await loadImageFile(file);
      setFileName(file.name);
      setFrame(nextFrame);
      setContrast(null);
      setExcludedCellsState([]);
      setVariationExcludePreview(null);
      setGrid({
        ...createDefaultAlignGrid(),
        enabled: true,
      });
      setStatus(null);
    } catch (cause) {
      setFrame(null);
      setFileName(null);
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus(null);
    } finally {
      setFrameLoading(false);
    }
  };
  const saveCurrent = async () => {
    if (!frame || !fileName) return false;
    const { included } = countVisibleAlignGridCells(frame, grid, excludedCells);
    if (included === 0) {
      setError("All grid cells are excluded — adjust exclusions before saving.");
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      const stem = stemName(fileName);
      const zip = buildRoiExportZip({
        fileName,
        frame,
        grid,
        excludedCells,
      });
      downloadBlob(
        `${stem}-rois.zip`,
        new Blob([new Uint8Array(zip)], { type: "application/zip" }),
      );
      setStatus(`Downloaded ${stem}-rois.zip (${included} ROI${included === 1 ? "" : "s"})`);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return false;
    } finally {
      setSaving(false);
    }
  };
  return {
    fileName,
    frameLoading,
    saving,
    error,
    status,
    contrast,
    setContrast,
    frame,
    grid,
    setGrid,
    toolMode,
    setToolMode,
    patternZoomLocked,
    setPatternZoomLocked,
    excludedCells,
    setExcludedCells,
    excludeAllCells,
    excludeEdgeCells,
    resetExcludedCells,
    variationExcludePreview,
    variationExcludeLoading,
    variationExclude,
    setVariationExcludeThreshold,
    cancelVariationExclude,
    applyVariationExclude,
    autoExclude,
    visibleCounts,
    openImage,
    saveCurrent,
  };
}

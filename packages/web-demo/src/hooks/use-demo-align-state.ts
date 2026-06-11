import type { AlignGridCellCoord, AlignGridState, ContrastWindow } from "@lisca/contracts";
import type { AutoExcludePreviewResponse } from "@lisca/contracts";
import type { VariationExcludePreviewState } from "@lisca/ui/features";
import type { FrameResult } from "@lisca/utils";
import { cellsBelowVariationThreshold } from "@lisca/client/align-session";
import {
  collectAlignGridEdgeCells,
  computeAutoExcludePreview,
  countVisibleAlignGridCells,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
  type AlignGridToolMode,
} from "@lisca/utils";
import { useAtom } from "@effect-atom/atom-react";

import {
  buildRoiExportZip,
  downloadBlob,
  loadImageFile,
  stemName,
  type SourceImageFormat,
} from "../browser";
import { demoAlignUiActions, demoAlignUiAtom } from "../atoms/demo-align-ui";

export type DemoAlignState = {
  fileName: string | null;
  sourceFormat: SourceImageFormat | null;
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
  const [state, setState] = useAtom(demoAlignUiAtom);
  const {
    fileName,
    sourceFormat,
    frameLoading,
    saving,
    error,
    status,
    contrast,
    frame,
    grid,
    toolMode,
    patternZoomLocked,
    excludedCells,
    variationExcludePreview,
    variationExcludeLoading,
  } = state;

  const previewVariationExclude = (): AutoExcludePreviewResponse | null => {
    if (!frame) return null;
    const cells = enumerateVisibleAlignGridCells(frame, grid);
    if (cells.length === 0) return null;
    return computeAutoExcludePreview(frame, cells);
  };

  return {
    fileName,
    sourceFormat,
    frameLoading,
    saving,
    error,
    status,
    contrast,
    setContrast: (value) => demoAlignUiActions.setContrast(setState, value),
    frame,
    grid,
    setGrid: (next) => demoAlignUiActions.setGrid(setState, next),
    toolMode,
    setToolMode: (mode) => demoAlignUiActions.setToolMode(setState, mode),
    patternZoomLocked,
    setPatternZoomLocked: (locked) => demoAlignUiActions.setPatternZoomLocked(setState, locked),
    excludedCells,
    setExcludedCells: (cells) =>
      demoAlignUiActions.setExcludedCells(setState, Array.from(cells)),
    excludeAllCells: () => {
      if (!frame) return;
      demoAlignUiActions.setExcludedCells(
        setState,
        enumerateVisibleAlignGridCells(frame, grid).map(({ i, j }) => ({ i, j })),
      );
    },
    excludeEdgeCells: () => {
      if (!frame) return;
      demoAlignUiActions.setExcludedCells(
        setState,
        mergeExcludedAlignGridCells(excludedCells, collectAlignGridEdgeCells(frame, grid)),
      );
    },
    resetExcludedCells: () => demoAlignUiActions.setExcludedCells(setState, []),
    variationExcludePreview,
    variationExcludeLoading,
    variationExclude: async () => {
      if (!frame) return;
      demoAlignUiActions.setStatus(setState, "Var exclude preview");
      demoAlignUiActions.setVariationExcludeLoading(setState, true);
      try {
        const preview = previewVariationExclude();
        if (!preview) {
          demoAlignUiActions.setStatus(setState, "No visible cells for var exclude");
          return;
        }
        demoAlignUiActions.setVariationExcludePreview(setState, {
          preview,
          threshold: preview.threshold,
        });
        demoAlignUiActions.setStatus(setState, null);
      } catch (cause) {
        demoAlignUiActions.setError(
          setState,
          cause instanceof Error ? cause.message : String(cause),
        );
      } finally {
        demoAlignUiActions.setVariationExcludeLoading(setState, false);
      }
    },
    setVariationExcludeThreshold: (threshold) => {
      if (!variationExcludePreview) return;
      demoAlignUiActions.setVariationExcludePreview(setState, {
        ...variationExcludePreview,
        threshold,
      });
    },
    cancelVariationExclude: () => {
      demoAlignUiActions.setVariationExcludePreview(setState, null);
      demoAlignUiActions.setStatus(setState, "Var exclude cancelled");
    },
    applyVariationExclude: () => {
      if (!variationExcludePreview) return;
      const variationCells = cellsBelowVariationThreshold(
        variationExcludePreview.preview,
        variationExcludePreview.threshold,
      );
      demoAlignUiActions.setExcludedCells(
        setState,
        mergeExcludedAlignGridCells(excludedCells, variationCells),
      );
      demoAlignUiActions.setVariationExcludePreview(setState, null);
      demoAlignUiActions.setStatus(
        setState,
        `Var excluded ${variationCells.length} of ${variationExcludePreview.preview.eligibleCellCount} cells`,
      );
    },
    autoExclude: async () => {
      if (!frame) return;
      demoAlignUiActions.setStatus(setState, "Auto exclude");
      demoAlignUiActions.setVariationExcludeLoading(setState, true);
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
        demoAlignUiActions.setExcludedCells(setState, nextExcluded);
        demoAlignUiActions.setStatus(
          setState,
          `Auto excluded ${nextExcluded.length - excludedCells.length} cells`,
        );
      } catch (cause) {
        demoAlignUiActions.setError(
          setState,
          cause instanceof Error ? cause.message : String(cause),
        );
      } finally {
        demoAlignUiActions.setVariationExcludeLoading(setState, false);
      }
    },
    visibleCounts: frame
      ? countVisibleAlignGridCells(frame, grid, excludedCells)
      : { included: 0, excluded: 0 },
    openImage: async (file) => {
      demoAlignUiActions.setFrameLoading(setState, true);
      demoAlignUiActions.setError(setState, null);
      demoAlignUiActions.setStatus(setState, "Loading image");
      try {
        const { frame: nextFrame, format } = await loadImageFile(file);
        demoAlignUiActions.applyLoadedImage(setState, file.name, format, nextFrame);
      } catch (cause) {
        demoAlignUiActions.clearLoadedImage(setState);
        demoAlignUiActions.setError(
          setState,
          cause instanceof Error ? cause.message : String(cause),
        );
        demoAlignUiActions.setStatus(setState, null);
      } finally {
        demoAlignUiActions.setFrameLoading(setState, false);
      }
    },
    saveCurrent: async () => {
      if (!frame || !fileName || !sourceFormat) return false;
      const { included } = countVisibleAlignGridCells(frame, grid, excludedCells);
      if (included === 0) {
        demoAlignUiActions.setError(
          setState,
          "All grid cells are excluded — adjust exclusions before saving.",
        );
        return false;
      }
      demoAlignUiActions.setSaving(setState, true);
      demoAlignUiActions.setError(setState, null);
      try {
        const stem = stemName(fileName);
        const zip = await buildRoiExportZip({
          fileName,
          frame,
          sourceFormat,
          grid,
          excludedCells,
        });
        downloadBlob(
          `${stem}-rois.zip`,
          new Blob([new Uint8Array(zip)], { type: "application/zip" }),
        );
        demoAlignUiActions.setStatus(
          setState,
          `Downloaded ${stem}-rois.zip (${included} ROI${included === 1 ? "" : "s"})`,
        );
        return true;
      } catch (cause) {
        demoAlignUiActions.setError(
          setState,
          cause instanceof Error ? cause.message : String(cause),
        );
        return false;
      } finally {
        demoAlignUiActions.setSaving(setState, false);
      }
    },
  };
}

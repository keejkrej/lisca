import type { AlignGridPatternCoord, AlignGridState, ContrastWindow } from "@lisca/contracts";
import type { VariationExcludePreviewResponse } from "@lisca/contracts";
import type { VariationExcludePreviewState } from "@lisca/ui/features";
import type { FrameResult } from "@lisca/utils";
import { patternsBelowVariationThreshold } from "@lisca/client/align-session";
import {
  collectAlignGridEdgePatterns,
  computeVariationExcludePreview,
  countVisibleAlignGridPatterns,
  enumerateVisibleAlignGridPatterns,
  mergeExcludedAlignGridPatterns,
  type AlignGridToolMode,
} from "@lisca/utils";
import { useAtom } from "@effect/atom-solid";
import { createMemo, type Accessor } from "solid-js";

import {
  buildRoiExportZip,
  downloadBlob,
  loadAlignerDemoPreset,
  loadImageFile,
  stemName,
  type DemoSampleImageId,
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
  spacingZoomLocked: boolean;
  setSpacingZoomLocked: (locked: boolean) => void;
  patternZoomLocked: boolean;
  setPatternZoomLocked: (locked: boolean) => void;
  manualExclusionEnabled: boolean;
  setManualExclusionEnabled: (enabled: boolean) => void;
  excludedPatterns: AlignGridPatternCoord[];
  setExcludedPatterns: (patterns: Iterable<AlignGridPatternCoord>) => void;
  excludeAllPatterns: () => void;
  excludeEdgePatterns: () => void;
  resetExcludedPatterns: () => void;
  variationExcludePreview: VariationExcludePreviewState;
  variationExcludeLoading: boolean;
  variationExclude: () => Promise<void>;
  setVariationExcludeThreshold: (threshold: number) => void;
  cancelVariationExclude: () => void;
  applyVariationExclude: () => void;
  applySmartExclusion: (modelPatterns: AlignGridPatternCoord[]) => void;
  reportError: (message: string | null) => void;
  visibleCounts: {
    included: number;
    excluded: number;
  };
  openImage: (file: File) => Promise<void>;
  openSampleImage: (sampleId: DemoSampleImageId) => Promise<void>;
  saveCurrent: () => Promise<boolean>;
};

export function useDemoAlignState(): Accessor<DemoAlignState> {
  const [state, setState] = useAtom(() => demoAlignUiAtom);

  const previewVariationExclude = (): VariationExcludePreviewResponse | null => {
    const current = state();
    if (!current.frame) return null;
    const patterns = enumerateVisibleAlignGridPatterns(current.frame, current.grid);
    if (patterns.length === 0) return null;
    return computeVariationExcludePreview(current.frame, patterns);
  };

  return createMemo<DemoAlignState>(() => {
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
      spacingZoomLocked,
      patternZoomLocked,
      manualExclusionEnabled,
      excludedPatterns,
      variationExcludePreview,
      variationExcludeLoading,
    } = state();

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
      spacingZoomLocked,
      setSpacingZoomLocked: (locked) => demoAlignUiActions.setSpacingZoomLocked(setState, locked),
      patternZoomLocked,
      setPatternZoomLocked: (locked) => demoAlignUiActions.setPatternZoomLocked(setState, locked),
      manualExclusionEnabled,
      setManualExclusionEnabled: (enabled) =>
        demoAlignUiActions.setManualExclusionEnabled(setState, enabled),
      excludedPatterns,
      setExcludedPatterns: (patterns) =>
        demoAlignUiActions.setExcludedPatterns(setState, Array.from(patterns)),
      excludeAllPatterns: () => {
        if (!frame) return;
        demoAlignUiActions.setExcludedPatterns(
          setState,
          enumerateVisibleAlignGridPatterns(frame, grid).map(({ i, j }) => ({ i, j })),
        );
      },
      excludeEdgePatterns: () => {
        if (!frame) return;
        demoAlignUiActions.setExcludedPatterns(
          setState,
          mergeExcludedAlignGridPatterns(
            excludedPatterns,
            collectAlignGridEdgePatterns(frame, grid),
          ),
        );
      },
      resetExcludedPatterns: () => demoAlignUiActions.setExcludedPatterns(setState, []),
      variationExcludePreview,
      variationExcludeLoading,
      variationExclude: async () => {
        if (!frame) return;
        demoAlignUiActions.setStatus(setState, "Var exclude preview");
        demoAlignUiActions.setVariationExcludeLoading(setState, true);
        try {
          const preview = previewVariationExclude();
          if (!preview) {
            demoAlignUiActions.setStatus(setState, "No visible patterns for var exclude");
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
        if (!variationExcludePreview || !frame) return;
        const variationPatterns = patternsBelowVariationThreshold(
          variationExcludePreview.preview,
          variationExcludePreview.threshold,
        );
        const edgePatterns = collectAlignGridEdgePatterns(frame, grid);
        demoAlignUiActions.setExcludedPatterns(
          setState,
          mergeExcludedAlignGridPatterns(excludedPatterns, [...edgePatterns, ...variationPatterns]),
        );
        demoAlignUiActions.setVariationExcludePreview(setState, null);
        demoAlignUiActions.setStatus(
          setState,
          `Var excluded ${variationPatterns.length} of ${variationExcludePreview.preview.eligiblePatternCount} patterns`,
        );
      },
      applySmartExclusion: (modelPatterns) => {
        if (!frame) return;
        const edgePatterns = collectAlignGridEdgePatterns(frame, grid);
        const nextExcluded = mergeExcludedAlignGridPatterns(excludedPatterns, [
          ...edgePatterns,
          ...modelPatterns,
        ]);
        demoAlignUiActions.setExcludedPatterns(setState, nextExcluded);
        demoAlignUiActions.setStatus(
          setState,
          `Smart excluded ${nextExcluded.length - excludedPatterns.length} patterns`,
        );
      },
      reportError: (message) => demoAlignUiActions.setError(setState, message),
      visibleCounts: frame
        ? countVisibleAlignGridPatterns(frame, grid, excludedPatterns)
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
      openSampleImage: async (sampleId) => {
        demoAlignUiActions.setFrameLoading(setState, true);
        demoAlignUiActions.setError(setState, null);
        demoAlignUiActions.setStatus(setState, "Loading sample image");
        try {
          const sample = await loadAlignerDemoPreset(sampleId);
          demoAlignUiActions.applyDemoPreset(setState, sample);
        } catch (cause) {
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
        const { included } = countVisibleAlignGridPatterns(frame, grid, excludedPatterns);
        if (included === 0) {
          demoAlignUiActions.setError(
            setState,
            "All grid patterns are excluded — adjust exclusions before saving.",
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
            excludedPatterns,
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
  });
}

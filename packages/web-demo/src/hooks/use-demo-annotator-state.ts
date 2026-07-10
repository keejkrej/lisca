import type { AnnotationLabel, ContrastWindow } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import type { AnnotationMode, AnnotationTool } from "@lisca/ui/features";
import { toolCanRunWithoutLabel } from "@lisca/ui/features";
import { maskHasPixels } from "@lisca/utils";
import { useAtom } from "@effect-atom/atom-solid";
import { createMemo, type Accessor } from "solid-js";

import type { AnnotationValue } from "../annotation-value";
import {
  buildAnnotationExportZip,
  downloadBlob,
  loadAnnotatorDemoPreset,
  loadImageFile,
  stemName,
  type DemoSampleImageId,
} from "../browser";
import { encodeMaskToPngBytes } from "../browser/encode-annotation-mask";
import {
  currentDemoAnnotation,
  demoAnnotationDirty,
  demoAnnotatorUiActions,
  demoAnnotatorUiAtom,
} from "../atoms/demo-annotator-ui";

export type DemoAnnotationHandle = {
  current: AnnotationValue;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  commit: (value: AnnotationValue) => void;
  undo: () => void;
  redo: () => void;
  discard: () => void;
  markSaved: () => void;
};

export type DemoAnnotatorState = {
  fileName: string | null;
  frameLoading: boolean;
  saving: boolean;
  error: string | null;
  status: string | null;
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  labels: AnnotationLabel[];
  activeLabelId: string | null;
  mode: AnnotationMode;
  tool: AnnotationTool;
  brushSize: number;
  overlayOpacity: number;
  labelDialogOpen: boolean;
  labelError: string | null;
  annotation: DemoAnnotationHandle;
  canEdit: boolean;
  canEditSegmentation: boolean;
  canSave: boolean;
  setActiveLabelId: (labelId: string | null) => void;
  setMode: (mode: AnnotationMode) => void;
  setTool: (tool: AnnotationTool) => void;
  setBrushSize: (value: number) => void;
  setOverlayOpacity: (value: number) => void;
  setContrast: (value: ContrastWindow | null) => void;
  setLabelDialogOpen: (open: boolean) => void;
  setLabelError: (error: string | null) => void;
  openImage: (file: File) => Promise<void>;
  openSampleImage: (sampleId: DemoSampleImageId) => Promise<void>;
  saveCurrent: () => Promise<void>;
  saveLabels: (labels: AnnotationLabel[]) => void;
};

export function useDemoAnnotatorState(): Accessor<DemoAnnotatorState> {
  const [state, setState] = useAtom(demoAnnotatorUiAtom);

  return createMemo<DemoAnnotatorState>(() => {
    const {
      fileName,
      frameLoading,
      saving,
      error,
      status,
      frame,
      contrast,
      labels,
      activeLabelId,
      mode,
      tool,
      brushSize,
      overlayOpacity,
      labelDialogOpen,
      labelError,
      annotationHistory,
      annotationIndex,
    } = state();

    const annotation: DemoAnnotationHandle = {
      current: currentDemoAnnotation(state()),
      dirty: demoAnnotationDirty(state()),
      canUndo: annotationIndex > 0,
      canRedo: annotationIndex < annotationHistory.length - 1,
      commit: (value) => demoAnnotatorUiActions.commitAnnotation(setState, value),
      undo: () => demoAnnotatorUiActions.undoAnnotation(setState),
      redo: () => demoAnnotatorUiActions.redoAnnotation(setState),
      discard: () => demoAnnotatorUiActions.discardAnnotation(setState),
      markSaved: () => demoAnnotatorUiActions.markAnnotationSaved(setState),
    };

    const activeLabelValue = labels.findIndex((label) => label.id === activeLabelId) + 1;
    const canEdit = Boolean(frame && labels.length > 0) && !frameLoading;
    const canEditSegmentation =
      canEdit && mode === "segmentation" && (activeLabelValue > 0 || toolCanRunWithoutLabel(tool));
    const canSave = canEdit && annotation.dirty && !saving;

    return {
      fileName,
      frameLoading,
      saving,
      error,
      status,
      frame,
      contrast,
      labels,
      activeLabelId,
      mode,
      tool,
      brushSize,
      overlayOpacity,
      labelDialogOpen,
      labelError,
      annotation,
      canEdit,
      canEditSegmentation,
      canSave,
      setActiveLabelId: (labelId) => demoAnnotatorUiActions.setActiveLabelId(setState, labelId),
      setMode: (modeValue) => demoAnnotatorUiActions.setMode(setState, modeValue),
      setTool: (toolValue) => demoAnnotatorUiActions.setTool(setState, toolValue),
      setBrushSize: (value) => demoAnnotatorUiActions.setBrushSize(setState, value),
      setOverlayOpacity: (value) => demoAnnotatorUiActions.setOverlayOpacity(setState, value),
      setContrast: (value) => demoAnnotatorUiActions.setContrast(setState, value),
      setLabelDialogOpen: (open) => demoAnnotatorUiActions.setLabelDialogOpen(setState, open),
      setLabelError: (value) => demoAnnotatorUiActions.setLabelError(setState, value),
      openImage: async (file) => {
        if (annotation.dirty && !window.confirm("Discard unsaved annotation changes?")) {
          return;
        }
        demoAnnotatorUiActions.setFrameLoading(setState, true);
        demoAnnotatorUiActions.setError(setState, null);
        demoAnnotatorUiActions.setStatus(setState, "Loading image");
        try {
          const { frame: nextFrame } = await loadImageFile(file);
          demoAnnotatorUiActions.applyLoadedImage(setState, file.name, nextFrame);
        } catch (cause) {
          demoAnnotatorUiActions.clearLoadedImage(setState);
          demoAnnotatorUiActions.setError(
            setState,
            cause instanceof Error ? cause.message : String(cause),
          );
          demoAnnotatorUiActions.setStatus(setState, null);
        } finally {
          demoAnnotatorUiActions.setFrameLoading(setState, false);
        }
      },
      openSampleImage: async (sampleId) => {
        if (annotation.dirty && !window.confirm("Discard unsaved annotation changes?")) {
          return;
        }
        demoAnnotatorUiActions.setFrameLoading(setState, true);
        demoAnnotatorUiActions.setError(setState, null);
        demoAnnotatorUiActions.setStatus(setState, "Loading sample image");
        try {
          const sample = await loadAnnotatorDemoPreset(sampleId);
          demoAnnotatorUiActions.applyDemoPreset(setState, sample);
        } catch (cause) {
          demoAnnotatorUiActions.setError(
            setState,
            cause instanceof Error ? cause.message : String(cause),
          );
          demoAnnotatorUiActions.setStatus(setState, null);
        } finally {
          demoAnnotatorUiActions.setFrameLoading(setState, false);
        }
      },
      saveLabels: (nextLabels) => demoAnnotatorUiActions.saveLabels(setState, nextLabels),
      saveCurrent: async () => {
        if (!frame || !fileName || !canSave) return;
        demoAnnotatorUiActions.setSaving(setState, true);
        demoAnnotatorUiActions.setError(setState, null);
        try {
          const stem = stemName(fileName);
          const hasMask = maskHasPixels(annotation.current.mask);
          const maskPng = hasMask
            ? await encodeMaskToPngBytes(
                annotation.current.mask,
                frame.width,
                frame.height,
                labels.map((label, index) => ({
                  value: index + 1,
                  color: label.color,
                })),
              )
            : null;
          const zip = buildAnnotationExportZip({
            stem,
            classificationLabelId: annotation.current.classificationLabelId,
            maskPng,
          });
          const zipName = `${stem}-annotation.zip`;
          downloadBlob(zipName, new Blob([new Uint8Array(zip)], { type: "application/zip" }));
          demoAnnotatorUiActions.markAnnotationSaved(setState);
          demoAnnotatorUiActions.setStatus(setState, `Downloaded ${zipName}`);
        } catch (cause) {
          demoAnnotatorUiActions.setError(
            setState,
            cause instanceof Error ? cause.message : String(cause),
          );
        } finally {
          demoAnnotatorUiActions.setSaving(setState, false);
        }
      },
    };
  });
}
import type { AnnotationLabel, ContrastWindow } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import type { AnnotationMode } from "@lisca/ui/features";
import { buildAnnotationExportZip, downloadBlob, loadImageFile, stemName } from "@lisca/web-demo/browser";
import type { AnnotationTool } from "@lisca/ui/features";
import { useState } from "react";
import { useAnnotationHistory } from "./use-annotation-history";
import { encodeMaskToPngBytes, maskHasPixels } from "../utils/annotation-utils";
const defaultLabels: AnnotationLabel[] = [
  {
    id: "class-1",
    name: "Class 1",
    color: "#22c55e",
  },
  {
    id: "class-2",
    name: "Class 2",
    color: "#3b82f6",
  },
  {
    id: "class-3",
    name: "Class 3",
    color: "#f59e0b",
  },
];
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
  annotation: ReturnType<typeof useAnnotationHistory>;
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
  saveCurrent: () => Promise<void>;
  saveLabels: (labels: AnnotationLabel[]) => void;
};
export function useDemoAnnotatorState(): DemoAnnotatorState {
  const [fileName, setFileName] = useState<string | null>(null);
  const [frameLoading, setFrameLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [frame, setFrame] = useState<FrameResult | null>(null);
  const [contrast, setContrast] = useState<ContrastWindow | null>(null);
  const [labels, setLabels] = useState<AnnotationLabel[]>(defaultLabels);
  const [activeLabelId, setActiveLabelId] = useState<string | null>(defaultLabels[0]?.id ?? null);
  const [mode, setMode] = useState<AnnotationMode>("segmentation");
  const [tool, setTool] = useState<AnnotationTool>("brush");
  const [brushSize, setBrushSize] = useState(8);
  const [overlayOpacity, setOverlayOpacity] = useState(0.45);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);
  const annotation = useAnnotationHistory(frame);
  const openImage = async (file: File) => {
    if (annotation.dirty && !window.confirm("Discard unsaved annotation changes?")) {
      return;
    }
    setFrameLoading(true);
    setError(null);
    setStatus("Loading image");
    try {
      const nextFrame = await loadImageFile(file);
      setFileName(file.name);
      setFrame(nextFrame);
      setContrast(null);
      annotation.reset({
        classificationLabelId: null,
        mask: new Uint8Array(nextFrame.width * nextFrame.height),
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
  const saveLabels = (nextLabels: AnnotationLabel[]) => {
    setLabels(nextLabels);
    if (!nextLabels.some((label) => label.id === activeLabelId)) {
      setActiveLabelId(nextLabels[0]?.id ?? null);
    }
    setLabelDialogOpen(false);
    setLabelError(null);
  };
  const activeLabelValue = labels.findIndex((label) => label.id === activeLabelId) + 1;
  const toolCanRunWithoutLabel = tool === "brush-erase" || tool === "lasso-erase";
  const canEdit = Boolean(frame && labels.length > 0) && !frameLoading;
  const canEditSegmentation =
    canEdit && mode === "segmentation" && (activeLabelValue > 0 || toolCanRunWithoutLabel);
  const canSave = canEdit && annotation.dirty && !saving;
  const saveCurrent = async () => {
    if (!frame || !fileName || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      const stem = stemName(fileName);
      const hasMask = maskHasPixels(annotation.current.mask);
      const maskPng = hasMask
        ? await encodeMaskToPngBytes(annotation.current.mask, frame.width, frame.height)
        : null;
      const zip = buildAnnotationExportZip({
        stem,
        classificationLabelId: annotation.current.classificationLabelId,
        maskPng,
      });
      const zipName = `${stem}-annotation.zip`;
      downloadBlob(zipName, new Blob([new Uint8Array(zip)], { type: "application/zip" }));
      annotation.markSaved();
      setStatus(`Downloaded ${zipName}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
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
    setActiveLabelId,
    setMode,
    setTool,
    setBrushSize,
    setOverlayOpacity,
    setContrast,
    setLabelDialogOpen,
    setLabelError,
    openImage,
    saveCurrent,
    saveLabels,
  };
}

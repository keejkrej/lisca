import type {
  AnnotationLabel,
  AnnotationMode,
  ContrastWindow,
  FrameResult,
  RoiFrameAnnotation,
} from "@lisca/contracts";
import {
  downloadBase64Png,
  downloadJson,
  loadImageFile,
  stemName,
} from "@lisca/browser-frame";
import type { AnnotationTool } from "@lisca/ui";
import { defaultContrastDomain } from "@lisca/utils";
import { useCallback, useState } from "react";

import { useAnnotationHistory } from "./use-annotation-history";
import { encodeMaskToBase64Png, maskHasPixels } from "../utils/annotation-utils";

const defaultLabels: AnnotationLabel[] = [
  { id: "class-1", name: "Class 1", color: "#22c55e" },
  { id: "class-2", name: "Class 2", color: "#3b82f6" },
  { id: "class-3", name: "Class 3", color: "#f59e0b" },
];

export type DemoAnnotatorState = {
  fileName: string | null;
  frameLoading: boolean;
  saving: boolean;
  error: string | null;
  status: string | null;
  frame: FrameResult | null;
  contrast: ContrastWindow;
  contrastDomain: ContrastWindow;
  contrastMin: number;
  contrastMax: number;
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
  setContrast: (value: ContrastWindow) => void;
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
  const [contrast, setContrast] = useState<ContrastWindow>({ min: 0, max: 255 });
  const [labels, setLabels] = useState<AnnotationLabel[]>(defaultLabels);
  const [activeLabelId, setActiveLabelId] = useState<string | null>(defaultLabels[0]?.id ?? null);
  const [mode, setMode] = useState<AnnotationMode>("segmentation");
  const [tool, setTool] = useState<AnnotationTool>("brush");
  const [brushSize, setBrushSize] = useState(8);
  const [overlayOpacity, setOverlayOpacity] = useState(0.45);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);

  const annotation = useAnnotationHistory(frame);
  const contrastDomain = frame ? (frame.contrastDomain ?? defaultContrastDomain(frame)) : { min: 0, max: 255 };

  const openImage = useCallback(
    async (file: File) => {
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
        const domain = nextFrame.contrastDomain ?? defaultContrastDomain(nextFrame);
        setContrast(nextFrame.appliedContrast ?? domain);
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
    },
    [annotation],
  );

  const saveLabels = useCallback(
    (nextLabels: AnnotationLabel[]) => {
      setLabels(nextLabels);
      if (!nextLabels.some((label) => label.id === activeLabelId)) {
        setActiveLabelId(nextLabels[0]?.id ?? null);
      }
      setLabelDialogOpen(false);
      setLabelError(null);
    },
    [activeLabelId],
  );

  const activeLabelValue = labels.findIndex((label) => label.id === activeLabelId) + 1;
  const toolCanRunWithoutLabel = tool === "brush-erase" || tool === "lasso-erase";
  const canEdit = Boolean(frame && labels.length > 0) && !frameLoading;
  const canEditSegmentation =
    canEdit && mode === "segmentation" && (activeLabelValue > 0 || toolCanRunWithoutLabel);
  const canSave = canEdit && annotation.dirty && !saving;

  const saveCurrent = useCallback(async () => {
    if (!frame || !fileName || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      const stem = stemName(fileName);
      const maskPath = `${stem}.mask.png`;
      const hasMask = maskHasPixels(annotation.current.mask);
      const annotationJson: RoiFrameAnnotation = {
        classificationLabelId: annotation.current.classificationLabelId,
        maskPath: hasMask ? maskPath : null,
        updatedAt: new Date().toISOString(),
      };
      if (hasMask) {
        const base64 = await encodeMaskToBase64Png(
          annotation.current.mask,
          frame.width,
          frame.height,
        );
        downloadBase64Png(maskPath, base64);
      }
      downloadJson(`${stem}.annotation.json`, annotationJson);
      annotation.markSaved();
      setStatus(`Downloaded ${stem}.annotation.json${hasMask ? ` and ${maskPath}` : ""}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }, [annotation, canSave, fileName, frame]);

  return {
    fileName,
    frameLoading,
    saving,
    error,
    status,
    frame,
    contrast,
    contrastDomain,
    contrastMin: contrast.min,
    contrastMax: contrast.max,
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

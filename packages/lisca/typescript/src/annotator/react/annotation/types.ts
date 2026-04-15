import type { AnnotationLabel, FrameResult } from "lisca/viewer/contracts";

import type { RoiAnnotationValue } from "./annotationUtils";

export interface RoiAnnotationCanvasProps {
  frame: FrameResult;
  labels: AnnotationLabel[];
  mask: Uint8Array;
  activeLabelId: string | null;
  tool: "brush" | "erase";
  brushSize: number;
  overlayOpacity: number;
  disabled?: boolean;
  className?: string;
  onStrokeStart?: () => void;
  onPreviewMaskChange: (mask: Uint8Array) => void;
  onStrokeCommit: (mask: Uint8Array) => void;
}

export interface RoiAnnotationEditorProps {
  frame: FrameResult;
  labels: AnnotationLabel[] | null;
  initialValue: RoiAnnotationValue;
  resetKey?: string | number;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  className?: string;
  initialBrushSize?: number;
  initialOverlayOpacity?: number;
  onClose: () => void;
  onSave: (value: RoiAnnotationValue) => Promise<void> | void;
  onLabelsChange?: (
    labels: AnnotationLabel[],
  ) => Promise<AnnotationLabel[] | void> | AnnotationLabel[] | void;
}

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

/** Props for `RoiAnnotationProvider` / `useRoiAnnotation` (annotation controller state). */
export interface RoiAnnotationControllerProps {
  frame: FrameResult;
  labels: AnnotationLabel[] | null;
  initialValue: RoiAnnotationValue;
  resetKey?: string | number;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  initialBrushSize?: number;
  initialOverlayOpacity?: number;
  onClose: () => void;
  onSave: (value: RoiAnnotationValue) => Promise<void> | void;
  onLabelsChange?: (
    labels: AnnotationLabel[],
  ) => Promise<AnnotationLabel[] | void> | AnnotationLabel[] | void;
  /**
   * When false, brush/segmentation and save are disabled (controls stay visible; same idea as
   * viewer `controlsDisabled` when no frame).
   */
  annotationInteractive?: boolean;
}

import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";

import type { AnnotationValue } from "../annotation-value";
import { emptyAnnotationValue } from "../annotation-value";
import {
  IBIDI_DEMO_SAMPLE_IMAGES,
  loadImageFromUrl,
} from "./load-image-file";

export type AlignerDemoPreset = {
  fileName: string;
  frame: FrameResult;
  grid: AlignGridState;
  excludedCells: AlignGridCellCoord[];
};

export type AnnotatorDemoPreset = {
  fileName: string;
  frame: FrameResult;
  annotation: AnnotationValue;
};

export { IBIDI_DEMO_SAMPLE_IMAGES, IBIDI_MICROPATTERNING_IMAGE_BASE } from "./load-image-file";

/** Scale a starter grid from frame size — users can fine-tune in the demo. */
export function alignGridForFrame(frame: FrameResult): AlignGridState {
  const scale = Math.min(frame.width, frame.height) / 409;
  const spacing = Math.round(38 * scale);
  const cell = Math.round(28 * scale);
  return {
    enabled: true,
    shape: "rect",
    tx: 0,
    ty: 0,
    rotation: 0,
    spacingA: spacing,
    spacingB: spacing,
    cellWidth: cell,
    cellHeight: cell,
    opacity: 0.35,
  };
}

function fileNameFromUrl(url: string): string {
  return url.split("/").pop() ?? "sample.jpg";
}

export async function loadAlignerDemoPreset(): Promise<AlignerDemoPreset> {
  const imageUrl = IBIDI_DEMO_SAMPLE_IMAGES.multiCell;
  const { frame } = await loadImageFromUrl(imageUrl);
  return {
    fileName: fileNameFromUrl(imageUrl),
    frame,
    grid: alignGridForFrame(frame),
    excludedCells: [],
  };
}

export async function loadAnnotatorDemoPreset(): Promise<AnnotatorDemoPreset> {
  const imageUrl = IBIDI_DEMO_SAMPLE_IMAGES.rccComposite;
  const { frame } = await loadImageFromUrl(imageUrl);
  return {
    fileName: fileNameFromUrl(imageUrl),
    frame,
    annotation: emptyAnnotationValue(frame),
  };
}

/** @deprecated Use loadAlignerDemoPreset — kept for imports that expect sync shape. */
export async function createAlignerDemoPreset(): Promise<AlignerDemoPreset> {
  return loadAlignerDemoPreset();
}

/** @deprecated Use loadAnnotatorDemoPreset — kept for imports that expect sync shape. */
export async function createAnnotatorDemoPreset(): Promise<AnnotatorDemoPreset> {
  return loadAnnotatorDemoPreset();
}

import type { AlignGridCellCoord, AutoExcludePreviewCell } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { loadTransformers } from "../../shared/transformers";

import type { ClassifyExclusionCandidatesOptions } from "../types";
import { EXCLUDE_LABEL } from "../types";
import { getSmartExcludeClassifier, SMART_EXCLUDE_IMAGE_SIZE } from "./exclude-engine";
import { cropCellToCanvas, resizeCanvasToSquare } from "./preprocess";

const DEFAULT_THRESHOLD = 0.5;
const DEFAULT_BATCH_SIZE = 16;

function scoreForLabel(outputs: Array<{ label: string; score: number }>, label: string): number {
  const match = outputs.find((entry) => entry.label === label);
  return match?.score ?? 0;
}

async function classifyCellCanvas(
  classifier: (image: unknown) => Promise<Array<{ label: string; score: number }>>,
  canvas: HTMLCanvasElement,
): Promise<number> {
  const { RawImage } = await loadTransformers();
  const resized = resizeCanvasToSquare(canvas, SMART_EXCLUDE_IMAGE_SIZE);
  const image = RawImage.fromCanvas(resized);
  const outputs = await classifier(image);
  return scoreForLabel(outputs, "exclude");
}

export async function classifyExclusionCandidates(
  frame: FrameResult,
  cells: readonly AutoExcludePreviewCell[],
  options: ClassifyExclusionCandidatesOptions = {},
): Promise<AlignGridCellCoord[]> {
  if (cells.length === 0) return [];

  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const classifier = await getSmartExcludeClassifier(options.onProgress);
  const excluded: AlignGridCellCoord[] = [];

  for (let offset = 0; offset < cells.length; offset += batchSize) {
    const batch = cells.slice(offset, offset + batchSize);
    for (const cell of batch) {
      const canvas = cropCellToCanvas(frame, cell.x, cell.y, cell.w, cell.h);
      const excludeScore = await classifyCellCanvas(classifier, canvas);
      if (excludeScore >= threshold) {
        excluded.push({ i: cell.i, j: cell.j });
      }
    }
    await Promise.resolve();
  }

  return excluded;
}

export async function runSmartExclude(
  frame: FrameResult,
  cells: readonly AutoExcludePreviewCell[],
  options?: ClassifyExclusionCandidatesOptions,
): Promise<AlignGridCellCoord[]> {
  return classifyExclusionCandidates(frame, cells, options);
}

export { EXCLUDE_LABEL, DEFAULT_THRESHOLD as SMART_EXCLUDE_DEFAULT_THRESHOLD };

import type { AlignGridCellCoord, AlignGridState, SavedAlignState } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import {
  alignStateFromCurrent,
  buildBboxCsv,
  cropFrameRegion,
  enumerateVisibleAlignGridCells,
} from "@lisca/utils";
import { strToU8, zipSync } from "fflate";

import { encodeRoiImage } from "./encode-roi-image";
import { roiImageExtension, type SourceImageFormat } from "./source-image-format";

const DEMO_POSITION = 0;
const MAX_DEMO_ROI_EXPORT = 500;

export type BuildRoiExportZipInput = {
  fileName: string;
  frame: FrameResult;
  sourceFormat: SourceImageFormat;
  grid: AlignGridState;
  excludedCells: readonly AlignGridCellCoord[];
};

function alignGridCellKey(cell: AlignGridCellCoord): string {
  return `${cell.i}:${cell.j}`;
}

function demoRoiIndexJson(
  entries: Array<{
    roi: number;
    fileName: string;
    bbox: { roi: number; x: number; y: number; w: number; h: number };
  }>,
) {
  return {
    position: DEMO_POSITION,
    axisOrder: "TCZYX" as const,
    timeCount: 1,
    channelCount: 1,
    zCount: 1,
    rois: entries,
  };
}

export async function buildRoiExportZip(input: BuildRoiExportZipInput): Promise<Uint8Array> {
  const excluded = new Set(input.excludedCells.map(alignGridCellKey));
  const cells = enumerateVisibleAlignGridCells(input.frame, input.grid).filter(
    (cell) => !excluded.has(alignGridCellKey(cell)),
  );

  if (cells.length === 0) {
    throw new Error("All grid cells are excluded — adjust exclusions before downloading.");
  }
  if (cells.length > MAX_DEMO_ROI_EXPORT) {
    throw new Error(
      `Too many ROIs to export in the browser (${cells.length}). Narrow the grid or exclude more cells (max ${MAX_DEMO_ROI_EXPORT}).`,
    );
  }

  const alignState: SavedAlignState = alignStateFromCurrent(input.grid, [...input.excludedCells]);
  const bboxCsv = buildBboxCsv(input.frame, input.grid, input.excludedCells);
  const stem = input.fileName.replace(/\.[^.]+$/, "");
  const files: Record<string, Uint8Array> = {
    [`${stem}.bbox.csv`]: strToU8(bboxCsv),
    [`${stem}.align.json`]: strToU8(`${JSON.stringify(alignState, null, 2)}\n`),
  };

  const indexEntries: Array<{
    roi: number;
    fileName: string;
    bbox: { roi: number; x: number; y: number; w: number; h: number };
  }> = [];

  const roiExtension = roiImageExtension(input.sourceFormat);

  const encodedRois = await Promise.all(
    cells.map(async (cell, roi) => {
      const pixels = cropFrameRegion(input.frame, cell);
      const roiName = `Roi${roi}.${roiExtension}`;
      const roiPath = `roi/Pos${DEMO_POSITION}/${roiName}`;
      const bytes = await encodeRoiImage(
        input.sourceFormat,
        cell.w,
        cell.h,
        pixels,
        input.frame.pixelType,
      );
      return {
        roiPath,
        bytes,
        entry: {
          roi,
          fileName: roiName,
          bbox: {
            roi,
            x: cell.x,
            y: cell.y,
            w: cell.w,
            h: cell.h,
          },
        },
      };
    }),
  );

  for (const encoded of encodedRois) {
    files[encoded.roiPath] = encoded.bytes;
    indexEntries.push(encoded.entry);
  }

  files[`roi/Pos${DEMO_POSITION}/index.json`] = strToU8(
    `${JSON.stringify(demoRoiIndexJson(indexEntries), null, 2)}\n`,
  );

  return zipSync(files);
}

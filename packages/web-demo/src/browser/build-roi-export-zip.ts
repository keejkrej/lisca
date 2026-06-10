import type { AlignGridCellCoord, AlignGridState, SavedAlignState } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import {
  alignStateFromCurrent,
  buildBboxCsv,
  cropFrameRegion,
  enumerateVisibleAlignGridCells,
} from "@lisca/utils";
import { strToU8, zipSync } from "fflate";

import { encodeGray16Tiff } from "./encode-gray16-tiff";

const DEMO_POSITION = 0;
const MAX_DEMO_ROI_EXPORT = 500;

export type BuildRoiExportZipInput = {
  fileName: string;
  frame: FrameResult;
  grid: AlignGridState;
  excludedCells: readonly AlignGridCellCoord[];
};

function alignGridCellKey(cell: AlignGridCellCoord): string {
  return `${cell.i}:${cell.j}`;
}

function demoRoiIndexJson(
  fileName: string,
  frame: FrameResult,
  entries: Array<{
    roi: number;
    fileName: string;
    bbox: { roi: number; x: number; y: number; w: number; h: number };
    shape: [number, number, number, number, number];
  }>,
) {
  return {
    position: DEMO_POSITION,
    axisOrder: "TCZYX",
    pageOrder: ["t", "c", "z"],
    timeCount: 1,
    channelCount: 1,
    zCount: 1,
    source: {
      kind: "folder" as const,
      path: fileName,
      subfolderTemplate: "Pos{p}",
      filenameTemplate: "img_channel{c}_position{p}_time{t}_z{z}",
    },
    rois: entries,
  };
}

export function buildRoiExportZip(input: BuildRoiExportZipInput): Uint8Array {
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
    shape: [number, number, number, number, number];
  }> = [];

  for (const [roi, cell] of cells.entries()) {
    const pixels = cropFrameRegion(input.frame, cell);
    const tiffName = `Roi${roi}.tif`;
    const tiffPath = `roi/Pos${DEMO_POSITION}/${tiffName}`;
    files[tiffPath] = encodeGray16Tiff(cell.w, cell.h, pixels);
    indexEntries.push({
      roi,
      fileName: tiffName,
      bbox: {
        roi,
        x: cell.x,
        y: cell.y,
        w: cell.w,
        h: cell.h,
      },
      shape: [1, 1, 1, cell.h, cell.w],
    });
  }

  files[`roi/Pos${DEMO_POSITION}/index.json`] = strToU8(
    `${JSON.stringify(demoRoiIndexJson(input.fileName, input.frame, indexEntries), null, 2)}\n`,
  );

  return zipSync(files);
}

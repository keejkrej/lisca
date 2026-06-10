import type {
  AlignGridCellCoord,
  AlignGridState,
  ContrastWindow,
  FrameResult,
} from "@lisca/contracts";
import { downloadJson, downloadText, loadImageFile, stemName } from "@lisca/browser-frame";
import {
  alignStateFromCurrent,
  buildBboxCsv,
  collectAlignGridEdgeCells,
  countVisibleAlignGridCells,
  createDefaultAlignGrid,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
  type AlignGridToolMode,
} from "@lisca/utils";
import { useState } from "react";
export type DemoAlignState = {
  fileName: string | null;
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
  patternZoomLocked: boolean;
  setPatternZoomLocked: (locked: boolean) => void;
  excludedCells: AlignGridCellCoord[];
  setExcludedCells: (cells: Iterable<AlignGridCellCoord>) => void;
  excludeAllCells: () => void;
  excludeEdgeCells: () => void;
  resetExcludedCells: () => void;
  visibleCounts: {
    included: number;
    excluded: number;
  };
  openImage: (file: File) => Promise<void>;
  saveCurrent: () => Promise<boolean>;
};
export function useDemoAlignState(): DemoAlignState {
  const [fileName, setFileName] = useState<string | null>(null);
  const [frameLoading, setFrameLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [contrast, setContrast] = useState<ContrastWindow | null>(null);
  const [frame, setFrame] = useState<FrameResult | null>(null);
  const [grid, setGrid] = useState<AlignGridState>(() => ({
    ...createDefaultAlignGrid(),
    enabled: true,
  }));
  const [toolMode, setToolMode] = useState<AlignGridToolMode>("pan");
  const [patternZoomLocked, setPatternZoomLocked] = useState(false);
  const [excludedCells, setExcludedCellsState] = useState<AlignGridCellCoord[]>([]);
  const setExcludedCells = (cells: Iterable<AlignGridCellCoord>) => {
    setExcludedCellsState(Array.from(cells));
  };
  const resetExcludedCells = () => {
    setExcludedCellsState([]);
  };
  const excludeAllCells = () => {
    if (!frame) return;
    setExcludedCellsState(
      enumerateVisibleAlignGridCells(frame, grid).map(({ i, j }) => ({
        i,
        j,
      })),
    );
  };
  const excludeEdgeCells = () => {
    if (!frame) return;
    setExcludedCellsState((current) =>
      mergeExcludedAlignGridCells(current, collectAlignGridEdgeCells(frame, grid)),
    );
  };
  const visibleCounts = frame
    ? countVisibleAlignGridCells(frame, grid, excludedCells)
    : {
        included: 0,
        excluded: 0,
      };
  const openImage = async (file: File) => {
    setFrameLoading(true);
    setError(null);
    setStatus("Loading image");
    try {
      const nextFrame = await loadImageFile(file);
      setFileName(file.name);
      setFrame(nextFrame);
      setContrast(null);
      setExcludedCellsState([]);
      setGrid({
        ...createDefaultAlignGrid(),
        enabled: true,
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
  const saveCurrent = async () => {
    if (!frame || !fileName) return false;
    const { included } = countVisibleAlignGridCells(frame, grid, excludedCells);
    if (included === 0) {
      setError("All grid cells are excluded — adjust exclusions before saving.");
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      const stem = stemName(fileName);
      downloadText(`${stem}.bbox.csv`, buildBboxCsv(frame, grid, excludedCells));
      downloadJson(`${stem}.align.json`, alignStateFromCurrent(grid, excludedCells));
      setStatus(`Downloaded ${stem}.bbox.csv and ${stem}.align.json`);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return false;
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
    contrast,
    setContrast,
    frame,
    grid,
    setGrid,
    toolMode,
    setToolMode,
    patternZoomLocked,
    setPatternZoomLocked,
    excludedCells,
    setExcludedCells,
    excludeAllCells,
    excludeEdgeCells,
    resetExcludedCells,
    visibleCounts,
    openImage,
    saveCurrent,
  };
}

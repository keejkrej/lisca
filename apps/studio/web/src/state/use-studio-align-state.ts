import type {
  AlignGridCellCoord,
  AlignGridState,
  AlignerSource,
  ContrastWindow,
  CropRoiProgress,
  FrameRequest,
  SavedAlignState,
  WorkspaceScan,
} from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { runCropRoi } from "@lisca/client/align-session";
import { useAlignSessionCore } from "@lisca/client/align-session/solid";
import { useCanvasResourceTransaction } from "@lisca/ui/features";
import {
  alignStateFromCurrent,
  buildBboxCsv,
  collectAlignGridEdgeCells,
  countVisibleAlignGridCells,
  createDefaultAlignGrid,
  mergeExcludedAlignGridCells,
  type AlignGridToolMode,
} from "@lisca/utils";
import { Effect } from "effect";
import { useNavigate } from "@tanstack/solid-router";
import type { Atom } from "@effect-atom/atom-solid";
import { RegistryContext, useAtom } from "@effect-atom/atom-solid";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  useContext,
  type Accessor,
} from "solid-js";
import { studioClient, toErrorMessage } from "../api/studio-port";
import { studioNavigate } from "../navigation/use-studio-navigate";
import { scanIdleAtom, scanSourceAtom } from "../atoms/studio-query-atoms";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";
import { isDoneCropStatus } from "@lisca/client/crop-status";
import { runClientEffect } from "@lisca/client/runtime";
import {
  lockedStudioSelection,
  studioMaskChannel,
  toStudioSource,
} from "@lisca/client/studio/source";
import {
  collectAssayPositions,
  filterScanPositionsForAssay,
} from "@lisca/client/studio/sample-positions";
import {
  savedAlignStateKey,
  sourceKey,
  studioAlignUiActions,
  studioAlignUiAtom,
  type ExcludedByPosition,
} from "./studio-align-store";
import { useStudioStore } from "./studio-store";

const nextExclusionPreviewMs = 1000;
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export type StudioAlignState = {
  workspacePath: string | null;
  source: AlignerSource | null;
  scan: WorkspaceScan | null;
  alignPositions: number[];
  scanLoading: boolean;
  frameLoading: boolean;
  error: string | null;
  selection: FrameRequest;
  setSelection: (patch: Partial<FrameRequest>) => void;
  contrast: ContrastWindow | null;
  setContrast: (contrast: ContrastWindow | null) => void;
  frame: FrameResult | null;
  grid: AlignGridState;
  setGrid: (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) => void;
  toolMode: AlignGridToolMode;
  setToolMode: (mode: AlignGridToolMode) => void;
  patternZoomLocked: boolean;
  setPatternZoomLocked: (locked: boolean) => void;
  excludedCellsByPosition: ExcludedByPosition;
  setExcludedCellsForCurrentPosition: (cells: Iterable<AlignGridCellCoord>) => void;
  currentExcludedCells: AlignGridCellCoord[];
  displayedExcludedCells: AlignGridCellCoord[];
  visibleCounts: {
    included: number;
    excluded: number;
  };
  saving: boolean;
  cropping: boolean;
  cropProgress: CropRoiProgress | null;
  cropStartConfirm: CropStartConfirmState | null;
  cropConfirm: CropConfirmState | null;
  findingFirstUnaligned: boolean;
  status: string | null;
  canGoBack: boolean;
  goBack: () => void;
  resetCurrent: () => void;
  goToFirstUnaligned: () => Promise<void>;
  startConfirmedCrop: () => void;
  cancelCropStartConfirm: () => void;
  confirmCropOverwrite: () => void;
  skipExistingCrop: () => void;
  cancelCropConfirm: () => void;
  cancelCrop: () => Promise<void>;
  applySmartExclusion: (modelCells: AlignGridCellCoord[]) => void;
  saveAndAdvanceWithModelCells: (modelCells: AlignGridCellCoord[]) => Promise<boolean>;
  reportError: (message: string | null) => void;
};
export type CropStartConfirmState = {
  positions: number[];
};
export type CropConfirmState = {
  positions: number[];
  existingPositions: number[];
};
export function useStudioAlignState(): StudioAlignState {
  const info1 = useStudioStore((state) => state.info1);
  const info3 = useStudioStore((state) => state.info3);
  const dataSourceKind = useStudioStore((state) => state.dataSourceKind);
  const [ui, setUi] = useAtom(studioAlignUiAtom);
  const setSelection = (patch: Partial<FrameRequest>) =>
    studioAlignUiActions.setSelection(setUi, patch);
  const setContrast = (next: ContrastWindow | null) =>
    studioAlignUiActions.setContrast(setUi, next);
  const setGrid = (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) =>
    studioAlignUiActions.setGrid(setUi, next);
  const setToolMode = (mode: AlignGridToolMode) => studioAlignUiActions.setToolMode(setUi, mode);
  const setPatternZoomLocked = (locked: boolean) =>
    studioAlignUiActions.setPatternZoomLocked(setUi, locked);
  const setExcludedCellsForCurrentPosition = (cells: Iterable<AlignGridCellCoord>) =>
    studioAlignUiActions.setExcludedCellsForCurrentPosition(setUi, cells);
  const setSaving = (next: boolean) => studioAlignUiActions.setSaving(setUi, next);
  const setError = (next: string | null) => studioAlignUiActions.setError(setUi, next);
  const setStatus = (next: string | null) => studioAlignUiActions.setStatus(setUi, next);
  const [findingFirstUnaligned, setFindingFirstUnaligned] = createSignal(false);
  const [cropProgress, setCropProgress] = createSignal<CropRoiProgress | null>(null);
  const [cropStartConfirm, setCropStartConfirm] = createSignal<CropStartConfirmState | null>(null);
  const [cropConfirm, setCropConfirm] = createSignal<CropConfirmState | null>(null);
  let cropRequestIdRef: string | null = null;
  const loadCanvasResources = useCanvasResourceTransaction();
  const activeSource = createMemo(() => toStudioSource(dataSourceKind(), info1()));
  const activeWorkspacePath = createMemo(() => info1().saveTo.trim() || null);
  const maskChannel = createMemo(() => studioMaskChannel(info3()));
  const assayPositions = createMemo(() => collectAssayPositions(info3()));
  const alignPositions = createMemo(() => {
    const scan = ui().scan;
    if (!scan) return [];
    return filterScanPositionsForAssay(scan.positions, assayPositions());
  });
  const lockedSelection = createMemo(() => {
    const scan = ui().scan;
    if (!scan) return ui().selection;
    return lockedStudioSelection(scan, ui().selection, maskChannel(), alignPositions());
  });
  const activeSourceKey = createMemo(() => sourceKey(ui().source));
  const scanResult = useSelectedAtomValue(() => {
    const key = activeSourceKey();
    return key ? scanSourceAtom(key) : scanIdleAtom;
  });
  const navigate = useNavigate();
  const session = useAlignSessionCore({
    ui,
    setUi,
    actions: studioAlignUiActions,
    scan: {
      scanResult,
      activeSourceKey,
    },
    toErrorMessage,
    effectiveSelection: lockedSelection,
  });
  const applySmartExclusion = (modelCells: AlignGridCellCoord[]) => {
    const frame = ui().frame;
    const grid = ui().grid;
    if (!frame) return;
    const currentExcludedCells = session.derived().currentExcludedCells;
    const edgeCells = collectAlignGridEdgeCells(frame, grid);
    const finalExcludedCells = mergeExcludedAlignGridCells(currentExcludedCells, [
      ...edgeCells,
      ...modelCells,
    ]);
    setExcludedCellsForCurrentPosition(finalExcludedCells);
    setStatus(`Smart excluded ${finalExcludedCells.length - currentExcludedCells.length} cells`);
  };
  const positionIndex = () => alignPositions().indexOf(lockedSelection().pos);
  const canGoBack = () => positionIndex() > 0;
  const goBack = () => {
    if (ui().saving || positionIndex() <= 0) return;
    setSelection({
      pos: alignPositions()[positionIndex() - 1],
    });
  };
  const resetCurrent = () => {
    if (ui().saving) return;
    setGrid({
      ...createDefaultAlignGrid(),
      enabled: true,
    });
    setExcludedCellsForCurrentPosition([]);
    setStatus(`Reset Pos${lockedSelection().pos}`);
  };
  const goToFirstUnaligned = async () => {
    const workspacePath = ui().workspacePath;
    const positions = alignPositions();
    if (!workspacePath || positions.length === 0 || ui().saving || findingFirstUnaligned()) return;
    setFindingFirstUnaligned(true);
    setError(null);
    try {
      setStatus("Finding jump target");
      const savedPositions = new Set(
        await runClientEffect(studioClient.listSavedBboxPositions(workspacePath)),
      );
      const firstUnaligned = positions.find((pos) => !savedPositions.has(pos));
      if (firstUnaligned == null) {
        const lastPos = positions.at(-1);
        if (lastPos == null) {
          setStatus("No positions in assay scope");
          return;
        }
        setSelection({
          pos: lastPos,
        });
        setStatus(`Jumped to Pos${lastPos}`);
        return;
      }
      setSelection({
        pos: firstUnaligned,
      });
      setStatus(`Jumped to Pos${firstUnaligned}`);
    } catch (cause) {
      setError(toErrorMessage(cause, "Saved position scan failed"));
    } finally {
      setFindingFirstUnaligned(false);
    }
  };
  const advanceToNextPosition = () => {
    const positions = alignPositions();
    const currentIndex = positions.indexOf(lockedSelection().pos);
    const nextPos = currentIndex >= 0 ? positions[currentIndex + 1] : null;
    if (nextPos == null) return false;
    setSelection({
      pos: nextPos,
    });
    return true;
  };
  const runCrop = async (positions: number[], overwrite: boolean) => {
    const workspacePath = ui().workspacePath;
    const source = ui().source;
    if (!workspacePath || !source || positions.length === 0) return;
    const requestId = `studio-crop-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cropRequestIdRef = requestId;
    setError(null);
    await runCropRoi({
      client: studioClient,
      request: {
        requestId,
        workspacePath,
        source,
        positions,
        overwrite,
        outputFormat: "tiff",
      },
      onProgress: setCropProgress,
      onError: setError,
      onCompleted: (progress) => {
        setStatus(progress.message ?? "Crop completed");
        studioNavigate(navigate, "/annotate");
      },
      toErrorMessage,
    });
  };
  const cropBatchWithOverwriteCheck = async (positions: number[]) => {
    const workspacePath = ui().workspacePath;
    if (!workspacePath || positions.length === 0) return;
    const existing = await runClientEffect(
      Effect.all(
        positions.map((pos) =>
          studioClient.roiPosExists(workspacePath, pos).pipe(
            Effect.map((exists) => ({
              pos,
              exists,
            })),
          ),
        ),
      ).pipe(
        Effect.map((entries) => entries.filter((entry) => entry.exists).map((entry) => entry.pos)),
      ),
    );
    if (existing.length > 0) {
      setCropConfirm({
        positions,
        existingPositions: existing,
      });
      return;
    }
    await runCrop(positions, false);
  };
  const maybeCropWhenAllPositionsSaved = async () => {
    const workspacePath = ui().workspacePath;
    const positions = alignPositions();
    if (!workspacePath || positions.length === 0) return;
    const savedPositions = new Set(
      await runClientEffect(studioClient.listSavedBboxPositions(workspacePath)),
    );
    const allPositionsSaved = positions.every((pos) => savedPositions.has(pos));
    if (!allPositionsSaved) return;
    setCropStartConfirm({
      positions,
    });
  };
  const startConfirmedCrop = () => {
    const next = cropStartConfirm();
    if (!next) return;
    setCropStartConfirm(null);
    void cropBatchWithOverwriteCheck(next.positions);
  };
  const cancelCropStartConfirm = () => {
    setCropStartConfirm(null);
  };
  const confirmCropOverwrite = () => {
    const next = cropConfirm();
    if (!next) return;
    setCropConfirm(null);
    void runCrop(next.positions, true);
  };
  const skipExistingCrop = () => {
    const next = cropConfirm();
    if (!next) return;
    setCropConfirm(null);
    const existing = new Set(next.existingPositions);
    const remaining = next.positions.filter((pos) => !existing.has(pos));
    if (remaining.length === 0) {
      setStatus(`Skipped ${next.existingPositions.length} existing ROI output(s)`);
      studioNavigate(navigate, "/annotate");
      return;
    }
    void runCrop(remaining, false);
  };
  const cancelCropConfirm = () => {
    setCropConfirm(null);
  };
  const cancelCrop = async () => {
    const requestId = cropRequestIdRef;
    if (!requestId) return;
    setCropProgress(await runClientEffect(studioClient.cancelCropRoi(requestId)));
  };
  const saveAndAdvanceWithModelCells = async (modelCells: AlignGridCellCoord[]) => {
    const workspacePath = ui().workspacePath;
    const frame = ui().frame;
    const grid = ui().grid;
    if (!workspacePath || !frame) return false;
    const currentExcludedCells = session.derived().currentExcludedCells;
    const edgeCells = collectAlignGridEdgeCells(frame, grid);
    const finalExcludedCells = mergeExcludedAlignGridCells(currentExcludedCells, [
      ...edgeCells,
      ...modelCells,
    ]);
    const { included } = countVisibleAlignGridCells(frame, grid, finalExcludedCells);
    if (included === 0) {
      setError("All grid cells are excluded — adjust exclusions before saving.");
      return false;
    }
    setSaving(true);
    setError(null);
    let advanced = false;
    try {
      setExcludedCellsForCurrentPosition(finalExcludedCells);
      const csv = buildBboxCsv(frame, grid, finalExcludedCells);
      const alignState = alignStateFromCurrent(grid, finalExcludedCells);
      const result = await runClientEffect(
        studioClient.saveBbox(workspacePath, lockedSelection().pos, csv, alignState),
      );
      if (!result.ok) throw new Error(result.error ?? "Save failed");
      setStatus(`Saved bbox/Pos${lockedSelection().pos}.csv`);
    } catch (cause) {
      setError(toErrorMessage(cause, "Save failed"));
      return false;
    } finally {
      setSaving(false);
    }
    advanced = advanceToNextPosition();
    if (!advanced) {
      await maybeCropWhenAllPositionsSaved();
      return true;
    }
    await delay(nextExclusionPreviewMs);
    return true;
  };
  createEffect(() => {
    studioAlignUiActions.setWorkspacePath(setUi, activeWorkspacePath());
  });
  createEffect(() => {
    studioAlignUiActions.setSource(setUi, activeSource());
  });
  createEffect(() => {
    const scan = ui().scan;
    const positions = alignPositions();
    if (!scan) return;
    if (positions.length === 0) {
      studioAlignUiActions.setError(
        setUi,
        "No assay positions found in source scan — check position ranges in basic info",
      );
      return;
    }
    const skipped = assayPositions().length - positions.length;
    if (skipped > 0) {
      studioAlignUiActions.setStatus(
        setUi,
        `${skipped} assay position(s) not found in source scan`,
      );
    }
  });
  createEffect(() => {
    const scan = ui().scan;
    if (!scan) return;
    const selection = ui().selection;
    const locked = lockedSelection();
    if (
      selection.pos === locked.pos &&
      selection.channel === locked.channel &&
      selection.time === locked.time &&
      selection.z === locked.z
    ) {
      return;
    }
    studioAlignUiActions.setSelection(setUi, locked);
  });
  createEffect(() => {
    const source = ui().source;
    const scan = ui().scan;
    const positions = alignPositions();
    const workspacePath = ui().workspacePath;
    const locked = lockedSelection();
    if (!source || !scan || positions.length === 0) {
      studioAlignUiActions.setFrameLoading(setUi, false);
      return;
    }
    const alignStateKey = workspacePath
      ? savedAlignStateKey(workspacePath, locked.pos)
      : null;
    const cleanup = loadCanvasResources({
      start: () => {
        studioAlignUiActions.setContrast(setUi, null);
        studioAlignUiActions.setFrameLoading(setUi, true);
        studioAlignUiActions.setError(setUi, null);
        studioAlignUiActions.setStatus(setUi, "Loading frame");
      },
      load: (signal) =>
        runClientEffect(
          Effect.all([
            loadFrameEffect(studioClient, source, locked, null),
            workspacePath
              ? studioClient.loadAlignState(workspacePath, locked.pos)
              : Effect.succeed(null as SavedAlignState | null),
          ]),
          {
            signal,
          },
        ),
      commit: ([nextFrame, savedAlignState]) => {
        studioAlignUiActions.applyLoadedFrame(
          setUi,
          locked,
          nextFrame,
          alignStateKey
            ? {
                stateKey: alignStateKey,
                pos: locked.pos,
                saved: savedAlignState,
              }
            : null,
        );
      },
      reject: (cause) => {
        studioAlignUiActions.setFrame(setUi, null);
        studioAlignUiActions.setError(
          setUi,
          cause instanceof Error && cause.message.startsWith("Frame request failed")
            ? effectErrorMessage(cause)
            : toErrorMessage(cause, "Frame or saved align state load failed"),
        );
      },
      settle: () => studioAlignUiActions.setFrameLoading(setUi, false),
    });
    onCleanup(cleanup);
  });
  createEffect(() => {
    const contrast = ui().contrast;
    const source = ui().source;
    const scan = ui().scan;
    const positions = alignPositions();
    const locked = lockedSelection();
    if (!contrast || !source || !scan || positions.length === 0) {
      return;
    }
    const cleanup = loadCanvasResources({
      start: () => {
        studioAlignUiActions.setFrameLoading(setUi, true);
        studioAlignUiActions.setError(setUi, null);
      },
      load: (signal) =>
        runClientEffect(loadFrameEffect(studioClient, source, locked, contrast), {
          signal,
        }),
      commit: (nextFrame) => {
        studioAlignUiActions.setFrame(setUi, nextFrame);
        studioAlignUiActions.setStatus(setUi, null);
      },
      reject: (cause) => {
        studioAlignUiActions.setError(
          setUi,
          cause instanceof Error && cause.message.startsWith("Frame request failed")
            ? effectErrorMessage(cause)
            : toErrorMessage(cause, "Frame contrast update failed"),
        );
      },
      settle: () => studioAlignUiActions.setFrameLoading(setUi, false),
    });
    onCleanup(cleanup);
  });
  return {
    get workspacePath() {
      return ui().workspacePath;
    },
    get source() {
      return ui().source;
    },
    get scan() {
      return ui().scan;
    },
    get alignPositions() {
      return alignPositions();
    },
    get scanLoading() {
      return session.meta().scanLoading;
    },
    get frameLoading() {
      return ui().frameLoading;
    },
    get error() {
      return ui().error;
    },
    get selection() {
      return lockedSelection();
    },
    setSelection,
    get contrast() {
      return ui().contrast;
    },
    setContrast,
    get frame() {
      return ui().frame;
    },
    get grid() {
      return ui().grid;
    },
    setGrid,
    get toolMode() {
      return ui().toolMode;
    },
    setToolMode,
    get patternZoomLocked() {
      return ui().patternZoomLocked;
    },
    setPatternZoomLocked,
    get excludedCellsByPosition() {
      return ui().excludedCellsByPosition;
    },
    setExcludedCellsForCurrentPosition,
    get currentExcludedCells() {
      return session.derived().currentExcludedCells;
    },
    get displayedExcludedCells() {
      return session.derived().displayedExcludedCells;
    },
    get visibleCounts() {
      return session.derived().visibleCounts;
    },
    get saving() {
      return ui().saving;
    },
    get cropping() {
      const progress = cropProgress();
      return progress != null && !isDoneCropStatus(progress.status);
    },
    get cropProgress() {
      return cropProgress();
    },
    get cropStartConfirm() {
      return cropStartConfirm();
    },
    get cropConfirm() {
      return cropConfirm();
    },
    get findingFirstUnaligned() {
      return findingFirstUnaligned();
    },
    get status() {
      return ui().status;
    },
    get canGoBack() {
      return canGoBack();
    },
    goBack,
    resetCurrent,
    goToFirstUnaligned,
    startConfirmedCrop,
    cancelCropStartConfirm,
    confirmCropOverwrite,
    skipExistingCrop,
    cancelCropConfirm,
    cancelCrop,
    applySmartExclusion,
    saveAndAdvanceWithModelCells,
    reportError: setError,
  };
}

function useSelectedAtomValue<A>(selectAtom: () => Atom.Atom<A>): Accessor<A> {
  const registry = useContext(RegistryContext);
  const [value, setValue] = createSignal(registry.get(selectAtom()));
  createEffect(() => {
    const atom = selectAtom();
    setValue(() => registry.get(atom));
    onCleanup(registry.subscribe(atom, setValue as (next: A) => void));
  });
  return value;
}
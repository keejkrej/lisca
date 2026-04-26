import { createStore } from "zustand/vanilla";

import type { RoiPositionScan, RoiWorkspaceScan } from "lisca/shared/contracts";
import { type StateUpdater, resolveStateUpdater } from "./updater";

export interface RoiSelection {
  pos: number;
  channel: number;
  time: number;
  z: number;
}

export interface RoiStoreState {
  scan: RoiWorkspaceScan | null;
  selection: RoiSelection | null;
  loading: boolean;
  error: string | null;
  pageIndex: number;
  selectedRoi: number | null;
}

function getPositionScan(scan: RoiWorkspaceScan | null, pos: number | null): RoiPositionScan | null {
  if (!scan || pos == null) return null;
  return scan.positions.find((entry) => entry.pos === pos) ?? null;
}

function createSelection(position: RoiPositionScan, initial?: Partial<RoiSelection>): RoiSelection {
  return {
    pos: initial?.pos ?? position.pos,
    channel: initial?.channel ?? position.channels[0] ?? 0,
    time: initial?.time ?? position.times[0] ?? 0,
    z: initial?.z ?? position.zSlices[0] ?? 0,
  };
}

function coerceSelection(scan: RoiWorkspaceScan, selection: RoiSelection | null): RoiSelection | null {
  const fallbackPosition = scan.positions[0];
  if (!fallbackPosition) return null;

  const position = getPositionScan(scan, selection?.pos ?? fallbackPosition.pos) ?? fallbackPosition;
  return {
    pos: position.pos,
    channel: position.channels.includes(selection?.channel ?? position.channels[0] ?? 0)
      ? (selection?.channel ?? position.channels[0] ?? 0)
      : (position.channels[0] ?? 0),
    time: position.times.includes(selection?.time ?? position.times[0] ?? 0)
      ? (selection?.time ?? position.times[0] ?? 0)
      : (position.times[0] ?? 0),
    z: position.zSlices.includes(selection?.z ?? position.zSlices[0] ?? 0)
      ? (selection?.z ?? position.zSlices[0] ?? 0)
      : (position.zSlices[0] ?? 0),
  };
}

function createInitialState(): RoiStoreState {
  return {
    scan: null,
    selection: null,
    loading: false,
    error: null,
    pageIndex: 0,
    selectedRoi: null,
  };
}

export const roiStore = createStore<RoiStoreState>(() => createInitialState());

export function resetRoiState() {
  roiStore.setState(createInitialState());
}

export function patchRoiState(patch: Partial<RoiStoreState>) {
  roiStore.setState((state) => ({ ...state, ...patch }));
}

export function setRoiScan(scan: RoiWorkspaceScan | null) {
  roiStore.setState((state) => ({
    ...state,
    scan,
    selection: scan ? coerceSelection(scan, state.selection) : null,
    pageIndex: 0,
    selectedRoi: null,
  }));
}

export function setRoiSelectionKey<K extends keyof RoiSelection>(
  key: K,
  value: RoiSelection[K],
) {
  roiStore.setState((state) => {
    if (!state.scan || !state.selection) return state;

    if (key === "pos") {
      const nextPosition = getPositionScan(state.scan, value as number);
      if (!nextPosition) return state;
      return {
        ...state,
        selection: createSelection(nextPosition),
        pageIndex: 0,
        selectedRoi: null,
      };
    }

    const nextSelection = { ...state.selection, [key]: value };
    return {
      ...state,
      selection: coerceSelection(state.scan, nextSelection) ?? nextSelection,
    };
  });
}

export function setRoiPageIndex(pageIndex: number | ((current: number) => number)) {
  roiStore.setState((state) => ({
    ...state,
    pageIndex: resolveStateUpdater(state.pageIndex, pageIndex),
  }));
}

export function setSelectedRoi(selectedRoi: number | null) {
  roiStore.setState((state) => ({ ...state, selectedRoi }));
}

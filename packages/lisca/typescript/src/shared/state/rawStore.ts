import { createStore } from "zustand/vanilla";

import type { ViewerSelection, ViewerSource, WorkspaceScan } from "lisca/shared/contracts";
import { coerceSelection, createSelection } from "lisca/shared/core";
import { type StateUpdater, resolveStateUpdater } from "./updater";

export interface RawStoreState {
  source: ViewerSource | null;
  boundSource: ViewerSource | null;
  scan: WorkspaceScan | null;
  selection: ViewerSelection | null;
  loading: boolean;
  error: string | null;
}

function createInitialState(): RawStoreState {
  return {
    source: null,
    boundSource: null,
    scan: null,
    selection: null,
    loading: false,
    error: null,
  };
}

export const rawStore = createStore<RawStoreState>(() => createInitialState());

export function resetRawState() {
  rawStore.setState(createInitialState());
}

export function patchRawState(patch: Partial<RawStoreState>) {
  rawStore.setState((state) => ({ ...state, ...patch }));
}

export function setBoundRawSource(source: ViewerSource | null) {
  rawStore.setState((state) => ({
    ...state,
    boundSource: source,
  }));
}

export function setRawSource(source: ViewerSource | null) {
  rawStore.setState((state) => ({
    ...state,
    source,
    scan: null,
    selection: null,
    loading: false,
    error: null,
  }));
}

export function setRawScan(scan: WorkspaceScan | null) {
  rawStore.setState((state) => ({
    ...state,
    scan,
    selection: scan ? coerceSelection(scan, state.selection ?? createSelection(scan)) : null,
  }));
}

export function setRawSelectionKey<K extends keyof ViewerSelection>(
  key: K,
  value: ViewerSelection[K],
) {
  rawStore.setState((state) => {
    if (!state.scan || !state.selection) return state;
    const nextSelection = { ...state.selection, [key]: value };
    return {
      ...state,
      selection: coerceSelection(state.scan, nextSelection),
    };
  });
}

export function updateRawSelection(
  selection: StateUpdater<ViewerSelection | null>,
) {
  rawStore.setState((state) => ({
    ...state,
    selection: resolveStateUpdater(state.selection, selection),
  }));
}

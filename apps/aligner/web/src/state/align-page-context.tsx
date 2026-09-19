import { runClientEffect } from "@lisca/client/runtime";
import { createRequestSmartExcludeProvider, useSmartExclude } from "@lisca/smart/exclude/request";
import { mergeExcludedAlignGridCells } from "@lisca/utils";
import { createContext, useContext, type Accessor, type JSX } from "solid-js";

import { alignerClient } from "../api/aligner-port";
import { useAlignState, type AlignState } from "./use-align-state";

type AlignPageMeta = {
  scanLoading: boolean;
  frameLoading: boolean;
  saving: boolean;
  cropping: boolean;
};

type AlignPageContextValue = {
  state: Accessor<AlignState>;
  smartExclude: ReturnType<typeof useSmartExclude>;
  actions: Pick<
    AlignState,
    "setSource" | "setSelection" | "setContrast" | "setGrid" | "setToolMode"
  >;
  meta: AlignPageMeta;
};

const AlignPageContext = createContext<AlignPageContextValue | null>(null);

export function AlignPageProvider(props: { children?: JSX.Element }) {
  const state = useAlignState();
  const smartExcludeProvider = createRequestSmartExcludeProvider(
    {
      smartExclude: (request, signal) =>
        runClientEffect(alignerClient.smartExclude(request), signal ? { signal } : undefined),
    },
    {
      source: () => state().source,
      selection: () => state().selection,
      contrast: () => state().contrast,
      workspacePath: () => state().workspacePath,
    },
  );
  const smartExclude = useSmartExclude({
    provider: smartExcludeProvider,
    frame: () => state().frame,
    grid: () => state().grid,
    currentExcludedCells: () => state().currentExcludedCells,
    enabled: () => Boolean(state().frame) && !state().saving,
    workspacePath: () => state().workspacePath,
    occupancyRescore: () => "onRecord",
    onComplete: (cells) => state().applySmartExclusion(cells),
    onOccupancyRescore: (modelCells) => {
      if (modelCells.length === 0) return;
      const current = state();
      current.setExcludedCellsForCurrentPosition(
        mergeExcludedAlignGridCells(current.currentExcludedCells, modelCells),
      );
    },
    onError: (error) => state().reportError(error),
    onStatus: (status) => state().reportStatus(status),
  });

  const value: AlignPageContextValue = {
    state,
    smartExclude,
    actions: {
      setSource: (source) => state().setSource(source),
      setSelection: (patch) => state().setSelection(patch),
      setContrast: (contrast) => state().setContrast(contrast),
      setGrid: (next) => state().setGrid(next),
      setToolMode: (mode) => state().setToolMode(mode),
    },
    meta: {
      get scanLoading() {
        return state().scanLoading;
      },
      get frameLoading() {
        return state().frameLoading;
      },
      get saving() {
        return state().saving;
      },
      get cropping() {
        return state().cropping;
      },
    },
  };

  return <AlignPageContext.Provider value={value}>{props.children}</AlignPageContext.Provider>;
}

export function useAlignPage(): AlignPageContextValue {
  const value = useContext(AlignPageContext);
  if (!value) {
    throw new Error("useAlignPage must be used within AlignPageProvider");
  }
  return value;
}

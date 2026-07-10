import { createContext, useContext, type Accessor, type JSX } from "solid-js";

import { useAlignState, type AlignState } from "./use-align-state";

type AlignPageMeta = {
  scanLoading: boolean;
  frameLoading: boolean;
  saving: boolean;
  cropping: boolean;
};

type AlignPageContextValue = {
  state: Accessor<AlignState>;
  actions: Pick<
    AlignState,
    "setSource" | "setSelection" | "setContrast" | "setGrid" | "setToolMode"
  >;
  meta: AlignPageMeta;
};

const AlignPageContext = createContext<Accessor<AlignState> | null>(null);

export function AlignPageProvider(props: { children?: JSX.Element }) {
  const state = useAlignState();
  return <AlignPageContext.Provider value={state}>{props.children}</AlignPageContext.Provider>;
}

export function useAlignPage(): AlignPageContextValue {
  const state = useContext(AlignPageContext);
  if (!state) {
    throw new Error("useAlignPage must be used within AlignPageProvider");
  }
  return {
    state,
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
}
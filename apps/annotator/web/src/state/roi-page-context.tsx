import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useRoiPageState } from "./use-roi-page-state";

type RoiPageState = ReturnType<typeof useRoiPageState>;

type RoiPageContextValue = {
  page: RoiPageState;
};

const RoiPageContext = createContext<RoiPageContextValue | null>(null);

export function RoiPageProvider({ children }: { children: ReactNode }) {
  const page = useRoiPageState();
  const value = useMemo(() => ({ page }), [page]);
  return <RoiPageContext.Provider value={value}>{children}</RoiPageContext.Provider>;
}

export function useRoiPage(): RoiPageContextValue {
  const context = useContext(RoiPageContext);
  if (!context) {
    throw new Error("useRoiPage must be used within RoiPageProvider");
  }
  return context;
}

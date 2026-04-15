import { createContext, useContext, type ReactNode } from "react";

import type { RoiAnnotationContextValue } from "./useRoiAnnotation";
import { useRoiAnnotation } from "./useRoiAnnotation";
import type { RoiAnnotationControllerProps } from "./types";

const RoiAnnotationContext = createContext<RoiAnnotationContextValue | null>(null);

export function RoiAnnotationProvider({
  children,
  ...props
}: RoiAnnotationControllerProps & { children: ReactNode }) {
  const value = useRoiAnnotation(props);
  return (
    <RoiAnnotationContext.Provider value={value}>{children}</RoiAnnotationContext.Provider>
  );
}

export function useRoiAnnotationContext(): RoiAnnotationContextValue {
  const value = useContext(RoiAnnotationContext);
  if (!value) {
    throw new Error("useRoiAnnotationContext must be used within RoiAnnotationProvider");
  }
  return value;
}

import { create } from "zustand";

import type { AnnotationMode } from "lisca/shared/contracts";

export interface AnnotationModeState {
  mode: AnnotationMode;
  setMode: (mode: AnnotationMode) => void;
}

export const useAnnotationModeStore = create<AnnotationModeState>((set) => ({
  mode: "semantic",
  setMode: (mode) => set({ mode }),
}));

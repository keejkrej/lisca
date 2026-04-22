import { create } from "zustand";

type StudioState = {
  count: number;
  increment: () => void;
};

export const useStudioStore = create<StudioState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

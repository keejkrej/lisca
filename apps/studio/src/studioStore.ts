import { create } from "zustand";

export type StudioStep = "welcome" | "info1" | "info2";

/** Assay options shown on the welcome step (ids are stable for persistence later). */
export type AssayId =
  | "gene-expression"
  | "immune-killing"
  | "lnp-binding"
  | "custom-assay";

export type BasicInfoStep1 = {
  studyName: string;
  operatorName: string;
  /** Instrument or device id for the run. */
  instrumentId: string;
  /** Reagent or kit lot reference. */
  lotId: string;
};

export type BasicInfoStep2 = {
  sampleId: string;
  runNotes: string;
};

type StudioState = {
  step: StudioStep;
  assayId: AssayId | null;
  info1: BasicInfoStep1;
  info2: BasicInfoStep2;
  setStep: (step: StudioStep) => void;
  setAssayId: (id: AssayId | null) => void;
  setInfo1: (patch: Partial<BasicInfoStep1>) => void;
  setInfo2: (patch: Partial<BasicInfoStep2>) => void;
  goNext: () => void;
  goBack: () => void;
  submit: () => void;
};

const initialInfo1: BasicInfoStep1 = {
  studyName: "",
  operatorName: "",
  instrumentId: "",
  lotId: "",
};
const initialInfo2: BasicInfoStep2 = { sampleId: "", runNotes: "" };

export const useStudioStore = create<StudioState>((set, get) => ({
  step: "welcome",
  assayId: null,
  info1: { ...initialInfo1 },
  info2: { ...initialInfo2 },

  setStep: (step) => set({ step }),

  setAssayId: (assayId) => set({ assayId }),

  setInfo1: (patch) =>
    set((s) => ({
      info1: { ...s.info1, ...patch },
    })),

  setInfo2: (patch) =>
    set((s) => ({
      info2: { ...s.info2, ...patch },
    })),

  goNext: () => {
    const { step, assayId, info1 } = get();
    if (step === "welcome") {
      if (!assayId) return;
      set({ step: "info1" });
      return;
    }
    if (step === "info1") {
      if (
        !info1.studyName.trim() ||
        !info1.operatorName.trim() ||
        !info1.instrumentId.trim() ||
        !info1.lotId.trim()
      ) {
        return;
      }
      set({ step: "info2" });
    }
  },

  goBack: () => {
    const { step } = get();
    if (step === "info1") set({ step: "welcome" });
    else if (step === "info2") set({ step: "info1" });
  },

  submit: () => {
    const { assayId, info1, info2 } = get();
    if (!assayId || !info2.sampleId.trim()) return;
    console.info("studio.submit", { assayId, info1, info2 });
  },
}));

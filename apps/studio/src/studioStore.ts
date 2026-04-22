import { create } from "zustand";

export type StudioStep = "welcome" | "info1" | "info2" | "alignPattern";

/** Assay options shown on the welcome step (ids are stable for persistence later). */
export type AssayId =
  | "gene-expression"
  | "immune-killing"
  | "lnp-binding"
  | "custom-assay";

/** Same strings as the choose-assay tiles (`WelcomeAssay`). */
export const ASSAY_CHOICE_LABEL: Record<AssayId, string> = {
  "gene-expression": "Gene expression",
  "immune-killing": "Immune killing",
  "lnp-binding": "LNP binding",
  "custom-assay": "Custom assay",
};

/** Centered H1 for basic info — "{choice} assay" except custom (label already includes “assay”). */
export function basicInfoAssayTitle(assayId: AssayId | null): string {
  if (!assayId) return "Assay";
  if (assayId === "custom-assay") return ASSAY_CHOICE_LABEL["custom-assay"];
  return `${ASSAY_CHOICE_LABEL[assayId]} assay`;
}

/** Basic info form fields (names match Figma node 38:382). */
export type BasicInfoStep1 = {
  name: string;
  date: string;
  dataPath: string;
  saveTo: string;
};

/** Feature tile ids — Figma 43:297 gallery (morphology, partcount, partfluor, totalfluor). */
export type BasicInfo2FeatureId = "morphology" | "partcount" | "partfluor" | "totalfluor";

export type TimelapseUnit = "second" | "minute" | "hour";

/** Second basic-info screen — Figma node 43:97. */
export type BasicInfoStep2 = {
  pattern: string;
  timelapseAmount: number | null;
  timelapseUnit: TimelapseUnit;
  selectedFeature: BasicInfo2FeatureId | null;
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
  name: "",
  date: "",
  dataPath: "",
  saveTo: "",
};
const initialInfo2: BasicInfoStep2 = {
  pattern: "",
  timelapseAmount: null,
  timelapseUnit: "minute",
  selectedFeature: null,
};

export const useStudioStore = create<StudioState>((set, get) => ({
  step: "welcome",
  assayId: "custom-assay",
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
    const { step, assayId, info1, info2 } = get();
    if (step === "welcome") {
      if (!assayId) return;
      set({ step: "info1" });
      return;
    }
    if (step === "info1") {
      if (
        !info1.name.trim() ||
        !info1.date.trim() ||
        !info1.dataPath.trim() ||
        !info1.saveTo.trim()
      ) {
        return;
      }
      set({ step: "info2" });
      return;
    }
    if (step === "info2") {
      if (
        !info2.pattern.trim() ||
        info2.timelapseAmount == null ||
        info2.timelapseAmount <= 0 ||
        info2.selectedFeature === null
      ) {
        return;
      }
      set({ step: "alignPattern" });
    }
  },

  goBack: () => {
    const { step } = get();
    if (step === "info1") set({ step: "welcome" });
    else if (step === "info2") set({ step: "info1" });
    else if (step === "alignPattern") set({ step: "info2" });
  },

  submit: () => {
    const { assayId, info1, info2 } = get();
    if (!assayId) return;
    console.info("studio.submit", { assayId, info1, info2 });
  },
}));

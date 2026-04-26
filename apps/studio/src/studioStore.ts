import { create } from "zustand";

export type StudioStep = "welcome" | "info1" | "info2" | "info3" | "alignPattern";

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

/** Slide tile ids — Basic info step 3 (Figma 78:284). */
export type BasicInfoSlideId = "slide-1" | "slide-2" | "slide-3" | "slide-4";

export type BasicInfoSampleRow = {
  channel: string;
  name: string;
  positions: string;
};

/** Third basic-info screen — Figma node 78:284 (Slide + Samples). */
export type BasicInfoStep3 = {
  selectedSlideId: BasicInfoSlideId | null;
  samples: BasicInfoSampleRow[];
};

type StudioState = {
  step: StudioStep;
  assayId: AssayId | null;
  info1: BasicInfoStep1;
  info2: BasicInfoStep2;
  info3: BasicInfoStep3;
  setStep: (step: StudioStep) => void;
  setAssayId: (id: AssayId | null) => void;
  setInfo1: (patch: Partial<BasicInfoStep1>) => void;
  setInfo2: (patch: Partial<BasicInfoStep2>) => void;
  setInfo3: (patch: Partial<BasicInfoStep3>) => void;
  updateInfo3Sample: (index: number, patch: Partial<BasicInfoSampleRow>) => void;
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

const initialInfo3Samples: BasicInfoSampleRow[] = [
  { channel: "0", name: "sample a", positions: "0:10" },
  { channel: "1", name: "sample a", positions: "11:20" },
  { channel: "2", name: "sample a", positions: "21:30" },
  { channel: "3", name: "sample b", positions: "31:40" },
  { channel: "4", name: "sample b", positions: "41:50" },
  { channel: "5", name: "sample b", positions: "51:60" },
];

const initialInfo3: BasicInfoStep3 = {
  selectedSlideId: null,
  samples: initialInfo3Samples.map((r) => ({ ...r })),
};

export const useStudioStore = create<StudioState>((set, get) => ({
  step: "welcome",
  assayId: "custom-assay",
  info1: { ...initialInfo1 },
  info2: { ...initialInfo2 },
  info3: {
    selectedSlideId: initialInfo3.selectedSlideId,
    samples: initialInfo3.samples.map((r) => ({ ...r })),
  },

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

  setInfo3: (patch) =>
    set((s) => ({
      info3: { ...s.info3, ...patch },
    })),

  updateInfo3Sample: (index, patch) =>
    set((s) => {
      const samples = s.info3.samples.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      );
      return { info3: { ...s.info3, samples } };
    }),

  goNext: () => {
    const { step, assayId, info1, info2, info3 } = get();
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
      set({ step: "info3" });
      return;
    }
    if (step === "info3") {
      if (info3.selectedSlideId === null) return;
      const samplesOk = info3.samples.every(
        (r) =>
          r.channel.trim().length > 0 &&
          r.name.trim().length > 0 &&
          r.positions.trim().length > 0,
      );
      if (!samplesOk) return;
      set({ step: "alignPattern" });
    }
  },

  goBack: () => {
    const { step } = get();
    if (step === "info1") set({ step: "welcome" });
    else if (step === "info2") set({ step: "info1" });
    else if (step === "info3") set({ step: "info2" });
    else if (step === "alignPattern") set({ step: "info3" });
  },

  submit: () => {
    const { assayId, info1, info2, info3 } = get();
    if (!assayId) return;
    console.info("studio.submit", { assayId, info1, info2, info3 });
  },
}));

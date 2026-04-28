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

const BASIC_INFO_FEATURE_IDS: BasicInfo2FeatureId[] = [
  "morphology",
  "partcount",
  "partfluor",
  "totalfluor",
];

const BASIC_INFO_SLIDE_IDS: BasicInfoSlideId[] = ["slide-i", "slide-vi"];

const TIMELAPSE_UNITS: TimelapseUnit[] = ["second", "minute", "hour"];

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
export type BasicInfoSlideId = "slide-i" | "slide-vi";

export type BasicInfoSampleRow = {
  channel: string;
  name: string;
  positions: string;
};

/** Third basic-info screen — Figma node 78:284 (Slide + Samples). */
export type BasicInfoStep3 = {
  selectedSlideId: BasicInfoSlideId;
  samplesBySlide: Record<BasicInfoSlideId, BasicInfoSampleRow[]>;
};

export type StudioAssayJson = {
  assayId: AssayId;
  assayLabel: string;
  info1: BasicInfoStep1;
  info2: BasicInfoStep2;
  info3: BasicInfoStep3;
};

export function buildStudioAssayJson({
  assayId,
  info1,
  info2,
  info3,
}: {
  assayId: AssayId;
  info1: BasicInfoStep1;
  info2: BasicInfoStep2;
  info3: BasicInfoStep3;
}): StudioAssayJson {
  return {
    assayId,
    assayLabel: ASSAY_CHOICE_LABEL[assayId],
    info1,
    info2,
    info3,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`Invalid assay.json: ${label} must be an object.`);
  return value;
}

function requireString(record: Record<string, unknown>, key: string, label = key): string {
  const value = record[key];
  if (typeof value !== "string") throw new Error(`Invalid assay.json: ${label} must be a string.`);
  return value;
}

function isAssayId(value: unknown): value is AssayId {
  return typeof value === "string" && value in ASSAY_CHOICE_LABEL;
}

function isBasicInfoFeatureId(value: unknown): value is BasicInfo2FeatureId {
  return typeof value === "string" && BASIC_INFO_FEATURE_IDS.includes(value as BasicInfo2FeatureId);
}

function isBasicInfoSlideId(value: unknown): value is BasicInfoSlideId {
  return typeof value === "string" && BASIC_INFO_SLIDE_IDS.includes(value as BasicInfoSlideId);
}

function isTimelapseUnit(value: unknown): value is TimelapseUnit {
  return typeof value === "string" && TIMELAPSE_UNITS.includes(value as TimelapseUnit);
}

function parseInfo1(value: unknown): BasicInfoStep1 {
  const info1 = requireRecord(value, "info1");
  return {
    name: requireString(info1, "name", "info1.name"),
    date: requireString(info1, "date", "info1.date"),
    dataPath: requireString(info1, "dataPath", "info1.dataPath"),
    saveTo: requireString(info1, "saveTo", "info1.saveTo"),
  };
}

function parseInfo2(value: unknown): BasicInfoStep2 {
  const info2 = requireRecord(value, "info2");
  const timelapseAmount = info2.timelapseAmount;
  const timelapseUnit = info2.timelapseUnit;
  const selectedFeature = info2.selectedFeature;

  if (
    timelapseAmount !== null &&
    (typeof timelapseAmount !== "number" || !Number.isFinite(timelapseAmount))
  ) {
    throw new Error("Invalid assay.json: info2.timelapseAmount must be a number or null.");
  }
  if (!isTimelapseUnit(timelapseUnit)) {
    throw new Error("Invalid assay.json: info2.timelapseUnit is not supported.");
  }
  if (selectedFeature !== null && !isBasicInfoFeatureId(selectedFeature)) {
    throw new Error("Invalid assay.json: info2.selectedFeature is not supported.");
  }

  return {
    pattern: requireString(info2, "pattern", "info2.pattern"),
    timelapseAmount,
    timelapseUnit,
    selectedFeature,
  };
}

function parseSampleRows(value: unknown, label: string): BasicInfoSampleRow[] {
  if (!Array.isArray(value)) throw new Error(`Invalid assay.json: ${label} must be an array.`);

  return value.map((row, index) => {
    const record = requireRecord(row, `${label}[${index}]`);
    return {
      channel: requireString(record, "channel", `${label}[${index}].channel`),
      name: requireString(record, "name", `${label}[${index}].name`),
      positions: requireString(record, "positions", `${label}[${index}].positions`),
    };
  });
}

function parseInfo3(value: unknown): BasicInfoStep3 {
  const info3 = requireRecord(value, "info3");
  const selectedSlideId = info3.selectedSlideId;
  if (!isBasicInfoSlideId(selectedSlideId)) {
    throw new Error("Invalid assay.json: info3.selectedSlideId is not supported.");
  }

  const samplesBySlide = requireRecord(info3.samplesBySlide, "info3.samplesBySlide");
  return {
    selectedSlideId,
    samplesBySlide: {
      "slide-i": parseSampleRows(samplesBySlide["slide-i"], "info3.samplesBySlide.slide-i"),
      "slide-vi": parseSampleRows(samplesBySlide["slide-vi"], "info3.samplesBySlide.slide-vi"),
    },
  };
}

export function parseStudioAssayJson(contents: string): StudioAssayJson {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error("Invalid assay.json: file is not valid JSON.");
  }

  const root = requireRecord(parsed, "root");
  const assayId = root.assayId;
  if (!isAssayId(assayId)) {
    throw new Error("Invalid assay.json: assayId is not supported.");
  }

  return buildStudioAssayJson({
    assayId,
    info1: parseInfo1(root.info1),
    info2: parseInfo2(root.info2),
    info3: parseInfo3(root.info3),
  });
}

type StudioState = {
  assayId: AssayId | null;
  info1: BasicInfoStep1;
  info2: BasicInfoStep2;
  info3: BasicInfoStep3;
  loadAssayJson: (assayJson: StudioAssayJson) => void;
  setAssayId: (id: AssayId | null) => void;
  setInfo1: (patch: Partial<BasicInfoStep1>) => void;
  setInfo2: (patch: Partial<BasicInfoStep2>) => void;
  setInfo3: (patch: Partial<BasicInfoStep3>) => void;
  updateInfo3Sample: (index: number, patch: Partial<BasicInfoSampleRow>) => void;
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

const initialInfo3: BasicInfoStep3 = {
  selectedSlideId: "slide-vi",
  samplesBySlide: {
    "slide-i": [{ channel: "0", name: "", positions: "" }],
    "slide-vi": [
      { channel: "0", name: "", positions: "" },
      { channel: "1", name: "", positions: "" },
      { channel: "2", name: "", positions: "" },
      { channel: "3", name: "", positions: "" },
      { channel: "4", name: "", positions: "" },
      { channel: "5", name: "", positions: "" },
    ],
  },
};

function cloneSamplesBySlide(
  samplesBySlide: Record<BasicInfoSlideId, BasicInfoSampleRow[]>,
): Record<BasicInfoSlideId, BasicInfoSampleRow[]> {
  return {
    "slide-i": samplesBySlide["slide-i"].map((r) => ({ ...r })),
    "slide-vi": samplesBySlide["slide-vi"].map((r) => ({ ...r })),
  };
}

export const useStudioStore = create<StudioState>((set, get) => ({
  assayId: "custom-assay",
  info1: { ...initialInfo1 },
  info2: { ...initialInfo2 },
  info3: {
    selectedSlideId: initialInfo3.selectedSlideId,
    samplesBySlide: cloneSamplesBySlide(initialInfo3.samplesBySlide),
  },

  setAssayId: (assayId) => set({ assayId }),

  loadAssayJson: (assayJson) =>
    set({
      assayId: assayJson.assayId,
      info1: { ...assayJson.info1 },
      info2: { ...assayJson.info2 },
      info3: {
        selectedSlideId: assayJson.info3.selectedSlideId,
        samplesBySlide: cloneSamplesBySlide(assayJson.info3.samplesBySlide),
      },
    }),

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
      const selectedSlideId = s.info3.selectedSlideId;
      const samples = s.info3.samplesBySlide[selectedSlideId].map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      );
      return {
        info3: {
          ...s.info3,
          samplesBySlide: {
            ...s.info3.samplesBySlide,
            [selectedSlideId]: samples,
          },
        },
      };
    }),

  submit: () => {
    const { assayId, info1, info2, info3 } = get();
    if (!assayId) return;
    console.info("studio.submit", { assayId, info1, info2, info3 });
  },
}));

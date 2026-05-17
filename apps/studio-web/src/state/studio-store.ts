import type {
  StudioAssayId as AssayId,
  StudioAssayJson,
  StudioBasicInfoFeatureId as BasicInfo2FeatureId,
  StudioBasicInfoSampleRow as BasicInfoSampleRow,
  StudioBasicInfoSlideId as BasicInfoSlideId,
  StudioBasicInfoStep1 as BasicInfoStep1,
  StudioBasicInfoStep2 as BasicInfoStep2,
  StudioBasicInfoStep3 as BasicInfoStep3,
  StudioDataSourceKind,
  StudioTimelapseUnit as TimelapseUnit,
} from "@lisca/contracts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type {
  AssayId,
  BasicInfo2FeatureId,
  BasicInfoSampleRow,
  BasicInfoSlideId,
  BasicInfoStep1,
  BasicInfoStep2,
  BasicInfoStep3,
  StudioAssayJson,
  StudioDataSourceKind,
  TimelapseUnit,
};

export type StudioStep = "welcome" | "info1" | "info2" | "info3" | "alignPattern";
export type InfoStep = 1 | 2 | 3;

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

export function basicInfoAssayTitle(assayId: AssayId | null): string {
  if (!assayId) return "Assay";
  if (assayId === "custom-assay") return ASSAY_CHOICE_LABEL["custom-assay"];
  return `${ASSAY_CHOICE_LABEL[assayId]} assay`;
}

export function inferDataSourceKind(path: string): StudioDataSourceKind {
  const lower = path.trim().toLowerCase();
  if (lower.endsWith(".nd2")) return "nd2";
  if (lower.endsWith(".czi")) return "czi";
  return null;
}

export function buildStudioAssayJson({
  assayId,
  dataSourceKind,
  info1,
  info2,
  info3,
}: {
  assayId: AssayId;
  dataSourceKind: StudioDataSourceKind;
  info1: BasicInfoStep1;
  info2: BasicInfoStep2;
  info3: BasicInfoStep3;
}): StudioAssayJson {
  return {
    assayId,
    assayLabel: ASSAY_CHOICE_LABEL[assayId],
    dataSourceKind,
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

function isDataSourceKind(value: unknown): value is StudioDataSourceKind {
  return value === null || value === "tif" || value === "jpg" || value === "nd2" || value === "czi";
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
  if (!isAssayId(assayId)) throw new Error("Invalid assay.json: assayId is not supported.");
  const info1 = parseInfo1(root.info1);
  const dataSourceKind = isDataSourceKind(root.dataSourceKind)
    ? root.dataSourceKind
    : inferDataSourceKind(info1.dataPath);
  return buildStudioAssayJson({
    assayId,
    dataSourceKind,
    info1,
    info2: parseInfo2(root.info2),
    info3: parseInfo3(root.info3),
  });
}

type StudioState = {
  assayId: AssayId | null;
  infoStep: InfoStep;
  dataSourceKind: StudioDataSourceKind;
  info1: BasicInfoStep1;
  info2: BasicInfoStep2;
  info3: BasicInfoStep3;
  loadAssayJson: (assayJson: StudioAssayJson) => void;
  setAssayId: (id: AssayId | null) => void;
  setInfoStep: (step: InfoStep) => void;
  setDataSourceKind: (kind: StudioDataSourceKind) => void;
  setInfo1: (patch: Partial<BasicInfoStep1>) => void;
  setInfo2: (patch: Partial<BasicInfoStep2>) => void;
  setInfo3: (patch: Partial<BasicInfoStep3>) => void;
  updateInfo3Sample: (index: number, patch: Partial<BasicInfoSampleRow>) => void;
};

const initialInfo1: BasicInfoStep1 = { name: "", date: "", dataPath: "", saveTo: "" };
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
    "slide-i": samplesBySlide["slide-i"].map((row) => ({ ...row })),
    "slide-vi": samplesBySlide["slide-vi"].map((row) => ({ ...row })),
  };
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
      assayId: "custom-assay",
      infoStep: 1,
      dataSourceKind: null,
      info1: { ...initialInfo1 },
      info2: { ...initialInfo2 },
      info3: {
        selectedSlideId: initialInfo3.selectedSlideId,
        samplesBySlide: cloneSamplesBySlide(initialInfo3.samplesBySlide),
      },
      setAssayId: (assayId) => set({ assayId }),
      setInfoStep: (infoStep) => set({ infoStep }),
      setDataSourceKind: (dataSourceKind) => set({ dataSourceKind }),
      loadAssayJson: (assayJson) =>
        set({
          assayId: assayJson.assayId,
          infoStep: 1,
          dataSourceKind: assayJson.dataSourceKind ?? inferDataSourceKind(assayJson.info1.dataPath),
          info1: { ...assayJson.info1 },
          info2: { ...assayJson.info2 },
          info3: {
            selectedSlideId: assayJson.info3.selectedSlideId,
            samplesBySlide: cloneSamplesBySlide(assayJson.info3.samplesBySlide),
          },
        }),
      setInfo1: (patch) => set((state) => ({ info1: { ...state.info1, ...patch } })),
      setInfo2: (patch) => set((state) => ({ info2: { ...state.info2, ...patch } })),
      setInfo3: (patch) => set((state) => ({ info3: { ...state.info3, ...patch } })),
      updateInfo3Sample: (index, patch) =>
        set((state) => {
          const selectedSlideId = state.info3.selectedSlideId;
          const samples = state.info3.samplesBySlide[selectedSlideId].map((row, i) =>
            i === index ? { ...row, ...patch } : row,
          );
          return {
            info3: {
              ...state.info3,
              samplesBySlide: {
                ...state.info3.samplesBySlide,
                [selectedSlideId]: samples,
              },
            },
          };
        }),
    }),
    {
      name: "lisca-studio-session",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

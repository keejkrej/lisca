import type {
  StudioAssayId as AssayId,
  StudioAssayJson,
  StudioBasicInfoFeatureId as BasicInfo2FeatureId,
  StudioBasicInfoSampleRow as BasicInfoSampleRow,
  StudioBasicInfoSlideId as BasicInfoSlideId,
  StudioBasicInfoStep1 as BasicInfoStep1,
  StudioBasicInfoStep2 as BasicInfoStep2,
  StudioBasicInfoStep3 as BasicInfoStep3,
  GeneExpressionAssayName,
  StudioDataSourceKind,
  StudioTimelapseUnit as TimelapseUnit,
} from "@lisca/contracts";
import {
  ASSAY_NAME,
  GENE_EXPRESSION_FEATURE_IDS as CONTRACT_GENE_EXPRESSION_FEATURE_IDS,
  ASSAY_FEATURE,
  DEFAULT_FOLDER_SOURCE_TEMPLATE,
} from "@lisca/contracts";
import { Atom, useAtom } from "@effect-atom/atom-react";
import { useCallback, useRef } from "react";

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

export type StudioStep = "chooseAssay" | "info1" | "info2" | "info3" | "alignPattern";
export type InfoStep = 1 | 2 | 3;

export const ASSAY_CHOICE_LABEL: Record<AssayId, string> = {
  [ASSAY_NAME.GENE_EXPRESSION]: "Gene expression",
  [ASSAY_NAME.IMMUNE_KILLING]: "Immune killing",
  [ASSAY_NAME.LNP_BINDING]: "LNP binding",
  [ASSAY_NAME.CUSTOM_ASSAY]: "Custom assay",
};

const BASIC_INFO_FEATURE_IDS: ReadonlyArray<BasicInfo2FeatureId> =
  CONTRACT_GENE_EXPRESSION_FEATURE_IDS;
const BASIC_INFO_SLIDE_IDS: BasicInfoSlideId[] = ["slide-i", "slide-vi"];
const TIMELAPSE_UNITS: TimelapseUnit[] = ["second", "minute", "hour"];
const ENABLED_ASSAY_ID: AssayId = ASSAY_NAME.GENE_EXPRESSION;
const ASSAY_DEFAULT_INFO_FEATURES: Record<AssayId, readonly BasicInfo2FeatureId[]> = {
  [ASSAY_NAME.GENE_EXPRESSION]: [ASSAY_FEATURE.TOTAL_FLUOR],
  [ASSAY_NAME.IMMUNE_KILLING]: [],
  [ASSAY_NAME.LNP_BINDING]: [],
  [ASSAY_NAME.CUSTOM_ASSAY]: [],
};

function isGeneExpressionAssay(assayId: AssayId | null): assayId is GeneExpressionAssayName {
  return assayId === ASSAY_NAME.GENE_EXPRESSION;
}

export function basicInfoAssayTitle(assayId: AssayId | null): string {
  if (!assayId) return "Assay";
  if (assayId === ASSAY_NAME.CUSTOM_ASSAY) return ASSAY_CHOICE_LABEL[ASSAY_NAME.CUSTOM_ASSAY];
  return `${ASSAY_CHOICE_LABEL[assayId]} assay`;
}

export function inferDataSourceKind(path: string): StudioDataSourceKind {
  const lower = path.trim().toLowerCase();
  if (lower.endsWith(".nd2")) return "nd2";
  if (lower.endsWith(".czi")) return "czi";
  if (path.trim()) return "folder";
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

function optionalString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function isAssayId(value: unknown): value is AssayId {
  return typeof value === "string" && value in ASSAY_CHOICE_LABEL;
}

function enabledAssayId(assayId: AssayId | null): AssayId | null {
  return assayId === ENABLED_ASSAY_ID ? assayId : ENABLED_ASSAY_ID;
}

function isDataSourceKind(value: unknown): value is StudioDataSourceKind {
  return value === null || value === "folder" || value === "nd2" || value === "czi";
}

function isBasicInfoFeatureId(value: unknown): value is BasicInfo2FeatureId {
  return typeof value === "string" && BASIC_INFO_FEATURE_IDS.includes(value as BasicInfo2FeatureId);
}

function isBasicInfoFeatureList(value: unknown): value is BasicInfo2FeatureId[] {
  return Array.isArray(value) && value.every((item) => isBasicInfoFeatureId(item));
}

function normalizeSelectedFeaturesForAssay(
  assayId: AssayId | null,
  selectedFeatures: readonly BasicInfo2FeatureId[],
): BasicInfo2FeatureId[] {
  const defaults = assayId ? ASSAY_DEFAULT_INFO_FEATURES[assayId] : [];
  const allowed = defaults.length > 0 ? defaults : BASIC_INFO_FEATURE_IDS;
  const filtered = selectedFeatures.filter((id) => allowed.includes(id));
  if (filtered.length > 0) return [...filtered];
  return defaults.length > 0 ? [...defaults] : [];
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
    folderSubfolderTemplate:
      optionalString(info1, "folderSubfolderTemplate") ||
      DEFAULT_FOLDER_SOURCE_TEMPLATE.subfolderTemplate,
    folderFilenameTemplate:
      optionalString(info1, "folderFilenameTemplate") ||
      DEFAULT_FOLDER_SOURCE_TEMPLATE.filenameTemplate,
    saveTo: requireString(info1, "saveTo", "info1.saveTo"),
  };
}

function parseInfo2(value: unknown, assayId: AssayId | null): BasicInfoStep2 {
  const info2 = requireRecord(value, "info2");
  const timelapseAmount = info2.timelapseAmount;
  const timelapseUnit = info2.timelapseUnit;
  const rawSelectedFeatures = (info2 as Record<string, unknown>)?.selectedFeatures;
  const rawSelectedFeature = (info2 as Record<string, unknown>)?.selectedFeature;
  const selectedFeatures = isBasicInfoFeatureList(rawSelectedFeatures)
    ? rawSelectedFeatures
    : isBasicInfoFeatureId(rawSelectedFeature)
      ? [rawSelectedFeature]
      : [];
  if (
    timelapseAmount !== null &&
    (typeof timelapseAmount !== "number" || !Number.isFinite(timelapseAmount))
  ) {
    throw new Error("Invalid assay.json: info2.timelapseAmount must be a number or null.");
  }
  if (!isTimelapseUnit(timelapseUnit)) {
    throw new Error("Invalid assay.json: info2.timelapseUnit is not supported.");
  }
  return {
    pattern: requireString(info2, "pattern", "info2.pattern"),
    timelapseAmount,
    timelapseUnit,
    selectedFeatures: normalizeSelectedFeaturesForAssay(assayId, selectedFeatures),
  };
}

function parsePersistedInfo2(value: unknown, assayId: AssayId | null): BasicInfoStep2 {
  if (!isRecord(value)) return { ...initialInfo2 };
  try {
    return parseInfo2(value, assayId);
  } catch {
    const valueRecord = value as Record<string, unknown>;
    const rawSelectedFeatures = valueRecord.selectedFeatures;
    const rawSelectedFeature = valueRecord.selectedFeature;
    return {
      pattern: optionalString(valueRecord, "pattern"),
      timelapseAmount: null,
      timelapseUnit: "minute",
      selectedFeatures: normalizeSelectedFeaturesForAssay(
        assayId,
        isBasicInfoFeatureList(rawSelectedFeatures)
          ? [...rawSelectedFeatures]
          : isBasicInfoFeatureId(rawSelectedFeature)
            ? [rawSelectedFeature]
            : [],
      ),
    };
  }
}

function parseSampleRows(value: unknown, label: string): BasicInfoSampleRow[] {
  if (!Array.isArray(value)) throw new Error(`Invalid assay.json: ${label} must be an array.`);
  return value.map((row, index) => {
    const record = requireRecord(row, `${label}[${index}]`);
    return {
      channel: requireString(record, "channel", `${label}[${index}].channel`),
      name: requireString(record, "name", `${label}[${index}].name`),
      positions: requireString(record, "positions", `${label}[${index}].positions`),
      maskChannel: optionalString(record, "maskChannel"),
      signalChannel: optionalString(record, "signalChannel"),
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
    info2: parseInfo2(root.info2, assayId),
    info3: parseInfo3(root.info3),
  });
}

type StudioWizardData = {
  assayId: AssayId | null;
  infoStep: InfoStep;
  dataSourceKind: StudioDataSourceKind;
  info1: BasicInfoStep1;
  info2: BasicInfoStep2;
  info3: BasicInfoStep3;
};

type StudioState = StudioWizardData & {
  loadAssayJson: (assayJson: StudioAssayJson) => void;
  setAssayId: (id: AssayId | null) => void;
  setInfoStep: (step: InfoStep) => void;
  setDataSourceKind: (kind: StudioDataSourceKind) => void;
  setInfo1: (patch: Partial<BasicInfoStep1>) => void;
  setInfo2: (patch: Partial<BasicInfoStep2>) => void;
  setInfo3: (patch: Partial<BasicInfoStep3>) => void;
  updateInfo3Sample: (index: number, patch: Partial<BasicInfoSampleRow>) => void;
};

const initialInfo1: BasicInfoStep1 = {
  name: "",
  date: "",
  dataPath: "",
  folderSubfolderTemplate: DEFAULT_FOLDER_SOURCE_TEMPLATE.subfolderTemplate,
  folderFilenameTemplate: DEFAULT_FOLDER_SOURCE_TEMPLATE.filenameTemplate,
  saveTo: "",
};

function normalizeInfo1(info1: BasicInfoStep1): BasicInfoStep1 {
  return {
    ...info1,
    folderSubfolderTemplate:
      info1.folderSubfolderTemplate ?? DEFAULT_FOLDER_SOURCE_TEMPLATE.subfolderTemplate,
    folderFilenameTemplate:
      info1.folderFilenameTemplate ?? DEFAULT_FOLDER_SOURCE_TEMPLATE.filenameTemplate,
  };
}

const initialInfo2: BasicInfoStep2 = {
  pattern: "",
  timelapseAmount: null,
  timelapseUnit: "minute",
  selectedFeatures: [ASSAY_FEATURE.TOTAL_FLUOR],
};
const initialInfo3: BasicInfoStep3 = {
  selectedSlideId: "slide-vi",
  samplesBySlide: {
    "slide-i": [{ channel: "0", name: "", positions: "", maskChannel: "", signalChannel: "" }],
    "slide-vi": [
      { channel: "0", name: "", positions: "", maskChannel: "", signalChannel: "" },
      { channel: "1", name: "", positions: "", maskChannel: "", signalChannel: "" },
      { channel: "2", name: "", positions: "", maskChannel: "", signalChannel: "" },
      { channel: "3", name: "", positions: "", maskChannel: "", signalChannel: "" },
      { channel: "4", name: "", positions: "", maskChannel: "", signalChannel: "" },
      { channel: "5", name: "", positions: "", maskChannel: "", signalChannel: "" },
    ],
  },
};

function cloneSamplesBySlide(
  samplesBySlide: Record<BasicInfoSlideId, BasicInfoSampleRow[]>,
): Record<BasicInfoSlideId, BasicInfoSampleRow[]> {
  return {
    "slide-i": samplesBySlide["slide-i"].map((row) => ({
      ...row,
      maskChannel: row.maskChannel ?? "",
      signalChannel: row.signalChannel ?? "",
    })),
    "slide-vi": samplesBySlide["slide-vi"].map((row) => ({
      ...row,
      maskChannel: row.maskChannel ?? "",
      signalChannel: row.signalChannel ?? "",
    })),
  };
}

function normalizeInfo3(info3: BasicInfoStep3): BasicInfoStep3 {
  return {
    selectedSlideId: info3.selectedSlideId,
    samplesBySlide: cloneSamplesBySlide(info3.samplesBySlide),
  };
}

function mergeStudioState(persisted: unknown, current: StudioWizardData): StudioWizardData {
  const persistedState = persisted as Partial<StudioWizardData>;
  const mergedInfo2 = persistedState.info2
    ? parsePersistedInfo2(persistedState.info2, persistedState.assayId ?? current.assayId)
    : current.info2;
  return {
    ...current,
    ...persistedState,
    assayId: enabledAssayId(persistedState.assayId ?? current.assayId),
    info1: persistedState.info1 ? normalizeInfo1(persistedState.info1) : current.info1,
    info2: mergedInfo2,
    info3: persistedState.info3 ? normalizeInfo3(persistedState.info3) : current.info3,
  };
}

export const STUDIO_SESSION_KEY = "lisca-studio-session";

function createInitialWizardData(): StudioWizardData {
  return {
    assayId: ENABLED_ASSAY_ID,
    infoStep: 1,
    dataSourceKind: null,
    info1: { ...initialInfo1 },
    info2: { ...initialInfo2 },
    info3: {
      selectedSlideId: initialInfo3.selectedSlideId,
      samplesBySlide: cloneSamplesBySlide(initialInfo3.samplesBySlide),
    },
  };
}

export function readStudioSession(): StudioWizardData | null {
  try {
    const raw = sessionStorage.getItem(STUDIO_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: Partial<StudioWizardData> };
    const persisted = parsed.state ?? (parsed as Partial<StudioWizardData>);
    return mergeStudioState(persisted, createInitialWizardData());
  } catch {
    return null;
  }
}

function writeStudioSession(state: StudioWizardData): void {
  try {
    sessionStorage.setItem(STUDIO_SESSION_KEY, JSON.stringify({ state }));
  } catch {
    // ignore
  }
}

export function createInitialStudioWizardState(): StudioWizardData {
  return createInitialWizardData();
}

export const studioWizardAtom = Atom.make(createInitialWizardData()).pipe(Atom.keepAlive);

type StateUpdater<T> = T | ((current: T) => T);

function patchStudioWizard(
  set: (update: StateUpdater<StudioWizardData>) => void,
  patch: Partial<StudioWizardData> | ((state: StudioWizardData) => StudioWizardData),
): void {
  set((state) => {
    const next = typeof patch === "function" ? patch(state) : { ...state, ...patch };
    writeStudioSession(next);
    return next;
  });
}

export const studioWizardActions = {
  setInfoStep(set: (update: StateUpdater<StudioWizardData>) => void, infoStep: InfoStep) {
    patchStudioWizard(set, { infoStep });
  },
  setDataSourceKind(set: (update: StateUpdater<StudioWizardData>) => void, dataSourceKind: StudioDataSourceKind) {
    patchStudioWizard(set, { dataSourceKind });
  },
  loadAssayJson(set: (update: StateUpdater<StudioWizardData>) => void, assayJson: StudioAssayJson) {
    patchStudioWizard(set, {
      assayId: enabledAssayId(assayJson.assayId),
      infoStep: 1,
      dataSourceKind: assayJson.dataSourceKind ?? inferDataSourceKind(assayJson.info1.dataPath),
      info1: { ...assayJson.info1 },
      info2: {
        ...assayJson.info2,
        selectedFeatures: normalizeSelectedFeaturesForAssay(
          assayJson.assayId,
          assayJson.info2.selectedFeatures,
        ),
      },
      info3: {
        selectedSlideId: assayJson.info3.selectedSlideId,
        samplesBySlide: cloneSamplesBySlide(assayJson.info3.samplesBySlide),
      },
    });
  },
  setAssayId(set: (update: StateUpdater<StudioWizardData>) => void, assayId: AssayId | null) {
    const nextAssayId = enabledAssayId(assayId);
    patchStudioWizard(set, (current) => ({
      ...current,
      assayId: nextAssayId,
      info2: {
        ...current.info2,
        selectedFeatures: normalizeSelectedFeaturesForAssay(
          nextAssayId,
          nextAssayId === ASSAY_NAME.GENE_EXPRESSION ? current.info2.selectedFeatures : [],
        ),
      },
    }));
  },
  setInfo1(set: (update: StateUpdater<StudioWizardData>) => void, patch: Partial<BasicInfoStep1>) {
    patchStudioWizard(set, (current) => ({ ...current, info1: { ...current.info1, ...patch } }));
  },
  setInfo2(set: (update: StateUpdater<StudioWizardData>) => void, patch: Partial<BasicInfoStep2>) {
    patchStudioWizard(set, (current) => ({
      ...current,
      info2: isGeneExpressionAssay(current.assayId)
        ? {
            ...current.info2,
            ...patch,
            selectedFeatures:
              patch.selectedFeatures == null
                ? current.info2.selectedFeatures
                : normalizeSelectedFeaturesForAssay(current.assayId, patch.selectedFeatures),
          }
        : {
            ...current.info2,
            ...patch,
            selectedFeatures: [],
          },
    }));
  },
  setInfo3(set: (update: StateUpdater<StudioWizardData>) => void, patch: Partial<BasicInfoStep3>) {
    patchStudioWizard(set, (current) => ({ ...current, info3: { ...current.info3, ...patch } }));
  },
  updateInfo3Sample(
    set: (update: StateUpdater<StudioWizardData>) => void,
    index: number,
    patch: Partial<BasicInfoSampleRow>,
  ) {
    patchStudioWizard(set, (current) => {
      const selectedSlideId = current.info3.selectedSlideId;
      const samples = current.info3.samplesBySlide[selectedSlideId].map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      );
      return {
        ...current,
        info3: {
          ...current.info3,
          samplesBySlide: {
            ...current.info3.samplesBySlide,
            [selectedSlideId]: samples,
          },
        },
      };
    });
  },
};

function useStudioStoreApi(): StudioState {
  const [state, setState] = useAtom(studioWizardAtom);

  const setInfoStep = useCallback(
    (infoStep: InfoStep) => studioWizardActions.setInfoStep(setState, infoStep),
    [setState],
  );
  const setDataSourceKind = useCallback(
    (dataSourceKind: StudioDataSourceKind) =>
      studioWizardActions.setDataSourceKind(setState, dataSourceKind),
    [setState],
  );
  const loadAssayJson = useCallback(
    (assayJson: StudioAssayJson) => studioWizardActions.loadAssayJson(setState, assayJson),
    [setState],
  );
  const setAssayId = useCallback(
    (assayId: AssayId | null) => studioWizardActions.setAssayId(setState, assayId),
    [setState],
  );
  const setInfo1 = useCallback(
    (patch: Partial<BasicInfoStep1>) => studioWizardActions.setInfo1(setState, patch),
    [setState],
  );
  const setInfo2 = useCallback(
    (patch: Partial<BasicInfoStep2>) => studioWizardActions.setInfo2(setState, patch),
    [setState],
  );
  const setInfo3 = useCallback(
    (patch: Partial<BasicInfoStep3>) => studioWizardActions.setInfo3(setState, patch),
    [setState],
  );
  const updateInfo3Sample = useCallback(
    (index: number, patch: Partial<BasicInfoSampleRow>) =>
      studioWizardActions.updateInfo3Sample(setState, index, patch),
    [setState],
  );

  return {
    ...state,
    setInfoStep,
    setDataSourceKind,
    loadAssayJson,
    setAssayId,
    setInfo1,
    setInfo2,
    setInfo3,
    updateInfo3Sample,
  };
}

export function useStudioStore<T>(selector: (state: StudioState) => T): T {
  const api = useStudioStoreApi();
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  return selectorRef.current(api);
}

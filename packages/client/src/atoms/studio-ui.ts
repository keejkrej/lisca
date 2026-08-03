import type {
  AssayAnalysisConfig,
  StudioAssayId as AssayId,
  StudioAssayJson,
  StudioBasicInfoFeatureId as BasicInfo2FeatureId,
  StudioBasicInfoSampleRow as BasicInfoSampleRow,
  StudioBasicInfoStep3OnDisk as BasicInfoStep3OnDisk,
  StudioTimelapseUnit as TimelapseUnit,
  StudioBasicInfoStep1 as BasicInfoStep1,
  StudioBasicInfoStep2 as BasicInfoStep2,
  StudioBasicInfoStep3 as BasicInfoStep3,
  TransfectionAssayType,
  StudioDataSourceKind,
  EnabledStudioAssayId,
} from "@lisca/contracts/assay";
import {
  ASSAY_TYPE,
  ENABLED_STUDIO_ASSAY_IDS,
  TRANSFECTION_FEATURE_IDS as CONTRACT_TRANSFECTION_FEATURE_IDS,
  ASSAY_FEATURE,
  DEFAULT_FOLDER_SOURCE_TEMPLATE,
} from "@lisca/contracts/assay";
import { liscaSessionStorage, readStorageJson, writeStorageJson } from "@lisca/utils";
import { Atom } from "@effect-atom/atom-solid";

import {
  ASSAY_CHOICE_LABEL,
  analysisConfigForAssay,
  buildStudioAssayJson as buildStudioAssayJsonCore,
  defaultIntervalMinutesForAssay,
  defaultMaxOnsetMinutesForAssay,
  inferDataSourceKind,
  normalizeSelectedFeaturesForAssay,
  parseStudioAssayJson as parseStudioAssayJsonCore,
} from "../studio/studio-assay-json";
import { sampleRowFromDisk, sampleRowToDisk } from "../studio/sample-positions";
import {
  isBasicInfoDirty as isBasicInfoDirtyCore,
  serializeBasicInfoSnapshot as serializeBasicInfoSnapshotCore,
} from "../studio/wizard-state";

export type {
  AssayId,
  BasicInfo2FeatureId,
  BasicInfoSampleRow,
  BasicInfoStep1,
  BasicInfoStep2,
  BasicInfoStep3,
  StudioAssayJson,
  StudioDataSourceKind,
  TimelapseUnit,
};

export type StudioStep = "chooseAssay" | "info1" | "info2" | "alignPattern";
export type InfoStep = 1 | 2;

export {
  ASSAY_CHOICE_LABEL,
  inferDataSourceKind,
  normalizeSelectedFeaturesForAssay,
} from "../studio/studio-assay-json";

const BASIC_INFO_FEATURE_IDS: ReadonlyArray<BasicInfo2FeatureId> =
  CONTRACT_TRANSFECTION_FEATURE_IDS;
const BASIC_INFO_FEATURE_ID_SET = new Set<string>(BASIC_INFO_FEATURE_IDS);
const TIMELAPSE_UNIT_SET = new Set<TimelapseUnit>(["second", "minute", "hour"]);
const ENABLED_ASSAY_IDS = new Set<EnabledStudioAssayId>(ENABLED_STUDIO_ASSAY_IDS);
const DEFAULT_ASSAY_ID: AssayId = ASSAY_TYPE.TRANSFECTION;

function isTransfectionAssay(assayId: AssayId | null): assayId is TransfectionAssayType {
  return assayId === ASSAY_TYPE.TRANSFECTION;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`Invalid assay.json: ${label} must be an object.`);
  return value;
}

function emptySampleRow(id: string): BasicInfoSampleRow {
  return {
    id,
    channel: "",
    name: "",
    positionStart: "",
    positionFinish: "",
    maskChannel: "",
    signalChannel: "",
  };
}

function isBasicInfoFeatureId(value: unknown): value is BasicInfo2FeatureId {
  return typeof value === "string" && BASIC_INFO_FEATURE_ID_SET.has(value);
}

function isBasicInfoFeatureList(value: unknown): value is BasicInfo2FeatureId[] {
  return Array.isArray(value) && value.every((item) => isBasicInfoFeatureId(item));
}

function isTimelapseUnit(value: unknown): value is TimelapseUnit {
  return typeof value === "string" && TIMELAPSE_UNIT_SET.has(value as TimelapseUnit);
}

function enabledAssayId(assayId: AssayId | null): AssayId | null {
  if (assayId && ENABLED_ASSAY_IDS.has(assayId as EnabledStudioAssayId)) {
    return assayId;
  }
  return DEFAULT_ASSAY_ID;
}

export function basicInfoAssayTitle(assayId: AssayId | null): string {
  if (!assayId) return "Assay";
  if (assayId === ASSAY_TYPE.CUSTOM_ASSAY) return ASSAY_CHOICE_LABEL[ASSAY_TYPE.CUSTOM_ASSAY];
  return `${ASSAY_CHOICE_LABEL[assayId]} assay`;
}

export function buildStudioAssayJson({
  assayId,
  dataSourceKind,
  info1,
  info2,
  info3,
  analysis,
}: {
  assayId: AssayId;
  dataSourceKind: StudioDataSourceKind;
  info1: BasicInfoStep1;
  info2: BasicInfoStep2;
  info3: BasicInfoStep3;
  analysis?: AssayAnalysisConfig | null;
}): StudioAssayJson {
  return buildStudioAssayJsonCore({
    assayId,
    dataSourceKind,
    info1,
    info2,
    info3,
    analysis,
    sampleRowToDisk,
  });
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

export function parseStudioAssayJson(contents: string): StudioAssayJson {
  return parseStudioAssayJsonCore(contents, sampleRowFromDisk, sampleRowToDisk);
}

export type StudioWizardState = {
  assayId: AssayId | null;
  infoStep: InfoStep;
  dataSourceKind: StudioDataSourceKind;
  info1: BasicInfoStep1;
  info2: BasicInfoStep2;
  info3: BasicInfoStep3;
  /** Assay-dependent analysis params (transfection: maxOnsetMinutes). */
  analysis: AssayAnalysisConfig | null;
  basicInfoSavedSnapshot: string | null;
};

export function serializeBasicInfoSnapshot(
  state: Pick<
    StudioWizardState,
    "assayId" | "dataSourceKind" | "info1" | "info2" | "info3" | "analysis"
  >,
): string {
  return serializeBasicInfoSnapshotCore(state);
}

export function isBasicInfoDirty(state: StudioWizardState): boolean {
  return isBasicInfoDirtyCore(state, serializeBasicInfoSnapshot(createInitialWizardData()));
}

const initialInfo1: BasicInfoStep1 = {
  name: "",
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
  timelapseAmount: defaultIntervalMinutesForAssay(DEFAULT_ASSAY_ID),
  timelapseUnit: "minute",
  selectedFeatures: [ASSAY_FEATURE.TOTAL_FLUOR],
};

const initialAnalysis: AssayAnalysisConfig | null = analysisConfigForAssay(
  DEFAULT_ASSAY_ID,
  null,
) ?? null;

const initialInfo3: BasicInfoStep3 = {
  samples: [
    { ...emptySampleRow("sample:0"), channel: "0" },
    { ...emptySampleRow("sample:1"), channel: "1" },
  ],
};

function cloneSampleRow(
  id: string,
  row: Parameters<typeof sampleRowFromDisk>[0],
): BasicInfoSampleRow {
  return {
    id,
    ...sampleRowFromDisk(row),
  };
}

function cloneSamples(
  samples: BasicInfoSampleRow[] | BasicInfoStep3OnDisk["samples"],
): BasicInfoSampleRow[] {
  return samples.map((row, index) =>
    cloneSampleRow("id" in row && row.id ? row.id : `sample:${index}`, row),
  );
}

function normalizeInfo3(info3: BasicInfoStep3): BasicInfoStep3 {
  return {
    samples: cloneSamples(info3.samples ?? []),
  };
}

function mergeStudioState(persisted: unknown, current: StudioWizardState): StudioWizardState {
  const persistedState = persisted as Partial<StudioWizardState>;
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
    analysis:
      persistedState.analysis !== undefined
        ? analysisConfigForAssay(
            enabledAssayId(persistedState.assayId ?? current.assayId),
            persistedState.analysis,
          ) ?? null
        : current.analysis,
    basicInfoSavedSnapshot:
      typeof persistedState.basicInfoSavedSnapshot === "string"
        ? persistedState.basicInfoSavedSnapshot
        : null,
  };
}

export const STUDIO_SESSION_KEY = "lisca-studio-session";

function createInitialWizardData(): StudioWizardState {
  return {
    assayId: DEFAULT_ASSAY_ID,
    infoStep: 1,
    dataSourceKind: null,
    info1: { ...initialInfo1 },
    info2: { ...initialInfo2 },
    info3: {
      samples: cloneSamples(initialInfo3.samples),
    },
    analysis: initialAnalysis,
    basicInfoSavedSnapshot: null,
  };
}

export function readStudioSession(): StudioWizardState | null {
  const parsed = readStorageJson<{ state?: Partial<StudioWizardState> }>(
    liscaSessionStorage(),
    STUDIO_SESSION_KEY,
  );
  if (!parsed) return null;
  const persisted = parsed.state ?? (parsed as Partial<StudioWizardState>);
  return mergeStudioState(persisted, createInitialWizardData());
}

function writeStudioSession(state: StudioWizardState): void {
  writeStorageJson(liscaSessionStorage(), STUDIO_SESSION_KEY, { state });
}

export function createInitialStudioWizardState(): StudioWizardState {
  return createInitialWizardData();
}

export const studioWizardAtom = Atom.make(createInitialWizardData()).pipe(Atom.keepAlive);

type StateUpdater<T> = T | ((current: T) => T);

function patchStudioWizard(
  set: (update: StateUpdater<StudioWizardState>) => void,
  patch: Partial<StudioWizardState> | ((state: StudioWizardState) => StudioWizardState),
): void {
  set((state) => {
    const next = typeof patch === "function" ? patch(state) : { ...state, ...patch };
    writeStudioSession(next);
    return next;
  });
}

export const studioWizardActions = {
  setInfoStep(set: (update: StateUpdater<StudioWizardState>) => void, infoStep: InfoStep) {
    patchStudioWizard(set, { infoStep });
  },
  setDataSourceKind(
    set: (update: StateUpdater<StudioWizardState>) => void,
    dataSourceKind: StudioDataSourceKind,
  ) {
    patchStudioWizard(set, { dataSourceKind });
  },
  loadAssayJson(
    set: (update: StateUpdater<StudioWizardState>) => void,
    assayJson: StudioAssayJson,
  ) {
    const nextAssayId = enabledAssayId(assayJson.assayId) ?? DEFAULT_ASSAY_ID;
    const nextInfo1 = { ...assayJson.info1 };
    const nextInfo2 = {
      ...assayJson.info2,
      selectedFeatures: normalizeSelectedFeaturesForAssay(
        assayJson.assayId,
        assayJson.info2.selectedFeatures,
      ),
    };
    const nextInfo3 = {
      samples: cloneSamples(assayJson.info3.samples),
    };
    const nextAnalysis = analysisConfigForAssay(nextAssayId, assayJson.analysis) ?? null;
    const dataSourceKind =
      assayJson.dataSourceKind ?? inferDataSourceKind(assayJson.info1.dataPath);
    patchStudioWizard(set, {
      assayId: nextAssayId,
      infoStep: 1,
      dataSourceKind,
      info1: nextInfo1,
      info2: nextInfo2,
      info3: nextInfo3,
      analysis: nextAnalysis,
      basicInfoSavedSnapshot: JSON.stringify(
        buildStudioAssayJson({
          assayId: nextAssayId,
          dataSourceKind,
          info1: nextInfo1,
          info2: nextInfo2,
          info3: nextInfo3,
          analysis: nextAnalysis,
        }),
      ),
    });
  },
  setAssayId(set: (update: StateUpdater<StudioWizardState>) => void, assayId: AssayId | null) {
    const nextAssayId = enabledAssayId(assayId);
    patchStudioWizard(set, (current) => {
      const defaultInterval = defaultIntervalMinutesForAssay(nextAssayId);
      return {
        ...current,
        assayId: nextAssayId,
        info2: {
          ...current.info2,
          // Seed assay-specific interval default when the field is empty.
          timelapseAmount:
            current.info2.timelapseAmount ?? defaultInterval ?? current.info2.timelapseAmount,
          selectedFeatures: normalizeSelectedFeaturesForAssay(
            nextAssayId,
            nextAssayId === ASSAY_TYPE.TRANSFECTION ? current.info2.selectedFeatures : [],
          ),
        },
        analysis: analysisConfigForAssay(nextAssayId, current.analysis) ?? null,
      };
    });
  },
  setAnalysis(
    set: (update: StateUpdater<StudioWizardState>) => void,
    patch: Partial<AssayAnalysisConfig>,
  ) {
    patchStudioWizard(set, (current) => {
      if (!isTransfectionAssay(current.assayId)) {
        return { ...current, analysis: null };
      }
      const base = current.analysis ?? {
        maxOnsetMinutes: defaultMaxOnsetMinutesForAssay(current.assayId) ?? undefined,
      };
      return {
        ...current,
        analysis: analysisConfigForAssay(current.assayId, { ...base, ...patch }) ?? null,
      };
    });
  },
  setInfo1(set: (update: StateUpdater<StudioWizardState>) => void, patch: Partial<BasicInfoStep1>) {
    patchStudioWizard(set, (current) => ({ ...current, info1: { ...current.info1, ...patch } }));
  },
  setInfo2(set: (update: StateUpdater<StudioWizardState>) => void, patch: Partial<BasicInfoStep2>) {
    patchStudioWizard(set, (current) => ({
      ...current,
      info2: isTransfectionAssay(current.assayId)
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
  setInfo3(set: (update: StateUpdater<StudioWizardState>) => void, patch: Partial<BasicInfoStep3>) {
    patchStudioWizard(set, (current) => ({ ...current, info3: { ...current.info3, ...patch } }));
  },
  updateInfo3Sample(
    set: (update: StateUpdater<StudioWizardState>) => void,
    index: number,
    patch: Partial<BasicInfoSampleRow>,
  ) {
    patchStudioWizard(set, (current) => {
      const samples = current.info3.samples.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      );
      return {
        ...current,
        info3: {
          ...current.info3,
          samples,
        },
      };
    });
  },
  addInfo3Sample(set: (update: StateUpdater<StudioWizardState>) => void) {
    patchStudioWizard(set, (current) => {
      const id = `sample:${current.info3.samples.length}`;
      return {
        ...current,
        info3: {
          ...current.info3,
          samples: [...current.info3.samples, emptySampleRow(id)],
        },
      };
    });
  },
  removeInfo3Sample(set: (update: StateUpdater<StudioWizardState>) => void, index: number) {
    patchStudioWizard(set, (current) => {
      const samples = current.info3.samples.filter((_, i) => i !== index);
      return {
        ...current,
        info3: {
          ...current.info3,
          samples,
        },
      };
    });
  },
  setBasicInfoSavedSnapshot(
    set: (update: StateUpdater<StudioWizardState>) => void,
    basicInfoSavedSnapshot: string | null,
  ) {
    patchStudioWizard(set, { basicInfoSavedSnapshot });
  },
};

export type StudioWizardData = ReturnType<typeof createInitialStudioWizardState>;

export type StudioWizardActions = typeof studioWizardActions;

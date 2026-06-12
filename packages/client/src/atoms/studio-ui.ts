import type {
  StudioAssayId as AssayId,
  StudioAssayJson,
  StudioBasicInfoFeatureId as BasicInfo2FeatureId,
  StudioBasicInfoSampleRow as BasicInfoSampleRow,
  StudioBasicInfoSampleRowFields as BasicInfoSampleRowFields,
  StudioBasicInfoStep3OnDisk as BasicInfoStep3OnDisk,
  StudioBasicInfoSlideId as BasicInfoSlideId,
  StudioTimelapseUnit as TimelapseUnit,
  StudioBasicInfoStep1 as BasicInfoStep1,
  StudioBasicInfoStep2 as BasicInfoStep2,
  StudioBasicInfoStep3 as BasicInfoStep3,
  GeneExpressionAssayType,
  StudioDataSourceKind,
  EnabledStudioAssayId,
} from "@lisca/contracts/assay";
import {
  ASSAY_TYPE,
  ENABLED_STUDIO_ASSAY_IDS,
  GENE_EXPRESSION_FEATURE_IDS as CONTRACT_GENE_EXPRESSION_FEATURE_IDS,
  ASSAY_FEATURE,
  DEFAULT_FOLDER_SOURCE_TEMPLATE,
} from "@lisca/contracts/assay";
import { liscaSessionStorage, readStorageJson, writeStorageJson } from "@lisca/storage";
import { Atom } from "@effect-atom/atom-react";

import {
  ASSAY_CHOICE_LABEL,
  buildStudioAssayJson as buildStudioAssayJsonCore,
  inferDataSourceKind,
  normalizeSelectedFeaturesForAssay,
  parseStudioAssayJson as parseStudioAssayJsonCore,
} from "../studio/studio-assay-json";
import { sampleRowFromDisk, sampleRowToDisk } from "../studio/sample-positions";
import { isBasicInfoDirty as isBasicInfoDirtyCore, serializeBasicInfoSnapshot as serializeBasicInfoSnapshotCore } from "../studio/wizard-state";

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

export {
  ASSAY_CHOICE_LABEL,
  inferDataSourceKind,
  normalizeSelectedFeaturesForAssay,
} from "../studio/studio-assay-json";

export type StudioSampleRowAdapters = {
  sampleRowFromDisk: (record: {
    positions?: string;
    positionStart?: string;
    positionFinish?: string;
    channel: string;
    name: string;
    maskChannel: string;
    signalChannel: string;
  }) => BasicInfoSampleRowFields;
  sampleRowToDisk: (row: BasicInfoSampleRow) => {
    channel: string;
    name: string;
    positionStart: string;
    positionFinish: string;
    maskChannel: string;
    signalChannel: string;
    positions: string;
  };
};

const BASIC_INFO_FEATURE_IDS: ReadonlyArray<BasicInfo2FeatureId> =
  CONTRACT_GENE_EXPRESSION_FEATURE_IDS;
const BASIC_INFO_FEATURE_ID_SET = new Set<string>(BASIC_INFO_FEATURE_IDS);
const TIMELAPSE_UNIT_SET = new Set<TimelapseUnit>(["second", "minute", "hour"]);
const ENABLED_ASSAY_IDS = new Set<EnabledStudioAssayId>(ENABLED_STUDIO_ASSAY_IDS);
const DEFAULT_ASSAY_ID: AssayId = ASSAY_TYPE.GENE_EXPRESSION;

function isGeneExpressionAssay(assayId: AssayId | null): assayId is GeneExpressionAssayType {
  return assayId === ASSAY_TYPE.GENE_EXPRESSION;
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

export function createStudioUi(
  adapters: StudioSampleRowAdapters = { sampleRowFromDisk, sampleRowToDisk },
) {
  const { sampleRowFromDisk: readSampleRow, sampleRowToDisk: writeSampleRow } = adapters;

  function basicInfoAssayTitle(assayId: AssayId | null): string {
    if (!assayId) return "Assay";
    if (assayId === ASSAY_TYPE.CUSTOM_ASSAY) return ASSAY_CHOICE_LABEL[ASSAY_TYPE.CUSTOM_ASSAY];
    return `${ASSAY_CHOICE_LABEL[assayId]} assay`;
  }

  function buildStudioAssayJson({
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
    return buildStudioAssayJsonCore({
      assayId,
      dataSourceKind,
      info1,
      info2,
      info3,
      sampleRowToDisk: writeSampleRow,
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

  function parseStudioAssayJson(contents: string): StudioAssayJson {
    return parseStudioAssayJsonCore(contents, readSampleRow, writeSampleRow);
  }

  type StudioWizardState = {
    assayId: AssayId | null;
    infoStep: InfoStep;
    dataSourceKind: StudioDataSourceKind;
    info1: BasicInfoStep1;
    info2: BasicInfoStep2;
    info3: BasicInfoStep3;
    basicInfoSavedSnapshot: string | null;
  };

  function serializeBasicInfoSnapshot(
    state: Pick<StudioWizardState, "assayId" | "dataSourceKind" | "info1" | "info2" | "info3">,
  ): string {
    return serializeBasicInfoSnapshotCore(state);
  }

  function isBasicInfoDirty(state: StudioWizardState): boolean {
    return isBasicInfoDirtyCore(state, serializeBasicInfoSnapshot(createInitialWizardData()));
  }

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
      "slide-i": [{ ...emptySampleRow("slide-i:0"), channel: "0" }],
      "slide-vi": [
        { ...emptySampleRow("slide-vi:0"), channel: "0" },
        { ...emptySampleRow("slide-vi:1"), channel: "1" },
        { ...emptySampleRow("slide-vi:2"), channel: "2" },
        { ...emptySampleRow("slide-vi:3"), channel: "3" },
        { ...emptySampleRow("slide-vi:4"), channel: "4" },
        { ...emptySampleRow("slide-vi:5"), channel: "5" },
      ],
    },
  };

  function cloneSampleRow(
    id: string,
    row: Parameters<StudioSampleRowAdapters["sampleRowFromDisk"]>[0],
  ): BasicInfoSampleRow {
    return {
      id,
      ...readSampleRow(row),
    };
  }

  function cloneSamplesBySlide(
    samplesBySlide:
      | Record<BasicInfoSlideId, BasicInfoSampleRow[]>
      | BasicInfoStep3OnDisk["samplesBySlide"],
  ): Record<BasicInfoSlideId, BasicInfoSampleRow[]> {
    return {
      "slide-i": samplesBySlide["slide-i"].map((row, index) =>
        cloneSampleRow("id" in row && row.id ? row.id : `slide-i:${index}`, row),
      ),
      "slide-vi": samplesBySlide["slide-vi"].map((row, index) =>
        cloneSampleRow("id" in row && row.id ? row.id : `slide-vi:${index}`, row),
      ),
    };
  }

  function normalizeInfo3(info3: BasicInfoStep3): BasicInfoStep3 {
    return {
      selectedSlideId: info3.selectedSlideId,
      samplesBySlide: cloneSamplesBySlide(info3.samplesBySlide),
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
      basicInfoSavedSnapshot:
        typeof persistedState.basicInfoSavedSnapshot === "string"
          ? persistedState.basicInfoSavedSnapshot
          : null,
    };
  }

  const STUDIO_SESSION_KEY = "lisca-studio-session";

  function createInitialWizardData(): StudioWizardState {
    return {
      assayId: DEFAULT_ASSAY_ID,
      infoStep: 1,
      dataSourceKind: null,
      info1: { ...initialInfo1 },
      info2: { ...initialInfo2 },
      info3: {
        selectedSlideId: initialInfo3.selectedSlideId,
        samplesBySlide: cloneSamplesBySlide(initialInfo3.samplesBySlide),
      },
      basicInfoSavedSnapshot: null,
    };
  }

  function readStudioSession(): StudioWizardState | null {
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

  function createInitialStudioWizardState(): StudioWizardState {
    return createInitialWizardData();
  }

  const studioWizardAtom = Atom.make(createInitialWizardData()).pipe(Atom.keepAlive);

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

  const studioWizardActions = {
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
        selectedSlideId: assayJson.info3.selectedSlideId,
        samplesBySlide: cloneSamplesBySlide(assayJson.info3.samplesBySlide),
      };
      patchStudioWizard(set, {
        assayId: nextAssayId,
        infoStep: 1,
        dataSourceKind: assayJson.dataSourceKind ?? inferDataSourceKind(assayJson.info1.dataPath),
        info1: nextInfo1,
        info2: nextInfo2,
        info3: nextInfo3,
        basicInfoSavedSnapshot: JSON.stringify(
          buildStudioAssayJson({
            assayId: nextAssayId,
            dataSourceKind:
              assayJson.dataSourceKind ?? inferDataSourceKind(assayJson.info1.dataPath),
            info1: nextInfo1,
            info2: nextInfo2,
            info3: nextInfo3,
          }),
        ),
      });
    },
    setAssayId(set: (update: StateUpdater<StudioWizardState>) => void, assayId: AssayId | null) {
      const nextAssayId = enabledAssayId(assayId);
      patchStudioWizard(set, (current) => ({
        ...current,
        assayId: nextAssayId,
        info2: {
          ...current.info2,
          selectedFeatures: normalizeSelectedFeaturesForAssay(
            nextAssayId,
            nextAssayId === ASSAY_TYPE.GENE_EXPRESSION ? current.info2.selectedFeatures : [],
          ),
        },
      }));
    },
    setInfo1(
      set: (update: StateUpdater<StudioWizardState>) => void,
      patch: Partial<BasicInfoStep1>,
    ) {
      patchStudioWizard(set, (current) => ({ ...current, info1: { ...current.info1, ...patch } }));
    },
    setInfo2(
      set: (update: StateUpdater<StudioWizardState>) => void,
      patch: Partial<BasicInfoStep2>,
    ) {
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
    setInfo3(
      set: (update: StateUpdater<StudioWizardState>) => void,
      patch: Partial<BasicInfoStep3>,
    ) {
      patchStudioWizard(set, (current) => ({ ...current, info3: { ...current.info3, ...patch } }));
    },
    updateInfo3Sample(
      set: (update: StateUpdater<StudioWizardState>) => void,
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
    setBasicInfoSavedSnapshot(
      set: (update: StateUpdater<StudioWizardState>) => void,
      basicInfoSavedSnapshot: string | null,
    ) {
      patchStudioWizard(set, { basicInfoSavedSnapshot });
    },
  };

  return {
    STUDIO_SESSION_KEY,
    basicInfoAssayTitle,
    buildStudioAssayJson,
    parseStudioAssayJson,
    serializeBasicInfoSnapshot,
    isBasicInfoDirty,
    readStudioSession,
    createInitialStudioWizardState,
    studioWizardAtom,
    studioWizardActions,
  };
}

export type StudioWizardData = ReturnType<
  ReturnType<typeof createStudioUi>["createInitialStudioWizardState"]
>;

export type StudioWizardActions = ReturnType<typeof createStudioUi>["studioWizardActions"];

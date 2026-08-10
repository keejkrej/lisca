import type {
  AssayAnalysisConfig,
  StudioAssayId as AssayId,
  StudioAssayJson,
  StudioAssaySampleRow as BasicInfoSampleRow,
  StudioIntervalUnit as IntervalUnit,
  TransfectionAssayType,
  StudioDataSourceKind,
  EnabledStudioAssayId,
} from "@lisca/contracts/assay";
import {
  ASSAY_TYPE,
  ENABLED_STUDIO_ASSAY_IDS,
  DEFAULT_FOLDER_SOURCE_TEMPLATE,
} from "@lisca/contracts/assay";
import { liscaSessionStorage, readStorageJson, writeStorageJson } from "@lisca/utils";
import { Atom } from "@effect-atom/atom-solid";

import {
  ASSAY_CHOICE_LABEL,
  analysisConfigForAssay,
  buildStudioAssayJson as buildStudioAssayJsonCore,
  dataSourceKindFromAssayData,
  defaultIntervalMinutesForAssay,
  defaultMaxOnsetMinutesForAssay,
  inferDataSourceKind,
  parseStudioAssayJson as parseStudioAssayJsonCore,
} from "../studio/studio-assay-json";
import { sampleRowFromDisk, sampleRowToDisk } from "../studio/sample-positions";
import {
  isBasicInfoDirty as isBasicInfoDirtyCore,
  serializeBasicInfoSnapshot as serializeBasicInfoSnapshotCore,
} from "../studio/wizard-state";

export type { AssayId, BasicInfoSampleRow, StudioAssayJson, StudioDataSourceKind, IntervalUnit };

/** @deprecated Prefer IntervalUnit */
export type TimelapseUnit = IntervalUnit;

export type StudioStep = "chooseAssay" | "info1" | "info2" | "alignPattern";
export type InfoStep = 1 | 2;

export {
  ASSAY_CHOICE_LABEL,
  assayDisplayLabel,
  inferDataSourceKind,
} from "../studio/studio-assay-json";

const INTERVAL_UNIT_SET = new Set<IntervalUnit>(["second", "minute", "hour"]);
const ENABLED_ASSAY_IDS = new Set<EnabledStudioAssayId>(ENABLED_STUDIO_ASSAY_IDS);
const DEFAULT_ASSAY_ID: AssayId = ASSAY_TYPE.TRANSFECTION;

function isTransfectionAssay(assayId: AssayId | null): assayId is TransfectionAssayType {
  return assayId === ASSAY_TYPE.TRANSFECTION;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emptySampleRow(id: string): BasicInfoSampleRow {
  return {
    id,
    slideChannel: "",
    name: "",
    positionStart: "",
    positionFinish: "",
    mask: "",
    signal: "",
  };
}

function isIntervalUnit(value: unknown): value is IntervalUnit {
  return typeof value === "string" && INTERVAL_UNIT_SET.has(value as IntervalUnit);
}

function enabledAssayId(assayId: AssayId | null): AssayId | null {
  if (assayId && ENABLED_ASSAY_IDS.has(assayId as EnabledStudioAssayId)) {
    return assayId;
  }
  return DEFAULT_ASSAY_ID;
}

export function basicInfoAssayTitle(assayId: AssayId | null): string {
  if (!assayId) return "Assay";
  return `${ASSAY_CHOICE_LABEL[assayId]} assay`;
}

export function buildStudioAssayJson({
  assayId,
  name,
  dataSourceKind,
  dataPath,
  folderTemplate,
  workspacePath,
  intervalValue,
  intervalUnit,
  samples,
  analysis,
}: {
  assayId: AssayId;
  name: string;
  dataSourceKind: StudioDataSourceKind;
  dataPath: string;
  folderTemplate: { subfolder: string; filename: string };
  workspacePath: string;
  intervalValue: number | null;
  intervalUnit: IntervalUnit;
  samples: BasicInfoSampleRow[];
  analysis?: AssayAnalysisConfig | null;
}): StudioAssayJson {
  return buildStudioAssayJsonCore({
    assayId,
    name,
    dataSourceKind,
    dataPath,
    folderTemplate,
    workspacePath,
    intervalValue,
    intervalUnit,
    samples,
    analysis,
    sampleRowToDisk,
  });
}

export function parseStudioAssayJson(contents: string): StudioAssayJson {
  return parseStudioAssayJsonCore(contents, sampleRowFromDisk, sampleRowToDisk);
}

export type StudioWizardState = {
  assayId: AssayId | null;
  infoStep: InfoStep;
  name: string;
  dataSourceKind: StudioDataSourceKind;
  dataPath: string;
  folderTemplate: { subfolder: string; filename: string };
  workspacePath: string;
  intervalValue: number | null;
  intervalUnit: IntervalUnit;
  samples: BasicInfoSampleRow[];
  /** Assay-dependent analysis params (transfection: maxOnsetMinutes, skipSegment). */
  analysis: AssayAnalysisConfig | null;
  basicInfoSavedSnapshot: string | null;
};

/** Build on-disk assay.json from the current wizard state. */
export function buildStudioAssayJsonFromWizard(
  state: Pick<
    StudioWizardState,
    | "assayId"
    | "name"
    | "dataSourceKind"
    | "dataPath"
    | "folderTemplate"
    | "workspacePath"
    | "intervalValue"
    | "intervalUnit"
    | "samples"
    | "analysis"
  >,
): StudioAssayJson {
  return buildStudioAssayJson({
    assayId: state.assayId ?? ASSAY_TYPE.TRANSFECTION,
    name: state.name,
    dataSourceKind: state.dataSourceKind,
    dataPath: state.dataPath,
    folderTemplate: state.folderTemplate,
    workspacePath: state.workspacePath,
    intervalValue: state.intervalValue,
    intervalUnit: state.intervalUnit,
    samples: state.samples,
    analysis: state.analysis,
  });
}

export function serializeBasicInfoSnapshot(
  state: Pick<
    StudioWizardState,
    | "assayId"
    | "name"
    | "dataSourceKind"
    | "dataPath"
    | "folderTemplate"
    | "workspacePath"
    | "intervalValue"
    | "intervalUnit"
    | "samples"
    | "analysis"
  >,
): string {
  return serializeBasicInfoSnapshotCore(state);
}

export function isBasicInfoDirty(state: StudioWizardState): boolean {
  return isBasicInfoDirtyCore(state, serializeBasicInfoSnapshot(createInitialWizardData()));
}

const initialFolderTemplate = {
  subfolder: DEFAULT_FOLDER_SOURCE_TEMPLATE.subfolderTemplate,
  filename: DEFAULT_FOLDER_SOURCE_TEMPLATE.filenameTemplate,
};

const initialAnalysis: AssayAnalysisConfig | null =
  analysisConfigForAssay(DEFAULT_ASSAY_ID, null) ?? null;

function cloneSampleRow(id: string, row: BasicInfoSampleRow): BasicInfoSampleRow {
  return {
    id,
    slideChannel: row.slideChannel,
    name: row.name,
    positionStart: row.positionStart,
    positionFinish: row.positionFinish,
    mask: row.mask,
    signal: row.signal,
  };
}

function cloneSamples(samples: BasicInfoSampleRow[]): BasicInfoSampleRow[] {
  return samples.map((row, index) => cloneSampleRow(row.id ? row.id : `sample:${index}`, row));
}

function mergeStudioState(persisted: unknown, current: StudioWizardState): StudioWizardState {
  const persistedState = persisted as Partial<StudioWizardState> & {
    info1?: {
      name?: string;
      dataPath?: string;
      saveTo?: string;
      folderSubfolderTemplate?: string;
      folderFilenameTemplate?: string;
    };
    info2?: { timelapseAmount?: number | null; timelapseUnit?: IntervalUnit };
    info3?: { samples?: BasicInfoSampleRow[] };
  };
  const assayId = enabledAssayId(persistedState.assayId ?? current.assayId);

  const name = persistedState.name ?? persistedState.info1?.name ?? current.name;
  const dataPath = persistedState.dataPath ?? persistedState.info1?.dataPath ?? current.dataPath;
  const workspacePath =
    persistedState.workspacePath ?? persistedState.info1?.saveTo ?? current.workspacePath;
  const folderTemplate = persistedState.folderTemplate ?? {
    subfolder:
      persistedState.info1?.folderSubfolderTemplate ?? current.folderTemplate.subfolder,
    filename: persistedState.info1?.folderFilenameTemplate ?? current.folderTemplate.filename,
  };
  const samples = persistedState.samples
    ? cloneSamples(persistedState.samples)
    : persistedState.info3?.samples
      ? cloneSamples(persistedState.info3.samples)
      : current.samples;

  let intervalValue = current.intervalValue;
  if (persistedState.intervalValue !== undefined) {
    intervalValue = persistedState.intervalValue;
  } else if (persistedState.info2?.timelapseAmount !== undefined) {
    intervalValue = persistedState.info2.timelapseAmount;
  }

  let intervalUnit = current.intervalUnit;
  if (persistedState.intervalUnit !== undefined && isIntervalUnit(persistedState.intervalUnit)) {
    intervalUnit = persistedState.intervalUnit;
  } else if (
    persistedState.info2?.timelapseUnit !== undefined &&
    isIntervalUnit(persistedState.info2.timelapseUnit)
  ) {
    intervalUnit = persistedState.info2.timelapseUnit;
  }

  return {
    ...current,
    assayId,
    infoStep: persistedState.infoStep ?? current.infoStep,
    name,
    dataSourceKind: persistedState.dataSourceKind ?? inferDataSourceKind(dataPath),
    dataPath,
    folderTemplate,
    workspacePath,
    intervalValue,
    intervalUnit,
    samples,
    analysis:
      persistedState.analysis !== undefined
        ? analysisConfigForAssay(assayId, persistedState.analysis) ?? null
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
    name: "",
    dataSourceKind: null,
    dataPath: "",
    folderTemplate: { ...initialFolderTemplate },
    workspacePath: "",
    intervalValue: defaultIntervalMinutesForAssay(DEFAULT_ASSAY_ID),
    intervalUnit: "minute",
    samples: [
      { ...emptySampleRow("sample:0"), slideChannel: "0" },
      { ...emptySampleRow("sample:1"), slideChannel: "1" },
    ],
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
    const nextAssayId = enabledAssayId(assayJson.type) ?? DEFAULT_ASSAY_ID;
    const dataSourceKind = dataSourceKindFromAssayData(assayJson.data);
    const folderTemplate =
      assayJson.data.type === "folder"
        ? assayJson.data.template
        : { ...initialFolderTemplate };
    const samples = cloneSamples(
      assayJson.samples.map((row, index) => ({
        id: `sample:${index}`,
        ...sampleRowFromDisk(row, assayJson.analysis),
      })),
    );
    const nextAnalysis = analysisConfigForAssay(nextAssayId, assayJson.analysis) ?? null;
    patchStudioWizard(set, {
      assayId: nextAssayId,
      infoStep: 1,
      name: assayJson.name,
      dataSourceKind,
      dataPath: assayJson.data.path,
      folderTemplate,
      workspacePath: assayJson.workspace.path,
      intervalValue: assayJson.interval.value,
      intervalUnit: assayJson.interval.unit,
      samples,
      analysis: nextAnalysis,
      basicInfoSavedSnapshot: JSON.stringify(
        buildStudioAssayJson({
          assayId: nextAssayId,
          name: assayJson.name,
          dataSourceKind,
          dataPath: assayJson.data.path,
          folderTemplate,
          workspacePath: assayJson.workspace.path,
          intervalValue: assayJson.interval.value,
          intervalUnit: assayJson.interval.unit,
          samples,
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
        intervalValue: current.intervalValue ?? defaultInterval ?? current.intervalValue,
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
        skipSegment: false,
      };
      return {
        ...current,
        analysis: analysisConfigForAssay(current.assayId, { ...base, ...patch }) ?? null,
      };
    });
  },
  patchWizard(
    set: (update: StateUpdater<StudioWizardState>) => void,
    patch: Partial<StudioWizardState>,
  ) {
    patchStudioWizard(set, patch);
  },
  updateSample(
    set: (update: StateUpdater<StudioWizardState>) => void,
    index: number,
    patch: Partial<BasicInfoSampleRow>,
  ) {
    patchStudioWizard(set, (current) => ({
      ...current,
      samples: current.samples.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  },
  addSample(set: (update: StateUpdater<StudioWizardState>) => void) {
    patchStudioWizard(set, (current) => {
      const id = `sample:${current.samples.length}`;
      return {
        ...current,
        samples: [...current.samples, emptySampleRow(id)],
      };
    });
  },
  removeSample(set: (update: StateUpdater<StudioWizardState>) => void, index: number) {
    patchStudioWizard(set, (current) => ({
      ...current,
      samples: current.samples.filter((_, i) => i !== index),
    }));
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

import type { StudioAssayJson, StudioDataSourceKind } from "@lisca/contracts/assay";
import {
  STUDIO_SESSION_KEY,
  basicInfoAssayTitle,
  buildStudioAssayJson,
  buildStudioAssayJsonFromWizard,
  createInitialStudioWizardState,
  isBasicInfoDirty,
  parseStudioAssayJson,
  readStudioSession,
  serializeBasicInfoSnapshot,
  studioWizardActions,
  studioWizardAtom,
  type InfoStep,
} from "@lisca/client/atoms/studio-ui";

import { setStudioAtom, studioRegistry } from "./studio-registry";

export type {
  AssayId,
  BasicInfoSampleRow,
  InfoStep,
  StudioAssayJson,
  StudioDataSourceKind,
  StudioStep,
  TimelapseUnit,
  IntervalUnit,
} from "@lisca/client/atoms/studio-ui";
export {
  ASSAY_CHOICE_LABEL,
  assayDisplayLabel,
  inferDataSourceKind,
} from "@lisca/client/atoms/studio-ui";
export {
  STUDIO_SESSION_KEY,
  basicInfoAssayTitle,
  buildStudioAssayJson,
  buildStudioAssayJsonFromWizard,
  parseStudioAssayJson,
  serializeBasicInfoSnapshot,
  isBasicInfoDirty,
  readStudioSession,
  createInitialStudioWizardState,
  studioWizardAtom,
  studioWizardActions,
};

export type StudioWizardData = ReturnType<typeof createInitialStudioWizardState>;

export type StudioState = StudioWizardData & {
  readonly loadAssayJson: (assayJson: StudioAssayJson) => void;
  readonly setAssayId: (id: StudioWizardData["assayId"]) => void;
  readonly setInfoStep: (step: InfoStep) => void;
  readonly setDataSourceKind: (kind: StudioDataSourceKind) => void;
  readonly patchWizard: (patch: Partial<StudioWizardData>) => void;
  readonly setAnalysis: (patch: Partial<NonNullable<StudioWizardData["analysis"]>>) => void;
  readonly updateSample: (
    index: number,
    patch: Partial<StudioWizardData["samples"][number]>,
  ) => void;
  readonly addSample: () => void;
  readonly removeSample: (index: number) => void;
  readonly setBasicInfoSavedSnapshot: (snapshot: string | null) => void;
};

const setWizard = (update: StudioWizardData | ((current: StudioWizardData) => StudioWizardData)) =>
  setStudioAtom(studioWizardAtom, update);

export const studioStoreActions = {
  setInfoStep: (infoStep: InfoStep) => studioWizardActions.setInfoStep(setWizard, infoStep),
  setDataSourceKind: (dataSourceKind: StudioDataSourceKind) =>
    studioWizardActions.setDataSourceKind(setWizard, dataSourceKind),
  loadAssayJson: (assayJson: StudioAssayJson) =>
    studioWizardActions.loadAssayJson(setWizard, assayJson),
  setAssayId: (assayId: StudioWizardData["assayId"]) =>
    studioWizardActions.setAssayId(setWizard, assayId),
  patchWizard: (patch: Partial<StudioWizardData>) =>
    studioWizardActions.patchWizard(setWizard, patch),
  setAnalysis: (patch: Partial<NonNullable<StudioWizardData["analysis"]>>) =>
    studioWizardActions.setAnalysis(setWizard, patch),
  updateSample: (index: number, patch: Partial<StudioWizardData["samples"][number]>) =>
    studioWizardActions.updateSample(setWizard, index, patch),
  addSample: () => studioWizardActions.addSample(setWizard),
  removeSample: (index: number) => studioWizardActions.removeSample(setWizard, index),
  setBasicInfoSavedSnapshot: (basicInfoSavedSnapshot: string | null) =>
    studioWizardActions.setBasicInfoSavedSnapshot(setWizard, basicInfoSavedSnapshot),
};

export function getStudioStore(): StudioState {
  return {
    ...studioRegistry.get(studioWizardAtom),
    ...studioStoreActions,
  };
}

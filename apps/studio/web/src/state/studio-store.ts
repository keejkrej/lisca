import type { StudioAssayJson } from "@lisca/contracts/assay";
import type { StudioDataSourceKind } from "@lisca/contracts/assay";
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
} from "@lisca/client/atoms/studio-ui";
import { useAtom } from "@effect-atom/atom-solid";
import { createMemo, type Accessor } from "solid-js";

export type {
  AssayId,
  BasicInfoSampleRow,
  StudioAssayJson,
  StudioDataSourceKind,
  TimelapseUnit,
  IntervalUnit,
} from "@lisca/client/atoms/studio-ui";
export type { StudioStep, InfoStep } from "@lisca/client/atoms/studio-ui";
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
type StudioWizardData = ReturnType<typeof createInitialStudioWizardState>;
type StudioState = StudioWizardData & {
  loadAssayJson: (assayJson: StudioAssayJson) => void;
  setAssayId: (id: StudioWizardData["assayId"]) => void;
  setInfoStep: (step: import("@lisca/client/atoms/studio-ui").InfoStep) => void;
  setDataSourceKind: (kind: StudioDataSourceKind) => void;
  patchWizard: (patch: Partial<StudioWizardData>) => void;
  setAnalysis: (patch: Partial<NonNullable<StudioWizardData["analysis"]>>) => void;
  updateSample: (
    index: number,
    patch: Partial<StudioWizardData["samples"][number]>,
  ) => void;
  addSample: () => void;
  removeSample: (index: number) => void;
  setBasicInfoSavedSnapshot: (snapshot: string | null) => void;
};
function useStudioStoreApi(): Accessor<StudioState> {
  const [state, setState] = useAtom(studioWizardAtom);
  const setInfoStep = (infoStep: import("@lisca/client/atoms/studio-ui").InfoStep) =>
    studioWizardActions.setInfoStep(setState, infoStep);
  const setDataSourceKind = (dataSourceKind: StudioDataSourceKind) =>
    studioWizardActions.setDataSourceKind(setState, dataSourceKind);
  const loadAssayJson = (assayJson: StudioAssayJson) =>
    studioWizardActions.loadAssayJson(setState, assayJson);
  const setAssayId = (assayId: StudioWizardData["assayId"]) =>
    studioWizardActions.setAssayId(setState, assayId);
  const patchWizard = (patch: Partial<StudioWizardData>) =>
    studioWizardActions.patchWizard(setState, patch);
  const setAnalysis = (patch: Partial<NonNullable<StudioWizardData["analysis"]>>) =>
    studioWizardActions.setAnalysis(setState, patch);
  const updateSample = (
    index: number,
    patch: Partial<StudioWizardData["samples"][number]>,
  ) => studioWizardActions.updateSample(setState, index, patch);
  const addSample = () => studioWizardActions.addSample(setState);
  const removeSample = (index: number) => studioWizardActions.removeSample(setState, index);
  const setBasicInfoSavedSnapshot = (basicInfoSavedSnapshot: string | null) =>
    studioWizardActions.setBasicInfoSavedSnapshot(setState, basicInfoSavedSnapshot);

  return createMemo(() => ({
    ...state(),
    loadAssayJson,
    setAssayId,
    setInfoStep,
    setDataSourceKind,
    patchWizard,
    setAnalysis,
    updateSample,
    addSample,
    removeSample,
    setBasicInfoSavedSnapshot,
  }));
}

export function useStudioStore(): Accessor<StudioState>;
export function useStudioStore<T>(selector: (state: StudioState) => T): Accessor<T>;
export function useStudioStore<T>(selector?: (state: StudioState) => T) {
  const store = useStudioStoreApi();
  if (!selector) return store;
  return createMemo(() => selector(store()));
}

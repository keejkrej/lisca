import type { StudioAssayJson } from "@lisca/contracts/assay";
import type { StudioDataSourceKind } from "@lisca/contracts/assay";
import {
  STUDIO_SESSION_KEY,
  basicInfoAssayTitle,
  buildStudioAssayJson,
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
  BasicInfo2FeatureId,
  BasicInfoSampleRow,
  BasicInfoStep1,
  BasicInfoStep2,
  BasicInfoStep3,
  StudioAssayJson,
  StudioDataSourceKind,
  TimelapseUnit,
} from "@lisca/client/atoms/studio-ui";
export type { StudioStep, InfoStep } from "@lisca/client/atoms/studio-ui";
export {
  ASSAY_CHOICE_LABEL,
  inferDataSourceKind,
  normalizeSelectedFeaturesForAssay,
} from "@lisca/client/atoms/studio-ui";
export {
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
type StudioWizardData = ReturnType<typeof createInitialStudioWizardState>;
type StudioState = StudioWizardData & {
  loadAssayJson: (assayJson: StudioAssayJson) => void;
  setAssayId: (id: StudioWizardData["assayId"]) => void;
  setInfoStep: (step: import("@lisca/client/atoms/studio-ui").InfoStep) => void;
  setDataSourceKind: (kind: StudioDataSourceKind) => void;
  setInfo1: (patch: Partial<StudioWizardData["info1"]>) => void;
  setInfo2: (patch: Partial<StudioWizardData["info2"]>) => void;
  setAnalysis: (patch: Partial<NonNullable<StudioWizardData["analysis"]>>) => void;
  setInfo3: (patch: Partial<StudioWizardData["info3"]>) => void;
  updateInfo3Sample: (
    index: number,
    patch: Partial<StudioWizardData["info3"]["samples"][number]>,
  ) => void;
  addInfo3Sample: () => void;
  removeInfo3Sample: (index: number) => void;
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
  const setInfo1 = (patch: Partial<StudioWizardData["info1"]>) =>
    studioWizardActions.setInfo1(setState, patch);
  const setInfo2 = (patch: Partial<StudioWizardData["info2"]>) =>
    studioWizardActions.setInfo2(setState, patch);
  const setAnalysis = (patch: Partial<NonNullable<StudioWizardData["analysis"]>>) =>
    studioWizardActions.setAnalysis(setState, patch);
  const setInfo3 = (patch: Partial<StudioWizardData["info3"]>) =>
    studioWizardActions.setInfo3(setState, patch);
  const updateInfo3Sample = (
    index: number,
    patch: Partial<StudioWizardData["info3"]["samples"][number]>,
  ) => studioWizardActions.updateInfo3Sample(setState, index, patch);
  const addInfo3Sample = () => studioWizardActions.addInfo3Sample(setState);
  const removeInfo3Sample = (index: number) =>
    studioWizardActions.removeInfo3Sample(setState, index);
  const setBasicInfoSavedSnapshot = (basicInfoSavedSnapshot: string | null) =>
    studioWizardActions.setBasicInfoSavedSnapshot(setState, basicInfoSavedSnapshot);
  return createMemo(() => ({
    ...state(),
    setInfoStep,
    setDataSourceKind,
    loadAssayJson,
    setAssayId,
    setInfo1,
    setInfo2,
    setAnalysis,
    setInfo3,
    updateInfo3Sample,
    addInfo3Sample,
    removeInfo3Sample,
    setBasicInfoSavedSnapshot,
  }));
}
export function useStudioStore<T>(selector: (state: StudioState) => T): Accessor<T> {
  const api = useStudioStoreApi();
  return createMemo(() => selector(api()));
}

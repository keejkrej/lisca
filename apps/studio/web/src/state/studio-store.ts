import type { StudioAssayJson } from "@lisca/contracts/assay";
import type { StudioDataSourceKind } from "@lisca/contracts/assay";
import { createStudioUi } from "@lisca/client/atoms/studio-ui";
import { useAtom } from "@effect-atom/atom-react";
import { useRef } from "react";
import { sampleRowFromDisk, sampleRowToDisk } from "../utils/sample-positions";
const studioUi = createStudioUi({
  sampleRowFromDisk,
  sampleRowToDisk,
});
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
} from "@lisca/client/atoms/studio-ui";
export type { StudioStep, InfoStep } from "@lisca/client/atoms/studio-ui";
export {
  ASSAY_CHOICE_LABEL,
  inferDataSourceKind,
  normalizeSelectedFeaturesForAssay,
} from "@lisca/client/atoms/studio-ui";
export const {
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
} = studioUi;
type StudioWizardData = ReturnType<typeof createInitialStudioWizardState>;
type StudioState = StudioWizardData & {
  loadAssayJson: (assayJson: StudioAssayJson) => void;
  setAssayId: (id: StudioWizardData["assayId"]) => void;
  setInfoStep: (step: import("@lisca/client/atoms/studio-ui").InfoStep) => void;
  setDataSourceKind: (kind: StudioDataSourceKind) => void;
  setInfo1: (patch: Partial<StudioWizardData["info1"]>) => void;
  setInfo2: (patch: Partial<StudioWizardData["info2"]>) => void;
  setInfo3: (patch: Partial<StudioWizardData["info3"]>) => void;
  updateInfo3Sample: (
    index: number,
    patch: Partial<StudioWizardData["info3"]["samplesBySlide"]["slide-i"][number]>,
  ) => void;
  setBasicInfoSavedSnapshot: (snapshot: string | null) => void;
};
function useStudioStoreApi(): StudioState {
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
  const setInfo3 = (patch: Partial<StudioWizardData["info3"]>) =>
    studioWizardActions.setInfo3(setState, patch);
  const updateInfo3Sample = (
    index: number,
    patch: Partial<StudioWizardData["info3"]["samplesBySlide"]["slide-i"][number]>,
  ) => studioWizardActions.updateInfo3Sample(setState, index, patch);
  const setBasicInfoSavedSnapshot = (basicInfoSavedSnapshot: string | null) =>
    studioWizardActions.setBasicInfoSavedSnapshot(setState, basicInfoSavedSnapshot);
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
    setBasicInfoSavedSnapshot,
  };
}
export function useStudioStore<T>(selector: (state: StudioState) => T): T {
  const api = useStudioStoreApi();
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  return selectorRef.current(api);
}

import type {
  StudioAssayJson,
  StudioDataSourceKind,
} from "@lisca/contracts";
import { createStudioUi } from "@lisca/client/atoms/studio-ui";
import { useAtom } from "@effect-atom/atom-react";
import { useCallback, useRef } from "react";

import { sampleRowFromDisk, sampleRowToDisk } from "../utils/sample-positions";

const studioUi = createStudioUi({ sampleRowFromDisk, sampleRowToDisk });

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

  const setInfoStep = useCallback(
    (infoStep: import("@lisca/client/atoms/studio-ui").InfoStep) =>
      studioWizardActions.setInfoStep(setState, infoStep),
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
    (assayId: StudioWizardData["assayId"]) => studioWizardActions.setAssayId(setState, assayId),
    [setState],
  );
  const setInfo1 = useCallback(
    (patch: Partial<StudioWizardData["info1"]>) => studioWizardActions.setInfo1(setState, patch),
    [setState],
  );
  const setInfo2 = useCallback(
    (patch: Partial<StudioWizardData["info2"]>) => studioWizardActions.setInfo2(setState, patch),
    [setState],
  );
  const setInfo3 = useCallback(
    (patch: Partial<StudioWizardData["info3"]>) => studioWizardActions.setInfo3(setState, patch),
    [setState],
  );
  const updateInfo3Sample = useCallback(
    (index: number, patch: Partial<StudioWizardData["info3"]["samplesBySlide"]["slide-i"][number]>) =>
      studioWizardActions.updateInfo3Sample(setState, index, patch),
    [setState],
  );
  const setBasicInfoSavedSnapshot = useCallback(
    (basicInfoSavedSnapshot: string | null) =>
      studioWizardActions.setBasicInfoSavedSnapshot(setState, basicInfoSavedSnapshot),
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
    setBasicInfoSavedSnapshot,
  };
}

export function useStudioStore<T>(selector: (state: StudioState) => T): T {
  const api = useStudioStoreApi();
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  return selectorRef.current(api);
}

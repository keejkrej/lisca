import type {
  AssayAnalysisConfig,
  StudioAssayId,
  StudioBasicInfoStep1,
  StudioBasicInfoStep2,
  StudioBasicInfoStep3,
  StudioDataSourceKind,
} from "@lisca/contracts/assay";
import { ASSAY_TYPE } from "@lisca/contracts/assay";

import { sampleRowToDisk } from "./sample-positions";
import { buildStudioAssayJson } from "./studio-assay-json";

export type BasicInfoSnapshotState = {
  assayId: StudioAssayId | null;
  dataSourceKind: StudioDataSourceKind;
  info1: StudioBasicInfoStep1;
  info2: StudioBasicInfoStep2;
  info3: StudioBasicInfoStep3;
  /** Assay-dependent analysis options (e.g. transfection maxOnsetMinutes). */
  analysis: AssayAnalysisConfig | null;
};

export type BasicInfoDirtyState = BasicInfoSnapshotState & {
  basicInfoSavedSnapshot: string | null;
};

export function serializeBasicInfoSnapshot(state: BasicInfoSnapshotState): string {
  const assayId = state.assayId ?? ASSAY_TYPE.TRANSFECTION;
  return JSON.stringify(
    buildStudioAssayJson({
      assayId,
      dataSourceKind: state.dataSourceKind,
      info1: state.info1,
      info2: state.info2,
      info3: state.info3,
      analysis: state.analysis,
      sampleRowToDisk,
    }),
  );
}

export function isBasicInfoDirty(state: BasicInfoDirtyState, baselineSnapshot: string): boolean {
  const current = serializeBasicInfoSnapshot(state);
  const baseline = state.basicInfoSavedSnapshot ?? baselineSnapshot;
  return current !== baseline;
}

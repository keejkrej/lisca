import type {
  AssayAnalysisConfig,
  StudioAssayId,
  StudioAssaySampleRow,
  StudioDataSourceKind,
  StudioIntervalUnit,
} from "@lisca/contracts/assay";
import { ASSAY_TYPE, DEFAULT_FOLDER_SOURCE_TEMPLATE } from "@lisca/contracts/assay";

import { sampleRowToDisk } from "./sample-positions";
import { buildStudioAssayJson } from "./studio-assay-json";

export type BasicInfoSnapshotState = {
  assayId: StudioAssayId | null;
  name: string;
  dataSourceKind: StudioDataSourceKind;
  dataPath: string;
  folderTemplate: { subfolder: string; filename: string };
  workspacePath: string;
  intervalValue: number | null;
  intervalUnit: StudioIntervalUnit;
  samples: StudioAssaySampleRow[];
  /** Assay-wide segmentation channel, as typed. Sample rows may override it. */
  segmentationChannel: string;
  /** Assay-wide signal channels, comma-separated. Sample rows may override them. */
  signalChannel: string;
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
      name: state.name,
      dataSourceKind: state.dataSourceKind,
      dataPath: state.dataPath,
      folderTemplate: state.folderTemplate ?? {
        subfolder: DEFAULT_FOLDER_SOURCE_TEMPLATE.subfolderTemplate,
        filename: DEFAULT_FOLDER_SOURCE_TEMPLATE.filenameTemplate,
      },
      workspacePath: state.workspacePath,
      intervalValue: state.intervalValue,
      intervalUnit: state.intervalUnit,
      samples: state.samples,
      analysis: state.analysis,
      channelDefaults: {
        segmentation: state.segmentationChannel,
        signal: state.signalChannel,
      },
      sampleRowToDisk,
    }),
  );
}

export function isBasicInfoDirty(state: BasicInfoDirtyState, baselineSnapshot: string): boolean {
  const current = serializeBasicInfoSnapshot(state);
  const baseline = state.basicInfoSavedSnapshot ?? baselineSnapshot;
  return current !== baseline;
}

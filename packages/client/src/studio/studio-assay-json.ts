import { AssayJsonFileSchema, decodeJsonResult, formatSchemaError } from "@lisca/contracts";
import { ASSAY_FEATURE, ASSAY_TYPE } from "@lisca/contracts/assay";
import type {
  StudioAssayJson,
  StudioAssayType,
  StudioBasicInfoFeatureId,
  StudioBasicInfoSampleRow,
  StudioBasicInfoSampleRowFields,
  StudioBasicInfoStep1,
  StudioBasicInfoStep2,
  StudioBasicInfoStep3,
  StudioDataSourceKind,
} from "@lisca/contracts/assay";
import { TRANSFECTION_FEATURE_IDS } from "@lisca/contracts/assay";
import type { AssaySampleRow } from "@lisca/contracts";
import * as Either from "effect/Either";

export const ASSAY_CHOICE_LABEL: Record<StudioAssayType, string> = {
  [ASSAY_TYPE.TRANSFECTION]: "Transfection",
  [ASSAY_TYPE.IMMUNE_KILLING]: "Immune killing",
  [ASSAY_TYPE.LNP_BINDING]: "LNP binding",
  [ASSAY_TYPE.CUSTOM_ASSAY]: "Custom assay",
};

const BASIC_INFO_FEATURE_IDS: ReadonlyArray<StudioBasicInfoFeatureId> = TRANSFECTION_FEATURE_IDS;

const ASSAY_DEFAULT_INFO_FEATURES: Record<StudioAssayType, readonly StudioBasicInfoFeatureId[]> = {
  [ASSAY_TYPE.TRANSFECTION]: [ASSAY_FEATURE.TOTAL_FLUOR],
  [ASSAY_TYPE.IMMUNE_KILLING]: [],
  [ASSAY_TYPE.LNP_BINDING]: [],
  [ASSAY_TYPE.CUSTOM_ASSAY]: [],
};

export function inferDataSourceKind(path: string): StudioDataSourceKind {
  const lower = path.trim().toLowerCase();
  if (lower.endsWith(".nd2")) return "nd2";
  if (lower.endsWith(".czi")) return "czi";
  if (path.trim()) return "folder";
  return null;
}

export function normalizeSelectedFeaturesForAssay(
  assayId: StudioAssayType | null,
  selectedFeatures: readonly StudioBasicInfoFeatureId[],
): StudioBasicInfoFeatureId[] {
  const defaults = assayId ? ASSAY_DEFAULT_INFO_FEATURES[assayId] : [];
  const allowed = defaults.length > 0 ? defaults : BASIC_INFO_FEATURE_IDS;
  const filtered = selectedFeatures.filter((id) => allowed.includes(id));
  if (filtered.length > 0) return [...filtered];
  return defaults.length > 0 ? [...defaults] : [];
}

export function normalizeInfo3ForAssay(
  info3: StudioBasicInfoStep3,
  sampleRowToDisk: (row: StudioBasicInfoSampleRow) => AssaySampleRow,
): StudioAssayJson["info3"] {
  return {
    samples: info3.samples.map(sampleRowToDisk),
  };
}

export function buildStudioAssayJson({
  assayId,
  dataSourceKind,
  info1,
  info2,
  info3,
  sampleRowToDisk,
}: {
  assayId: StudioAssayType;
  dataSourceKind: StudioDataSourceKind;
  info1: StudioBasicInfoStep1;
  info2: StudioBasicInfoStep2;
  info3: StudioBasicInfoStep3;
  sampleRowToDisk: (row: StudioBasicInfoSampleRow) => AssaySampleRow;
}): StudioAssayJson {
  return {
    assayId,
    assayLabel: ASSAY_CHOICE_LABEL[assayId],
    dataSourceKind: dataSourceKind ?? null,
    info1,
    info2: {
      ...info2,
      selectedFeatures: [...info2.selectedFeatures],
    },
    info3: normalizeInfo3ForAssay(info3, sampleRowToDisk),
  };
}

export function parseStudioAssayJson(
  contents: string,
  sampleRowFromDisk: (row: {
    positions?: string;
    positionStart?: string;
    positionFinish?: string;
    channel: string;
    name: string;
    maskChannel: string;
    signalChannel: string;
  }) => StudioBasicInfoSampleRowFields,
  sampleRowToDisk: (row: StudioBasicInfoSampleRow) => AssaySampleRow,
): StudioAssayJson {
  const decoded = decodeJsonResult(AssayJsonFileSchema)(contents);
  if (Either.isLeft(decoded)) {
    throw new Error(`Invalid assay.json: ${formatSchemaError(decoded.left)}`);
  }

  const root = decoded.right;
  const dataSourceKind = root.dataSourceKind ?? inferDataSourceKind(root.info1.dataPath);
  const info3: StudioBasicInfoStep3 = {
    samples: root.info3.samples.map((row, index) => ({
      id: `sample:${index}`,
      ...sampleRowFromDisk(row),
    })),
  };

  return buildStudioAssayJson({
    assayId: root.assayId,
    dataSourceKind,
    info1: root.info1,
    info2: {
      ...root.info2,
      selectedFeatures: normalizeSelectedFeaturesForAssay(
        root.assayId,
        root.info2.selectedFeatures,
      ),
    },
    info3,
    sampleRowToDisk,
  });
}

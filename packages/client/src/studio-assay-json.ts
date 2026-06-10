import {
  ASSAY_FEATURE,
  ASSAY_NAME,
  AssayJsonFileSchema,
  decodeJsonResult,
  formatSchemaError,
  type AssayName,
  type StudioAssayJson,
  type StudioBasicInfoFeatureId,
  type StudioBasicInfoStep1,
  type StudioBasicInfoStep2,
  type StudioBasicInfoStep3,
  type StudioDataSourceKind,
} from "@lisca/contracts";
import { GENE_EXPRESSION_FEATURE_IDS } from "@lisca/contracts";
import * as Either from "effect/Either";

export const ASSAY_CHOICE_LABEL: Record<AssayName, string> = {
  [ASSAY_NAME.GENE_EXPRESSION]: "Gene expression",
  [ASSAY_NAME.IMMUNE_KILLING]: "Immune killing",
  [ASSAY_NAME.LNP_BINDING]: "LNP binding",
  [ASSAY_NAME.CUSTOM_ASSAY]: "Custom assay",
};

const BASIC_INFO_FEATURE_IDS: ReadonlyArray<StudioBasicInfoFeatureId> = GENE_EXPRESSION_FEATURE_IDS;

const ASSAY_DEFAULT_INFO_FEATURES: Record<AssayName, readonly StudioBasicInfoFeatureId[]> = {
  [ASSAY_NAME.GENE_EXPRESSION]: [ASSAY_FEATURE.TOTAL_FLUOR],
  [ASSAY_NAME.IMMUNE_KILLING]: [],
  [ASSAY_NAME.LNP_BINDING]: [],
  [ASSAY_NAME.CUSTOM_ASSAY]: [],
};

export function inferDataSourceKind(path: string): StudioDataSourceKind {
  const lower = path.trim().toLowerCase();
  if (lower.endsWith(".nd2")) return "nd2";
  if (lower.endsWith(".czi")) return "czi";
  if (path.trim()) return "folder";
  return null;
}

export function normalizeSelectedFeaturesForAssay(
  assayId: AssayName | null,
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
  sampleRowToDisk: (row: StudioBasicInfoStep3["samplesBySlide"]["slide-i"][number]) => {
    channel: string;
    name: string;
    positionStart: string;
    positionFinish: string;
    maskChannel: string;
    signalChannel: string;
    positions: string;
  },
): StudioAssayJson["info3"] {
  return {
    selectedSlideId: info3.selectedSlideId,
    samplesBySlide: {
      "slide-i": info3.samplesBySlide["slide-i"].map(sampleRowToDisk),
      "slide-vi": info3.samplesBySlide["slide-vi"].map(sampleRowToDisk),
    },
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
  assayId: AssayName;
  dataSourceKind: StudioDataSourceKind;
  info1: StudioBasicInfoStep1;
  info2: StudioBasicInfoStep2;
  info3: StudioBasicInfoStep3;
  sampleRowToDisk: (row: StudioBasicInfoStep3["samplesBySlide"]["slide-i"][number]) => {
    channel: string;
    name: string;
    positionStart: string;
    positionFinish: string;
    maskChannel: string;
    signalChannel: string;
    positions: string;
  };
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
  }) => StudioBasicInfoStep3["samplesBySlide"]["slide-i"][number],
  sampleRowToDisk: (row: StudioBasicInfoStep3["samplesBySlide"]["slide-i"][number]) => {
    channel: string;
    name: string;
    positionStart: string;
    positionFinish: string;
    maskChannel: string;
    signalChannel: string;
    positions: string;
  },
): StudioAssayJson {
  const decoded = decodeJsonResult(AssayJsonFileSchema)(contents);
  if (Either.isLeft(decoded)) {
    throw new Error(`Invalid assay.json: ${formatSchemaError(decoded.left)}`);
  }

  const root = decoded.right;
  const dataSourceKind = root.dataSourceKind ?? inferDataSourceKind(root.info1.dataPath);
  const info3: StudioBasicInfoStep3 = {
    selectedSlideId: root.info3.selectedSlideId,
    samplesBySlide: {
      "slide-i": root.info3.samplesBySlide["slide-i"].map(sampleRowFromDisk),
      "slide-vi": root.info3.samplesBySlide["slide-vi"].map(sampleRowFromDisk),
    },
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

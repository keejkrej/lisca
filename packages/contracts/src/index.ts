export { WS_PATH } from "./constants.ts";
export * from "./assay.schema.ts";
export * from "./decode.ts";
export * from "./protocol.schema.ts";

export type FolderSourceTemplatePreset = {
  label: string;
  subfolderTemplate: string;
  filenameTemplate: string;
};

export const FOLDER_SOURCE_TEMPLATE_PRESETS = [
  {
    label: "Standard folder",
    subfolderTemplate: "Pos{p}",
    filenameTemplate: "img_channel{c}_position{p}_time{t}_z{z}",
  },
  {
    label: "Compact folder",
    subfolderTemplate: "Pos{p}",
    filenameTemplate: "img_{t}_{c}_{z}",
  },
] as const satisfies readonly FolderSourceTemplatePreset[];

export const DEFAULT_FOLDER_SOURCE_TEMPLATE = FOLDER_SOURCE_TEMPLATE_PRESETS[0];

export type HostFilePickerMode =
  | "workspace"
  | "folder"
  | "nd2_file"
  | "czi_file"
  | "assay_json_file";

export const ASSAY_NAME = {
  GENE_EXPRESSION: "gene-expression",
  IMMUNE_KILLING: "immune-killing",
  LNP_BINDING: "lnp-binding",
  CUSTOM_ASSAY: "custom-assay",
} as const;

export type AssayName = (typeof ASSAY_NAME)[keyof typeof ASSAY_NAME];
export type GeneExpressionAssayName = typeof ASSAY_NAME.GENE_EXPRESSION;
export type ImmuneKillingAssayName = typeof ASSAY_NAME.IMMUNE_KILLING;

/** Assay types selectable in the Studio wizard today. */
export const ENABLED_STUDIO_ASSAY_IDS = [
  ASSAY_NAME.GENE_EXPRESSION,
  ASSAY_NAME.IMMUNE_KILLING,
] as const;

export type EnabledStudioAssayId = (typeof ENABLED_STUDIO_ASSAY_IDS)[number];

export const ASSAY_FEATURE = {
  MORPHOLOGY: "morphology",
  PART_COUNT: "partcount",
  PART_FLUOR: "partfluor",
  TOTAL_FLUOR: "totalfluor",
} as const;

export type AssayFeature = (typeof ASSAY_FEATURE)[keyof typeof ASSAY_FEATURE];

export const GENE_EXPRESSION_FEATURE_IDS = [
  ASSAY_FEATURE.MORPHOLOGY,
  ASSAY_FEATURE.PART_COUNT,
  ASSAY_FEATURE.PART_FLUOR,
  ASSAY_FEATURE.TOTAL_FLUOR,
] as const;

export type AssayFeatureList = readonly AssayFeature[];

export type NonEmptyAssayFeatureList = [AssayFeature, ...AssayFeature[]];

export type Assay = {
  name: AssayName;
  features: AssayFeatureList;
};

export type GeneExpressionFeatureList = [
  GeneExpressionAssayFeature,
  ...GeneExpressionAssayFeature[],
];

export type GeneExpressionAssayFeature = (typeof GENE_EXPRESSION_FEATURE_IDS)[number];

export type GeneExpressionAssay = {
  name: GeneExpressionAssayName;
  features: GeneExpressionFeatureList;
};

export type StudioAssayId = AssayName;

export type StudioDataSourceKind = AlignerSource["kind"] | null;

import type { AlignerSource } from "./protocol.schema.ts";

export type StudioTimelapseUnit = "second" | "minute" | "hour";

export type StudioBasicInfoFeatureId = AssayFeature;

export type StudioBasicInfoSlideId = "slide-i" | "slide-vi";

export type StudioBasicInfoStep1 = {
  name: string;
  date: string;
  dataPath: string;
  folderSubfolderTemplate: string;
  folderFilenameTemplate: string;
  saveTo: string;
};

export type StudioBasicInfoStep2 = {
  pattern: string;
  timelapseAmount: number | null;
  timelapseUnit: StudioTimelapseUnit;
  selectedFeatures: readonly StudioBasicInfoFeatureId[];
};

export type StudioBasicInfoSampleRow = {
  channel: string;
  name: string;
  positionStart: string;
  positionFinish: string;
  maskChannel: string;
  signalChannel: string;
};

export type StudioBasicInfoStep3 = {
  selectedSlideId: StudioBasicInfoSlideId;
  samplesBySlide: Record<StudioBasicInfoSlideId, StudioBasicInfoSampleRow[]>;
};

// The assay.json on-disk shape has a single source of truth in the Effect
// schema (`assay.schema.ts`); these aliases surface the derived types under the
// names studio app code already uses.
import type { AssayBasicInfoStep3, AssayJsonFile, AssaySampleRow } from "./assay.schema.ts";

/** Sample row as written to assay.json (includes `positions` for the analysis pipeline). */
export type StudioAssaySampleRowOnDisk = AssaySampleRow;

export type StudioBasicInfoStep3OnDisk = AssayBasicInfoStep3;

export type StudioAssayJson = AssayJsonFile;

export type { PixelType } from "./constants.ts";
export { PIXEL_TYPES } from "./constants.ts";
import type { PixelType } from "./constants.ts";

export type PixelArray =
  | Uint8Array
  | Uint8ClampedArray
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array;

export type FrameResult = {
  width: number;
  height: number;
  pixels: PixelArray;
  pixelType?: PixelType;
  contrastDomain?: ContrastWindow;
  suggestedContrast?: ContrastWindow;
  appliedContrast?: ContrastWindow;
};

import type { ContrastWindow } from "./protocol.schema.ts";

export type AnnotationMode = "classification" | "segmentation";

export type CanvasStatusTone = "default" | "error" | "success";

export type CanvasStatusMessage = {
  text: string;
  tone?: CanvasStatusTone;
};

export type AlignCanvasStatusTone = CanvasStatusTone;

export type AlignCanvasStatusMessage = CanvasStatusMessage;

import type { CropRoiProgress } from "./protocol.schema.ts";

/** True once a crop ROI job has reached a terminal state. */
export function isDoneCropStatus(status: CropRoiProgress["status"]): boolean {
  return status === "completed" || status === "cancelled" || status === "error";
}

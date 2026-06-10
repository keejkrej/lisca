import type { AlignerSource } from "./protocol.schema.ts";
import type { AssayBasicInfoStep3, AssayJsonFile, AssaySampleRow } from "./assay.schema.ts";

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

export const ASSAY_TYPE = {
  GENE_EXPRESSION: "gene-expression",
  IMMUNE_KILLING: "immune-killing",
  LNP_BINDING: "lnp-binding",
  CUSTOM_ASSAY: "custom-assay",
} as const;

export type AssayType = (typeof ASSAY_TYPE)[keyof typeof ASSAY_TYPE];
export type GeneExpressionAssayType = typeof ASSAY_TYPE.GENE_EXPRESSION;
export type ImmuneKillingAssayType = typeof ASSAY_TYPE.IMMUNE_KILLING;

/** Assay types selectable in the wizard today. */
export const ENABLED_STUDIO_ASSAY_IDS = [
  ASSAY_TYPE.GENE_EXPRESSION,
  ASSAY_TYPE.IMMUNE_KILLING,
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
  assayType: AssayType;
  features: AssayFeatureList;
};

export type GeneExpressionFeatureList = [
  GeneExpressionAssayFeature,
  ...GeneExpressionAssayFeature[],
];

export type GeneExpressionAssayFeature = (typeof GENE_EXPRESSION_FEATURE_IDS)[number];

export type GeneExpressionAssay = {
  assayType: GeneExpressionAssayType;
  features: GeneExpressionFeatureList;
};

export type StudioAssayId = AssayType;

export type StudioDataSourceKind = AlignerSource["kind"] | null;

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
  /** Stable UI row identity; not persisted to assay.json. */
  id: string;
  channel: string;
  name: string;
  positionStart: string;
  positionFinish: string;
  maskChannel: string;
  signalChannel: string;
};

/** Sample row fields loaded from assay.json before a UI row id is assigned. */
export type StudioBasicInfoSampleRowFields = Omit<StudioBasicInfoSampleRow, "id">;

export type StudioBasicInfoStep3 = {
  selectedSlideId: StudioBasicInfoSlideId;
  samplesBySlide: Record<StudioBasicInfoSlideId, StudioBasicInfoSampleRow[]>;
};

/** Sample row as written to assay.json (includes `positions` for the analysis pipeline). */
export type StudioAssaySampleRowOnDisk = AssaySampleRow;

export type StudioBasicInfoStep3OnDisk = AssayBasicInfoStep3;

export type StudioAssayJson = AssayJsonFile;

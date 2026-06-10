import type { AlignerSource } from "./schema/shared";
import type {
  AssayBasicInfoStep1,
  AssayBasicInfoStep2,
  AssayBasicInfoStep3,
  AssayJsonFile,
  AssaySampleRow,
  AssaySlideId,
  AssayTimelapseUnit,
} from "./assay.schema";

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

/** Wizard-facing assay id union (const object keys, not the on-disk schema type). */
export type StudioAssayType = (typeof ASSAY_TYPE)[keyof typeof ASSAY_TYPE];
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

/** Wizard-facing feature id union (const object keys). */
export type StudioAssayFeature = (typeof ASSAY_FEATURE)[keyof typeof ASSAY_FEATURE];

export const GENE_EXPRESSION_FEATURE_IDS = [
  ASSAY_FEATURE.MORPHOLOGY,
  ASSAY_FEATURE.PART_COUNT,
  ASSAY_FEATURE.PART_FLUOR,
  ASSAY_FEATURE.TOTAL_FLUOR,
] as const;

export type AssayFeatureList = readonly StudioAssayFeature[];

export type NonEmptyAssayFeatureList = [StudioAssayFeature, ...StudioAssayFeature[]];

export type Assay = {
  assayType: StudioAssayType;
  features: AssayFeatureList;
};

export type GeneExpressionAssayFeature = (typeof GENE_EXPRESSION_FEATURE_IDS)[number];

export type GeneExpressionFeatureList = [
  GeneExpressionAssayFeature,
  ...GeneExpressionAssayFeature[],
];

export type GeneExpressionAssay = {
  assayType: GeneExpressionAssayType;
  features: GeneExpressionFeatureList;
};

export type StudioAssayId = StudioAssayType;

export type StudioDataSourceKind = AlignerSource["kind"] | null;

export type StudioTimelapseUnit = AssayTimelapseUnit;

export type StudioBasicInfoFeatureId = StudioAssayFeature;

export type StudioBasicInfoSlideId = AssaySlideId;

/** On-disk step 1 fields; identical to `AssayBasicInfoStep1`. */
export type StudioBasicInfoStep1 = AssayBasicInfoStep1;

/** On-disk step 2 fields; identical to `AssayBasicInfoStep2`. */
export type StudioBasicInfoStep2 = AssayBasicInfoStep2;

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

/** Wizard step 3: UI rows carry a client-only `id` not written to assay.json. */
export type StudioBasicInfoStep3 = {
  selectedSlideId: StudioBasicInfoSlideId;
  samplesBySlide: Record<StudioBasicInfoSlideId, StudioBasicInfoSampleRow[]>;
};

/** Sample row as written to assay.json (includes `positions` for the analysis pipeline). */
export type StudioAssaySampleRowOnDisk = AssaySampleRow;

export type StudioBasicInfoStep3OnDisk = AssayBasicInfoStep3;

export type StudioAssayJson = AssayJsonFile;

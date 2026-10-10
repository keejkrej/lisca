import type { AlignerSource } from "./schema/shared";
import type {
  AssayAnalysisConfig,
  AssayChannels,
  AssayData,
  AssayInterval,
  AssayIntervalUnit,
  AssayJsonFile,
  AssaySampleChannels,
  AssaySampleRow,
  AssaySegmentationMode,
  AssayWorkspace,
} from "./assay.schema";

export type {
  AssayAnalysisConfig,
  AssayChannels,
  AssayData,
  AssayInterval,
  AssaySampleChannels,
  AssaySegmentationMode,
  AssayWorkspace,
};

/** Presets for AlignerSource / folder-parse UI (maps into assay `data.template`). */
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
  TRANSFECTION: "transfection",
  KILLING: "killing",
  KILLING_ENGAGEMENT: "killing-engagement",
  LNP_BINDING: "lnp-binding",
} as const;

/** Wizard-facing assay id union (const object keys, not the on-disk schema type). */
export type StudioAssayType = (typeof ASSAY_TYPE)[keyof typeof ASSAY_TYPE];
export type TransfectionAssayType = typeof ASSAY_TYPE.TRANSFECTION;
export type KillingAssayType = typeof ASSAY_TYPE.KILLING;

/** Assay types selectable in the wizard today. */
export const ENABLED_STUDIO_ASSAY_IDS = [
  ASSAY_TYPE.TRANSFECTION,
  ASSAY_TYPE.KILLING,
  ASSAY_TYPE.KILLING_ENGAGEMENT,
] as const;

export type EnabledStudioAssayId = (typeof ENABLED_STUDIO_ASSAY_IDS)[number];

/**
 * Default frame interval (minutes) when the user has not set interval.*.
 * Gene expression is the longer experiment, so transfection stays at 10.
 * Death-reporter killing (drugs or T cells) defaults to 5.
 * Assays omitted here require an explicit interval before analysis.
 */
export const ASSAY_DEFAULT_INTERVAL_MINUTES: Partial<Record<StudioAssayType, number>> = {
  [ASSAY_TYPE.TRANSFECTION]: 10,
  [ASSAY_TYPE.KILLING]: 5,
  [ASSAY_TYPE.KILLING_ENGAGEMENT]: 5,
};

/**
 * Transfection-only: default second-pass onset time t0 search cap (minutes).
 * Explicit 0 in assay.json still means onset time t0 is fixed at 0.
 */
export const TRANSFECTION_DEFAULT_MAX_ONSET_MINUTES = 120;

/** Whether the assay exposes maxOnsetMinutes in Studio basic info. */
export function assayUsesMaxOnsetMinutes(assayId: StudioAssayType | null): boolean {
  return assayId === ASSAY_TYPE.TRANSFECTION;
}

/**
 * Whether the assay exposes skip-segmentation and the segmentation method.
 * Transfection and killing both segment a channel. Max onset time stays transfection-only.
 */
export function assayUsesSkipSegment(assayId: StudioAssayType | null): boolean {
  return assayId === ASSAY_TYPE.TRANSFECTION || assayId === ASSAY_TYPE.KILLING;
}

export type StudioAssayId = StudioAssayType;

export type StudioDataSourceKind = AlignerSource["kind"] | null;

export type StudioIntervalUnit = AssayIntervalUnit;

export type StudioAssaySampleRow = {
  /** Stable UI row identity; not persisted to assay.json. */
  id: string;
  /** Sample name; identifies the sample (non-empty after trim, unique). */
  name: string;
  /**
   * 0-based positions this sample covers. assay.json grammar: `3` or `0:4,20:24`.
   * The metadata editor shows these 1-based and can keep gaps.
   */
  positions: string;
  /**
   * Segmentation channel and comma-separated signal channels for this sample (UI).
   * Persisted under `analysis.channels` / `analysis.sampleChannels`, not on the sample row.
   */
  segmentation: string;
  /** e.g. `"1"` or `"1,2"`. */
  signal: string;
};

/** Sample row fields loaded from assay.json before a UI row id is assigned. */
export type StudioAssaySampleRowFields = Omit<StudioAssaySampleRow, "id">;

/** Wizard sample list (UI rows carry a client-only `id`). */
export type StudioAssaySamples = {
  samples: StudioAssaySampleRow[];
};

/** Sample row as written to assay.json. */
export type StudioAssaySampleRowOnDisk = AssaySampleRow;

export type StudioAssayJson = AssayJsonFile;

export type StudioAssayInterval = AssayInterval;

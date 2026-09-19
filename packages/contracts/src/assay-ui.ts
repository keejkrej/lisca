import type { AlignerSource } from "./schema/shared";
import type { AnnotationLabel } from "./schema/annotate";
import type {
  AssayAnalysisConfig,
  AssayChannelRoles,
  AssayChannels,
  AssayData,
  AssayInterval,
  AssayIntervalUnit,
  AssayJsonFile,
  AssaySampleChannels,
  AssaySampleRow,
  AssayWorkspace,
} from "./assay.schema";

export type {
  AssayAnalysisConfig,
  AssayChannelRoles,
  AssayChannels,
  AssayData,
  AssayInterval,
  AssaySampleChannels,
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
  LNP_BINDING: "lnp-binding",
} as const;

/** Wizard-facing assay id union (const object keys, not the on-disk schema type). */
export type StudioAssayType = (typeof ASSAY_TYPE)[keyof typeof ASSAY_TYPE];
export type TransfectionAssayType = typeof ASSAY_TYPE.TRANSFECTION;
export type KillingAssayType = typeof ASSAY_TYPE.KILLING;

/** Assay types selectable in the wizard today. */
export const ENABLED_STUDIO_ASSAY_IDS = [ASSAY_TYPE.TRANSFECTION, ASSAY_TYPE.KILLING] as const;

export type EnabledStudioAssayId = (typeof ENABLED_STUDIO_ASSAY_IDS)[number];

/**
 * Default frame interval (minutes) when the user has not set interval.*.
 * Interval is a general field; the default value is assay-dependent.
 * Assays omitted here require an explicit interval before analysis.
 */
export const ASSAY_DEFAULT_INTERVAL_MINUTES: Partial<Record<StudioAssayType, number>> = {
  [ASSAY_TYPE.TRANSFECTION]: 10,
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

/** Whether the assay exposes skipSegment in Studio analysis options. */
export function assayUsesSkipSegment(assayId: StudioAssayType | null): boolean {
  return assayId === ASSAY_TYPE.TRANSFECTION;
}

/**
 * Whether the assay exposes optional named extra-channel roles (T-cell /
 * death stain) in Studio basic info. Mask/signal stay on the Samples step.
 */
export function assayUsesChannelRoles(assayId: StudioAssayType | null): boolean {
  return assayId === ASSAY_TYPE.KILLING;
}

/**
 * Open classification catalog for killing / coculture workspaces. Annotator
 * labels are not a closed alive/dead enum — add or rename freely. Tumor vs
 * T-cell ids are extension points for later sidecar work; Studio killing
 * analysis does not consume them.
 */
export const KILLING_ANNOTATION_LABELS: readonly AnnotationLabel[] = [
  { id: "alive", name: "Alive", color: "#22c55e" },
  { id: "dead", name: "Dead", color: "#ef4444" },
  { id: "tumor", name: "Tumor", color: "#f97316" },
  { id: "tcell", name: "T cell", color: "#3b82f6" },
];

export type StudioAssayId = StudioAssayType;

export type StudioDataSourceKind = AlignerSource["kind"] | null;

export type StudioIntervalUnit = AssayIntervalUnit;

export type StudioAssaySampleRow = {
  /** Stable UI row identity; not persisted to assay.json. */
  id: string;
  /** Slide-channel key; edited as text, written as int on disk. */
  slideChannel: string;
  name: string;
  positionStart: string;
  positionFinish: string;
  /**
   * Mask channel and comma-separated signal channels for this sample (UI).
   * Persisted under `analysis.channels` / `analysis.sampleChannels`, not on the sample row.
   */
  mask: string;
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

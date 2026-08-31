import * as Schema from "effect/Schema";

import { F64, U32 } from "./schema/primitives";

/**
 * Effect Schema source of truth for the studio `assay.json` on-disk contract.
 * The studio web wizard authors this shape and the Rust analysis pipeline
 * parses it. It is not an HTTP endpoint payload (it travels as a serialized
 * string through `/studio/save-assay-json`), so it lives here rather than in
 * the HttpApi, and is emitted as JSON Schema for the Rust type generator.
 */

/** Assay kind (root `type`). Distinct from `data.type` (source kind). */
export const AssayTypeSchema = Schema.Literals(["transfection", "killing", "lnp-binding"]).annotate(
  {
    identifier: "AssayType",
  },
);

export const AssayIntervalUnitSchema = Schema.Literals(["second", "minute", "hour"]).annotate({
  identifier: "AssayIntervalUnit",
});

export const AssayFolderTemplateSchema = Schema.Struct({
  subfolder: Schema.String,
  filename: Schema.String,
}).annotate({ identifier: "AssayFolderTemplate" });

export const AssayDataFolderSchema = Schema.Struct({
  type: Schema.Literal("folder"),
  path: Schema.String,
  template: AssayFolderTemplateSchema,
}).annotate({ identifier: "AssayDataFolder" });

export const AssayDataNd2Schema = Schema.Struct({
  type: Schema.Literal("nd2"),
  path: Schema.String,
}).annotate({ identifier: "AssayDataNd2" });

export const AssayDataCziSchema = Schema.Struct({
  type: Schema.Literal("czi"),
  path: Schema.String,
}).annotate({ identifier: "AssayDataCzi" });

export const AssayDataSchema = Schema.Union([
  AssayDataFolderSchema,
  AssayDataNd2Schema,
  AssayDataCziSchema,
]).annotate({ identifier: "AssayData" });

export const AssayWorkspaceSchema = Schema.Struct({
  path: Schema.String,
}).annotate({ identifier: "AssayWorkspace" });

export const AssayIntervalSchema = Schema.Struct({
  value: Schema.NullOr(F64),
  unit: AssayIntervalUnitSchema,
}).annotate({ identifier: "AssayInterval" });

/** Sample identity / layout only — intensity/mask channels live under `analysis`. */
export const AssaySampleRowSchema = Schema.Struct({
  /** Logical sample / slide-channel key (a physical slide may expose several). */
  slideChannel: U32,
  name: Schema.String,
  positions: Schema.String,
}).annotate({ identifier: "AssaySampleRow" });

export const AssaySamplesSchema = Schema.mutable(Schema.Array(AssaySampleRowSchema)).annotate({
  identifier: "AssaySamples",
});

/** Non-empty list of signal (intensity) channel indices. */
export const AssaySignalChannelsSchema = Schema.mutable(Schema.NonEmptyArray(U32)).annotate({
  identifier: "AssaySignalChannels",
});

/** Default mask + signal channel indices for an assay. */
export const AssayChannelsSchema = Schema.Struct({
  mask: U32,
  signal: AssaySignalChannelsSchema,
}).annotate({ identifier: "AssayChannels" });

/** Per-sample channel override; `slideChannel` matches `samples[].slideChannel`. */
export const AssaySampleChannelsSchema = Schema.Struct({
  slideChannel: U32,
  mask: U32,
  signal: AssaySignalChannelsSchema,
}).annotate({ identifier: "AssaySampleChannels" });

/**
 * Assay-dependent analysis options on assay.json.
 * `maxOnsetMinutes` (onset time t0 search cap) / `skipSegment` are transfection-oriented;
 * other assays ignore them.
 * `channels` / `sampleChannels` resolve mask (segmentation) and signal (intensity) indices.
 */
export const AssayAnalysisConfigSchema = Schema.Struct({
  /** Cap on onset time t0 search (minutes). Default 120; 0 fixes onset at 0. */
  maxOnsetMinutes: Schema.optional(F64),
  /** When true, skip Otsu segmentation and use full-ROI (10th-percentile bg) timeseries. */
  skipSegment: Schema.optional(Schema.Boolean),
  channels: Schema.optional(AssayChannelsSchema),
  sampleChannels: Schema.optional(Schema.mutable(Schema.Array(AssaySampleChannelsSchema))),
}).annotate({ identifier: "AssayAnalysisConfig" });

export const AssayJsonFileSchema = Schema.Struct({
  type: AssayTypeSchema,
  name: Schema.String,
  data: AssayDataSchema,
  workspace: AssayWorkspaceSchema,
  interval: AssayIntervalSchema,
  samples: AssaySamplesSchema,
  analysis: Schema.optional(AssayAnalysisConfigSchema),
}).annotate({ identifier: "AssayJsonFile" });

export type AssayType = typeof AssayTypeSchema.Type;
export type AssayIntervalUnit = typeof AssayIntervalUnitSchema.Type;
export type AssayFolderTemplate = typeof AssayFolderTemplateSchema.Type;
export type AssayDataFolder = typeof AssayDataFolderSchema.Type;
export type AssayDataNd2 = typeof AssayDataNd2Schema.Type;
export type AssayDataCzi = typeof AssayDataCziSchema.Type;
export type AssayData = typeof AssayDataSchema.Type;
export type AssayWorkspace = typeof AssayWorkspaceSchema.Type;
export type AssayInterval = typeof AssayIntervalSchema.Type;
export type AssaySampleRow = typeof AssaySampleRowSchema.Type;
export type AssaySamples = typeof AssaySamplesSchema.Type;
export type AssaySignalChannels = typeof AssaySignalChannelsSchema.Type;
export type AssayChannels = typeof AssayChannelsSchema.Type;
export type AssaySampleChannels = typeof AssaySampleChannelsSchema.Type;
export type AssayAnalysisConfig = typeof AssayAnalysisConfigSchema.Type;
export type AssayJsonFile = typeof AssayJsonFileSchema.Type;

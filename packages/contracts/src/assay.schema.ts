import * as Schema from "effect/Schema";

import { F64 } from "./schema/primitives";

/**
 * Effect Schema source of truth for the studio `assay.json` on-disk contract.
 * The studio web wizard authors this shape and the Rust analysis pipeline
 * parses it. It is not an HTTP endpoint payload (it travels as a serialized
 * string through `/studio/save-assay-json`), so it lives here rather than in
 * the HttpApi, and is emitted as JSON Schema for the Rust type generator.
 */

/** Assay kind (root `type`). Distinct from `data.type` (source kind). */
export const AssayTypeSchema = Schema.Literal("transfection", "killing", "lnp-binding").annotations(
  {
    identifier: "AssayType",
  },
);

export const AssayIntervalUnitSchema = Schema.Literal("second", "minute", "hour").annotations({
  identifier: "AssayIntervalUnit",
});

export const AssayFolderTemplateSchema = Schema.Struct({
  subfolder: Schema.String,
  filename: Schema.String,
}).annotations({ identifier: "AssayFolderTemplate" });

export const AssayDataFolderSchema = Schema.Struct({
  type: Schema.Literal("folder"),
  path: Schema.String,
  template: AssayFolderTemplateSchema,
}).annotations({ identifier: "AssayDataFolder" });

export const AssayDataNd2Schema = Schema.Struct({
  type: Schema.Literal("nd2"),
  path: Schema.String,
}).annotations({ identifier: "AssayDataNd2" });

export const AssayDataCziSchema = Schema.Struct({
  type: Schema.Literal("czi"),
  path: Schema.String,
}).annotations({ identifier: "AssayDataCzi" });

export const AssayDataSchema = Schema.Union(
  AssayDataFolderSchema,
  AssayDataNd2Schema,
  AssayDataCziSchema,
).annotations({ identifier: "AssayData" });

export const AssayWorkspaceSchema = Schema.Struct({
  path: Schema.String,
}).annotations({ identifier: "AssayWorkspace" });

export const AssayIntervalSchema = Schema.Struct({
  value: Schema.NullOr(F64),
  unit: AssayIntervalUnitSchema,
}).annotations({ identifier: "AssayInterval" });

export const AssaySampleRowSchema = Schema.Struct({
  slide: Schema.String,
  name: Schema.String,
  positions: Schema.String,
  brightfield: Schema.String,
  fluorescence: Schema.String,
}).annotations({ identifier: "AssaySampleRow" });

export const AssaySamplesSchema = Schema.mutable(Schema.Array(AssaySampleRowSchema)).annotations({
  identifier: "AssaySamples",
});

/**
 * Assay-dependent analysis options on assay.json.
 * `maxOnsetMinutes` / `skipSegment` are transfection-oriented; other assays ignore them.
 */
export const AssayAnalysisConfigSchema = Schema.Struct({
  maxOnsetMinutes: Schema.optional(F64),
  /** When true, skip Otsu segmentation and use full-ROI (10th-percentile bg) timeseries. */
  skipSegment: Schema.optional(Schema.Boolean),
}).annotations({ identifier: "AssayAnalysisConfig" });

export const AssayJsonFileSchema = Schema.Struct({
  type: AssayTypeSchema,
  name: Schema.String,
  data: AssayDataSchema,
  workspace: AssayWorkspaceSchema,
  interval: AssayIntervalSchema,
  samples: AssaySamplesSchema,
  analysis: Schema.optional(AssayAnalysisConfigSchema),
}).annotations({ identifier: "AssayJsonFile" });

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
export type AssayAnalysisConfig = typeof AssayAnalysisConfigSchema.Type;
export type AssayJsonFile = typeof AssayJsonFileSchema.Type;

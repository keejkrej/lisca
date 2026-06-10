import * as Schema from "effect/Schema";

import { F64 } from "./schema/primitives";

/**
 * Effect Schema source of truth for the studio `assay.json` on-disk contract.
 * The studio web wizard authors this shape and the Rust analysis pipeline
 * parses it. It is not an HTTP endpoint payload (it travels as a serialized
 * string through `/studio/save-assay-json`), so it lives here rather than in
 * the HttpApi, and is emitted as JSON Schema for the Rust type generator.
 */

export const AssayTypeSchema = Schema.Literal(
  "gene-expression",
  "immune-killing",
  "lnp-binding",
  "custom-assay",
).annotations({ identifier: "AssayType" });

export const AssayFeatureSchema = Schema.Literal(
  "morphology",
  "partcount",
  "partfluor",
  "totalfluor",
).annotations({ identifier: "AssayFeature" });

export const AssayTimelapseUnitSchema = Schema.Literal("second", "minute", "hour").annotations({
  identifier: "AssayTimelapseUnit",
});

export const AssaySlideIdSchema = Schema.Literal("slide-i", "slide-vi").annotations({
  identifier: "AssaySlideId",
});

export const AssayDataSourceKindSchema = Schema.Literal(
  "folder",
  "tif",
  "jpg",
  "nd2",
  "czi",
).annotations({ identifier: "AssayDataSourceKind" });

export const AssayBasicInfoStep1Schema = Schema.Struct({
  name: Schema.String,
  date: Schema.String,
  dataPath: Schema.String,
  folderSubfolderTemplate: Schema.String,
  folderFilenameTemplate: Schema.String,
  saveTo: Schema.String,
}).annotations({ identifier: "AssayBasicInfoStep1" });

export const AssayBasicInfoStep2Schema = Schema.Struct({
  pattern: Schema.String,
  timelapseAmount: Schema.NullOr(F64),
  timelapseUnit: AssayTimelapseUnitSchema,
  selectedFeatures: Schema.mutable(Schema.Array(AssayFeatureSchema)),
}).annotations({ identifier: "AssayBasicInfoStep2" });

export const AssaySampleRowSchema = Schema.Struct({
  channel: Schema.String,
  name: Schema.String,
  positionStart: Schema.String,
  positionFinish: Schema.String,
  maskChannel: Schema.String,
  signalChannel: Schema.String,
  positions: Schema.String,
}).annotations({ identifier: "AssaySampleRow" });

export const AssaySamplesBySlideSchema = Schema.Struct({
  "slide-i": Schema.mutable(Schema.Array(AssaySampleRowSchema)),
  "slide-vi": Schema.mutable(Schema.Array(AssaySampleRowSchema)),
}).annotations({ identifier: "AssaySamplesBySlide" });

export const AssayBasicInfoStep3Schema = Schema.Struct({
  selectedSlideId: AssaySlideIdSchema,
  samplesBySlide: AssaySamplesBySlideSchema,
}).annotations({ identifier: "AssayBasicInfoStep3" });

export const AssayJsonFileSchema = Schema.Struct({
  assayId: AssayTypeSchema,
  assayLabel: Schema.String,
  dataSourceKind: Schema.NullOr(AssayDataSourceKindSchema),
  info1: AssayBasicInfoStep1Schema,
  info2: AssayBasicInfoStep2Schema,
  info3: AssayBasicInfoStep3Schema,
}).annotations({ identifier: "AssayJsonFile" });

// Derived on-disk types (`AssayType`/`AssayFeature` here are schema unions;
// wizard const-derived ids live under `@lisca/contracts/assay` as `StudioAssay*`).
export type AssayType = typeof AssayTypeSchema.Type;
export type AssayFeature = typeof AssayFeatureSchema.Type;
export type AssayTimelapseUnit = typeof AssayTimelapseUnitSchema.Type;
export type AssaySlideId = typeof AssaySlideIdSchema.Type;
export type AssayDataSourceKind = typeof AssayDataSourceKindSchema.Type;
export type AssayBasicInfoStep1 = typeof AssayBasicInfoStep1Schema.Type;
export type AssayBasicInfoStep2 = typeof AssayBasicInfoStep2Schema.Type;
export type AssaySampleRow = typeof AssaySampleRowSchema.Type;
export type AssayBasicInfoStep3 = typeof AssayBasicInfoStep3Schema.Type;
export type AssayJsonFile = typeof AssayJsonFileSchema.Type;

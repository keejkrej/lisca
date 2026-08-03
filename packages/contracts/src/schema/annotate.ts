import * as Schema from "effect/Schema";

import { AlignerSourceSchema, ContrastWindowSchema } from "./shared";
import { NumArray, StrArray, U32 } from "./primitives";
import { RoiBboxSchema } from "./roi-bbox";

export const RoiFrameRequestSchema = Schema.Struct({
  pos: U32,
  roi: U32,
  channel: U32,
  time: U32,
  z: U32,
}).annotations({ identifier: "RoiFrameRequest" });

export const RoiIndexEntrySchema = Schema.Struct({
  roi: U32,
  fileName: Schema.String,
  bbox: RoiBboxSchema,
  // Fixed 5-element array; the explicit `jsonSchema` makes the Rust generator
  // (typify) emit `[u32; 5]` instead of a malformed tuple type.
  shape: Schema.Tuple(U32, U32, U32, U32, U32).annotations({
    jsonSchema: {
      type: "array",
      items: { type: "integer", format: "uint32", minimum: 0 },
      minItems: 5,
      maxItems: 5,
    },
  }),
}).annotations({ identifier: "RoiIndexEntry" });

export const RoiIndexFileSchema = Schema.Struct({
  position: U32,
  axisOrder: Schema.String,
  pageOrder: StrArray,
  timeCount: U32,
  channelCount: U32,
  zCount: U32,
  /**
   * Source acquisition time indices for each T plane in the ROI stack
   * (length === timeCount). Folder series often skip frames (e.g. every 6th
   * frame → `[0, 6, 12, …]`); analysis multiplies these by the assay interval
   * to get real minutes. When omitted, consumers default to `0..timeCount-1`.
   */
  timeIndices: Schema.optional(NumArray),
  source: AlignerSourceSchema,
  rois: Schema.mutable(Schema.Array(RoiIndexEntrySchema)),
}).annotations({ identifier: "RoiIndexFile" });

export const RoiPositionScanSchema = Schema.Struct({
  pos: U32,
  source: AlignerSourceSchema,
  channels: NumArray,
  times: NumArray,
  zSlices: NumArray,
  rois: Schema.mutable(Schema.Array(RoiIndexEntrySchema)),
}).annotations({ identifier: "RoiPositionScan" });

export const RoiWorkspaceScanSchema = Schema.Struct({
  positions: Schema.mutable(Schema.Array(RoiPositionScanSchema)),
}).annotations({ identifier: "RoiWorkspaceScan" });

export const AnnotationLabelSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  color: Schema.String,
}).annotations({ identifier: "AnnotationLabel" });

export const AnnotationLabelArraySchema = Schema.mutable(Schema.Array(AnnotationLabelSchema));

export const RoiFrameAnnotationSchema = Schema.Struct({
  classificationLabelId: Schema.NullOr(Schema.String),
  maskPath: Schema.NullOr(Schema.String),
  updatedAt: Schema.NullOr(Schema.String),
}).annotations({ identifier: "RoiFrameAnnotation" });

export const RoiFrameAnnotationPayloadSchema = Schema.Struct({
  classificationLabelId: Schema.NullOr(Schema.String),
  maskBase64Png: Schema.NullOr(Schema.String),
}).annotations({ identifier: "RoiFrameAnnotationPayload" });

export const LoadedRoiFrameAnnotationSchema = Schema.Struct({
  annotation: RoiFrameAnnotationSchema,
  maskBase64Png: Schema.NullOr(Schema.String),
}).annotations({ identifier: "LoadedRoiFrameAnnotation" });

export const ScanRoiWorkspaceRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
}).annotations({ identifier: "ScanRoiWorkspaceRequest" });

export const LoadAnnotationLabelsRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
}).annotations({ identifier: "LoadAnnotationLabelsRequest" });

export const SaveAnnotationLabelsRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  labels: AnnotationLabelArraySchema,
}).annotations({ identifier: "SaveAnnotationLabelsRequest" });

export const LoadRoiFrameRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  request: RoiFrameRequestSchema,
  contrast: Schema.NullOr(ContrastWindowSchema),
}).annotations({ identifier: "LoadRoiFrameRequest" });

export const LoadRoiFrameAnnotationRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  request: RoiFrameRequestSchema,
}).annotations({ identifier: "LoadRoiFrameAnnotationRequest" });

export const SaveRoiFrameAnnotationRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  request: RoiFrameRequestSchema,
  annotation: RoiFrameAnnotationPayloadSchema,
}).annotations({ identifier: "SaveRoiFrameAnnotationRequest" });

export type RoiFrameRequest = typeof RoiFrameRequestSchema.Type;
export type RoiIndexEntry = typeof RoiIndexEntrySchema.Type;
export type RoiIndexFile = typeof RoiIndexFileSchema.Type;
export type RoiPositionScan = typeof RoiPositionScanSchema.Type;
export type RoiWorkspaceScan = typeof RoiWorkspaceScanSchema.Type;
export type AnnotationLabel = typeof AnnotationLabelSchema.Type;
export type RoiFrameAnnotation = typeof RoiFrameAnnotationSchema.Type;
export type RoiFrameAnnotationPayload = typeof RoiFrameAnnotationPayloadSchema.Type;
export type LoadedRoiFrameAnnotation = typeof LoadedRoiFrameAnnotationSchema.Type;
export type ScanRoiWorkspaceRequest = typeof ScanRoiWorkspaceRequestSchema.Type;
export type LoadAnnotationLabelsRequest = typeof LoadAnnotationLabelsRequestSchema.Type;
export type SaveAnnotationLabelsRequest = typeof SaveAnnotationLabelsRequestSchema.Type;
export type LoadRoiFrameRequest = typeof LoadRoiFrameRequestSchema.Type;
export type LoadRoiFrameAnnotationRequest = typeof LoadRoiFrameAnnotationRequestSchema.Type;
export type SaveRoiFrameAnnotationRequest = typeof SaveRoiFrameAnnotationRequestSchema.Type;

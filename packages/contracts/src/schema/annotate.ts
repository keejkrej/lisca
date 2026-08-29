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
}).annotate({ identifier: "RoiFrameRequest" });

export const RoiIndexEntrySchema = Schema.Struct({
  roi: U32,
  fileName: Schema.String,
  bbox: RoiBboxSchema,
}).annotate({ identifier: "RoiIndexEntry" });

/**
 * On-disk `roi/Pos{n}/index.json`. Always `TCZYX` (use `zCount: 1` when there
 * is no z-stack). Stack shape is derived as `[timeCount, channelCount, zCount,
 * bbox.h, bbox.w]` — not stored per ROI. Provenance (`source`) and `pageOrder`
 * are omitted; page order follows `axisOrder`.
 */
export const RoiIndexFileSchema = Schema.Struct({
  position: U32,
  axisOrder: Schema.Literal("TCZYX"),
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
  rois: Schema.mutable(Schema.Array(RoiIndexEntrySchema)),
}).annotate({ identifier: "RoiIndexFile" });

export const RoiPositionScanSchema = Schema.Struct({
  pos: U32,
  channels: NumArray,
  times: NumArray,
  zSlices: NumArray,
  rois: Schema.mutable(Schema.Array(RoiIndexEntrySchema)),
}).annotate({ identifier: "RoiPositionScan" });

export const RoiWorkspaceScanSchema = Schema.Struct({
  positions: Schema.mutable(Schema.Array(RoiPositionScanSchema)),
}).annotate({ identifier: "RoiWorkspaceScan" });

export const AnnotationLabelSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  color: Schema.String,
}).annotate({ identifier: "AnnotationLabel" });

export const AnnotationLabelArraySchema = Schema.mutable(Schema.Array(AnnotationLabelSchema));

export const RoiFrameAnnotationSchema = Schema.Struct({
  classificationLabelId: Schema.NullOr(Schema.String),
  maskPath: Schema.NullOr(Schema.String),
  updatedAt: Schema.NullOr(Schema.String),
}).annotate({ identifier: "RoiFrameAnnotation" });

export const RoiFrameAnnotationPayloadSchema = Schema.Struct({
  classificationLabelId: Schema.NullOr(Schema.String),
  maskBase64Png: Schema.NullOr(Schema.String),
}).annotate({ identifier: "RoiFrameAnnotationPayload" });

export const LoadedRoiFrameAnnotationSchema = Schema.Struct({
  annotation: RoiFrameAnnotationSchema,
  maskBase64Png: Schema.NullOr(Schema.String),
}).annotate({ identifier: "LoadedRoiFrameAnnotation" });

export const ScanRoiWorkspaceRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
}).annotate({ identifier: "ScanRoiWorkspaceRequest" });

export const LoadAnnotationLabelsRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
}).annotate({ identifier: "LoadAnnotationLabelsRequest" });

export const SaveAnnotationLabelsRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  labels: AnnotationLabelArraySchema,
}).annotate({ identifier: "SaveAnnotationLabelsRequest" });

export const LoadRoiFrameRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  request: RoiFrameRequestSchema,
  contrast: Schema.NullOr(ContrastWindowSchema),
}).annotate({ identifier: "LoadRoiFrameRequest" });

export const LoadRoiFrameAnnotationRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  request: RoiFrameRequestSchema,
}).annotate({ identifier: "LoadRoiFrameAnnotationRequest" });

export const SaveRoiFrameAnnotationRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  request: RoiFrameRequestSchema,
  annotation: RoiFrameAnnotationPayloadSchema,
}).annotate({ identifier: "SaveRoiFrameAnnotationRequest" });

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

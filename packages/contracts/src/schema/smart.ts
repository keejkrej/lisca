import * as Schema from "effect/Schema";

import { RoiFrameRequestSchema } from "./annotate";
import { AlignGridCellCoordSchema, AutoExcludePreviewCellSchema } from "./align";
import { F64, NumArray } from "./primitives";
import { AlignerSourceSchema, ContrastWindowSchema, FrameRequestSchema } from "./shared";

export const SmartExcludeRequestSchema = Schema.Struct({
  source: AlignerSourceSchema,
  request: FrameRequestSchema,
  contrast: Schema.NullOr(ContrastWindowSchema),
  cells: Schema.mutable(Schema.Array(AutoExcludePreviewCellSchema)),
  threshold: Schema.optional(F64),
}).annotate({ identifier: "SmartExcludeRequest" });

export const SmartExcludeResponseSchema = Schema.Struct({
  excludedCells: Schema.mutable(Schema.Array(AlignGridCellCoordSchema)),
}).annotate({ identifier: "SmartExcludeResponse" });

export const SmartSegmentPointSchema = Schema.Struct({
  x: Schema.Finite,
  y: Schema.Finite,
  label: Schema.Literals([0, 1]),
}).annotate({ identifier: "SmartSegmentPoint" });

export const SmartSegmentRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  request: RoiFrameRequestSchema,
  contrast: Schema.NullOr(ContrastWindowSchema),
  points: Schema.mutable(Schema.Array(SmartSegmentPointSchema)),
}).annotate({ identifier: "SmartSegmentRequest" });

export const SmartSegmentResponseSchema = Schema.Struct({
  mask: NumArray,
}).annotate({ identifier: "SmartSegmentResponse" });

export type SmartExcludeRequest = typeof SmartExcludeRequestSchema.Type;
export type SmartExcludeResponse = typeof SmartExcludeResponseSchema.Type;
export type SmartSegmentPoint = typeof SmartSegmentPointSchema.Type;
export type SmartSegmentRequest = typeof SmartSegmentRequestSchema.Type;
export type SmartSegmentResponse = typeof SmartSegmentResponseSchema.Type;

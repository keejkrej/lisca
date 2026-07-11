import * as Schema from "effect/Schema";

import {
  AlignGridCellCoordSchema,
  AutoExcludePreviewCellSchema,
} from "./align";
import { F64, NumArray } from "./primitives";
import { FramePayloadSchema } from "./shared";

export const SmartExcludeRequestSchema = Schema.Struct({
  frame: FramePayloadSchema,
  cells: Schema.mutable(Schema.Array(AutoExcludePreviewCellSchema)),
  threshold: Schema.optional(F64),
}).annotations({ identifier: "SmartExcludeRequest" });

export const SmartExcludeResponseSchema = Schema.Struct({
  excludedCells: Schema.mutable(Schema.Array(AlignGridCellCoordSchema)),
}).annotations({ identifier: "SmartExcludeResponse" });

export const SmartSegmentPointSchema = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  label: Schema.Literal(0, 1),
}).annotations({ identifier: "SmartSegmentPoint" });

export const SmartSegmentRequestSchema = Schema.Struct({
  frame: FramePayloadSchema,
  points: Schema.mutable(Schema.Array(SmartSegmentPointSchema)),
}).annotations({ identifier: "SmartSegmentRequest" });

export const SmartSegmentResponseSchema = Schema.Struct({
  mask: NumArray,
}).annotations({ identifier: "SmartSegmentResponse" });

export type SmartExcludeRequest = typeof SmartExcludeRequestSchema.Type;
export type SmartExcludeResponse = typeof SmartExcludeResponseSchema.Type;
export type SmartSegmentPoint = typeof SmartSegmentPointSchema.Type;
export type SmartSegmentRequest = typeof SmartSegmentRequestSchema.Type;
export type SmartSegmentResponse = typeof SmartSegmentResponseSchema.Type;
import * as Schema from "effect/Schema";

import { RoiFrameRequestSchema } from "./annotate";
import { NumArray } from "./primitives";
import { ContrastWindowSchema } from "./shared";

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

export type SmartSegmentPoint = typeof SmartSegmentPointSchema.Type;
export type SmartSegmentRequest = typeof SmartSegmentRequestSchema.Type;
export type SmartSegmentResponse = typeof SmartSegmentResponseSchema.Type;

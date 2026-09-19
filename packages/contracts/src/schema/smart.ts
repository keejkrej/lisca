import * as Schema from "effect/Schema";

import { RoiFrameRequestSchema } from "./annotate";
import { AlignGridCellCoordSchema, AutoExcludePreviewCellSchema } from "./align";
import { F64, I32, NumArray, U32 } from "./primitives";
import { AlignerSourceSchema, ContrastWindowSchema, FrameRequestSchema } from "./shared";

export const OccupancyPromptLabelSchema = Schema.Literals(["occupied", "empty"]).annotate({
  identifier: "OccupancyPromptLabel",
});

export const OccupancyExcludeEngineSchema = Schema.Literals(["resnet", "promptPack"]).annotate({
  identifier: "OccupancyExcludeEngine",
});

/**
 * On-disk `align/occupancy-pack.json` for one assay/workspace. Frozen embedder
 * plus accumulating occupied/empty crops. Smart exclude uses this instead of
 * the ResNet once the pack is ready (≥2 occupied and ≥2 empty by default).
 * No lab-wide or cross-assay memory.
 */
export const OccupancyPromptExampleSchema = Schema.Struct({
  label: OccupancyPromptLabelSchema,
  embedding: Schema.mutable(Schema.Array(F64)),
  i: Schema.optional(I32),
  j: Schema.optional(I32),
  pos: Schema.optional(U32),
}).annotate({ identifier: "OccupancyPromptExample" });

export const OccupancyPromptPackSchema = Schema.Struct({
  version: U32,
  embedder: Schema.String,
  threshold: Schema.optional(F64),
  examples: Schema.mutable(Schema.Array(OccupancyPromptExampleSchema)),
}).annotate({ identifier: "OccupancyPromptPack" });

export const OccupancyPromptExampleInputSchema = Schema.Struct({
  label: OccupancyPromptLabelSchema,
  cell: AutoExcludePreviewCellSchema,
}).annotate({ identifier: "OccupancyPromptExampleInput" });

export const SmartExcludeRequestSchema = Schema.Struct({
  source: AlignerSourceSchema,
  request: FrameRequestSchema,
  contrast: Schema.NullOr(ContrastWindowSchema),
  cells: Schema.mutable(Schema.Array(AutoExcludePreviewCellSchema)),
  threshold: Schema.optional(F64),
  workspacePath: Schema.optional(Schema.String),
  persistPromptPack: Schema.optional(Schema.Boolean),
  appendPromptExamples: Schema.optional(Schema.Boolean),
  promptExamples: Schema.optional(Schema.mutable(Schema.Array(OccupancyPromptExampleInputSchema))),
  promptPack: Schema.optional(OccupancyPromptPackSchema),
}).annotate({ identifier: "SmartExcludeRequest" });

export const SmartExcludeResponseSchema = Schema.Struct({
  excludedCells: Schema.mutable(Schema.Array(AlignGridCellCoordSchema)),
  engine: Schema.optional(OccupancyExcludeEngineSchema),
  packReady: Schema.optional(Schema.Boolean),
  occupiedCount: Schema.optional(U32),
  emptyCount: Schema.optional(U32),
  message: Schema.optional(Schema.String),
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

export type OccupancyPromptLabel = typeof OccupancyPromptLabelSchema.Type;
export type OccupancyExcludeEngine = typeof OccupancyExcludeEngineSchema.Type;
export type OccupancyPromptExample = typeof OccupancyPromptExampleSchema.Type;
export type OccupancyPromptPack = typeof OccupancyPromptPackSchema.Type;
export type OccupancyPromptExampleInput = typeof OccupancyPromptExampleInputSchema.Type;
export type SmartExcludeRequest = typeof SmartExcludeRequestSchema.Type;
export type SmartExcludeResponse = typeof SmartExcludeResponseSchema.Type;
export type SmartSegmentPoint = typeof SmartSegmentPointSchema.Type;
export type SmartSegmentRequest = typeof SmartSegmentRequestSchema.Type;
export type SmartSegmentResponse = typeof SmartSegmentResponseSchema.Type;

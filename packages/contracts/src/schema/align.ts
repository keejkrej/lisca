import * as Schema from "effect/Schema";

import { AlignerSourceSchema, ContrastWindowSchema, FrameRequestSchema } from "./shared.ts";
import { F64, I32, NumArray, U32 } from "./primitives.ts";

export const AlignGridShapeSchema = Schema.Literal("rect", "square", "hex").annotations({
  identifier: "AlignGridShape",
});

export const AlignGridStateSchema = Schema.Struct({
  enabled: Schema.Boolean,
  shape: AlignGridShapeSchema,
  tx: F64,
  ty: F64,
  rotation: F64,
  spacingA: F64,
  spacingB: F64,
  cellWidth: F64,
  cellHeight: F64,
  opacity: F64,
}).annotations({ identifier: "AlignGridState" });

export const AlignGridCellCoordSchema = Schema.Struct({
  i: I32,
  j: I32,
}).annotations({ identifier: "AlignGridCellCoord" });

export const SavedAlignStateSchema = Schema.Struct({
  grid: AlignGridStateSchema,
  excludedCells: Schema.mutable(Schema.Array(AlignGridCellCoordSchema)),
}).annotations({ identifier: "SavedAlignState" });

export const NullableSavedAlignStateSchema = Schema.NullOr(SavedAlignStateSchema);

export const UIntArraySchema = NumArray;

export const AutoExcludePreviewCellSchema = Schema.Struct({
  i: I32,
  j: I32,
  x: U32,
  y: U32,
  w: U32,
  h: U32,
}).annotations({ identifier: "AutoExcludePreviewCell" });

export const AutoExcludePreviewRequestSchema = Schema.Struct({
  source: AlignerSourceSchema,
  selection: FrameRequestSchema,
  cells: Schema.mutable(Schema.Array(AutoExcludePreviewCellSchema)),
}).annotations({ identifier: "AutoExcludePreviewRequest" });

export const AutoExcludePreviewCellScoreSchema = Schema.Struct({
  i: I32,
  j: I32,
  score: F64,
}).annotations({ identifier: "AutoExcludePreviewCellScore" });

export const AutoExcludeHistogramBinSchema = Schema.Struct({
  start: F64,
  end: F64,
  count: U32,
}).annotations({ identifier: "AutoExcludeHistogramBin" });

export const AutoExcludePreviewResponseSchema = Schema.Struct({
  eligibleCellCount: U32,
  cellScores: Schema.mutable(Schema.Array(AutoExcludePreviewCellScoreSchema)),
  histogramBins: Schema.mutable(Schema.Array(AutoExcludeHistogramBinSchema)),
  scoreMin: F64,
  scoreMax: F64,
  threshold: F64,
}).annotations({ identifier: "AutoExcludePreviewResponse" });

export const SaveBboxResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  error: Schema.NullOr(Schema.String),
}).annotations({ identifier: "SaveBboxResponse" });

export const AlignOutputPathsSchema = Schema.Struct({
  bbox: Schema.String,
  align: Schema.String,
  roi: Schema.String,
}).annotations({ identifier: "AlignOutputPaths" });

export const CropOutputFormatSchema = Schema.Literal("tiff").annotations({
  identifier: "CropOutputFormat",
});

export const CropRoiStatusSchema = Schema.Literal(
  "queued",
  "running",
  "completed",
  "cancelled",
  "error",
).annotations({ identifier: "CropRoiStatus" });

export const CropRoiRequestSchema = Schema.Struct({
  requestId: Schema.String,
  workspacePath: Schema.String,
  source: AlignerSourceSchema,
  positions: NumArray,
  overwrite: Schema.Boolean,
  outputFormat: Schema.optional(CropOutputFormatSchema),
}).annotations({ identifier: "CropRoiRequest" });

export const CropRoiResponseSchema = Schema.Struct({
  requestId: Schema.String,
  status: CropRoiStatusSchema,
}).annotations({ identifier: "CropRoiResponse" });

export const CropRoiProgressSchema = Schema.Struct({
  requestId: Schema.String,
  status: CropRoiStatusSchema,
  position: Schema.NullOr(U32),
  completedPositions: U32,
  totalPositions: U32,
  completedRois: U32,
  totalRois: U32,
  message: Schema.NullOr(Schema.String),
  error: Schema.optional(Schema.NullOr(Schema.String)),
  skippedPositions: Schema.optional(Schema.mutable(Schema.Array(U32))),
}).annotations({ identifier: "CropRoiProgress" });

export const CropRoiProgressMessageSchema = Schema.Struct({
  type: Schema.Literal("cropRoiProgress"),
  progress: CropRoiProgressSchema,
}).annotations({ identifier: "CropRoiProgressMessage" });

export const RoiPosExistsResponseSchema = Schema.Struct({
  exists: Schema.Boolean,
}).annotations({ identifier: "RoiPosExistsResponse" });

/** POST /align/scan-source request body. */
export const ScanSourceRequestSchema = Schema.Struct({
  source: AlignerSourceSchema,
}).annotations({ identifier: "ScanSourceRequest" });

/** POST /align/load-frame request body. */
export const LoadFrameRequestSchema = Schema.Struct({
  source: AlignerSourceSchema,
  request: FrameRequestSchema,
  contrast: Schema.NullOr(ContrastWindowSchema),
}).annotations({ identifier: "LoadFrameRequest" });

/** POST /align/save-bbox request body. */
export const SaveBboxRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  pos: Schema.Number,
  csv: Schema.String,
  alignState: SavedAlignStateSchema,
}).annotations({ identifier: "SaveBboxRequest" });

export type AlignGridShape = typeof AlignGridShapeSchema.Type;
export type AlignGridState = typeof AlignGridStateSchema.Type;
export type AlignGridCellCoord = typeof AlignGridCellCoordSchema.Type;
export type SavedAlignState = typeof SavedAlignStateSchema.Type;
export type AutoExcludePreviewCell = typeof AutoExcludePreviewCellSchema.Type;
export type AutoExcludePreviewRequest = typeof AutoExcludePreviewRequestSchema.Type;
export type AutoExcludePreviewCellScore = typeof AutoExcludePreviewCellScoreSchema.Type;
export type AutoExcludeHistogramBin = typeof AutoExcludeHistogramBinSchema.Type;
export type AutoExcludePreviewResponse = typeof AutoExcludePreviewResponseSchema.Type;
export type SaveBboxResponse = typeof SaveBboxResponseSchema.Type;
export type AlignOutputPaths = typeof AlignOutputPathsSchema.Type;
export type CropOutputFormat = typeof CropOutputFormatSchema.Type;
export type CropRoiStatus = typeof CropRoiStatusSchema.Type;
export type CropRoiRequest = typeof CropRoiRequestSchema.Type;
export type CropRoiResponse = typeof CropRoiResponseSchema.Type;
export type CropRoiProgress = typeof CropRoiProgressSchema.Type;
export type CropRoiProgressMessage = typeof CropRoiProgressMessageSchema.Type;
export type RoiPosExistsResponse = typeof RoiPosExistsResponseSchema.Type;
export type ScanSourceRequest = typeof ScanSourceRequestSchema.Type;
export type LoadFrameRequest = typeof LoadFrameRequestSchema.Type;
export type SaveBboxRequest = typeof SaveBboxRequestSchema.Type;

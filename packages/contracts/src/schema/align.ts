import * as Schema from "effect/Schema";

import { AlignerSourceSchema, ContrastWindowSchema, FrameRequestSchema } from "./shared";
import { F64, I32, NumArray, U32, U32FromString } from "./primitives";

export const AlignGridShapeSchema = Schema.Literals(["rect", "square", "hex"]).annotate({
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
}).annotate({ identifier: "AlignGridState" });

export const AlignGridCellCoordSchema = Schema.Struct({
  i: I32,
  j: I32,
}).annotate({ identifier: "AlignGridCellCoord" });

export const SavedAlignStateSchema = Schema.Struct({
  grid: AlignGridStateSchema,
  excludedCells: Schema.mutable(Schema.Array(AlignGridCellCoordSchema)),
}).annotate({ identifier: "SavedAlignState" });

export const NullableSavedAlignStateSchema = Schema.NullOr(SavedAlignStateSchema);

export const UIntArraySchema = NumArray;

export const AutoExcludePreviewCellSchema = Schema.Struct({
  i: I32,
  j: I32,
  x: U32,
  y: U32,
  w: U32,
  h: U32,
}).annotate({ identifier: "AutoExcludePreviewCell" });

export const AutoExcludePreviewCellScoreSchema = Schema.Struct({
  i: I32,
  j: I32,
  score: F64,
}).annotate({ identifier: "AutoExcludePreviewCellScore" });

export const AutoExcludeHistogramBinSchema = Schema.Struct({
  start: F64,
  end: F64,
  count: U32,
}).annotate({ identifier: "AutoExcludeHistogramBin" });

export const AutoExcludePreviewResponseSchema = Schema.Struct({
  eligibleCellCount: U32,
  cellScores: Schema.mutable(Schema.Array(AutoExcludePreviewCellScoreSchema)),
  histogramBins: Schema.mutable(Schema.Array(AutoExcludeHistogramBinSchema)),
  scoreMin: F64,
  scoreMax: F64,
  threshold: F64,
}).annotate({ identifier: "AutoExcludePreviewResponse" });

export const SaveBboxResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  error: Schema.NullOr(Schema.String),
}).annotate({ identifier: "SaveBboxResponse" });

export const AlignOutputPathsSchema = Schema.Struct({
  bbox: Schema.String,
  align: Schema.String,
  roi: Schema.String,
}).annotate({ identifier: "AlignOutputPaths" });

export const CropOutputFormatSchema = Schema.Literal("tiff").annotate({
  identifier: "CropOutputFormat",
});

export const CropRoiStatusSchema = Schema.Literals([
  "queued",
  "running",
  "completed",
  "cancelled",
  "error",
]).annotate({ identifier: "CropRoiStatus" });

export const CropRoiDispositionSchema = Schema.Literals(["started", "attached"]).annotate({
  identifier: "CropRoiDisposition",
});

export const CropRoiRequestSchema = Schema.Struct({
  requestId: Schema.String,
  workspacePath: Schema.String,
  source: AlignerSourceSchema,
  positions: NumArray,
  overwrite: Schema.Boolean,
  outputFormat: Schema.optional(CropOutputFormatSchema),
}).annotate({ identifier: "CropRoiRequest" });

export const CropRoiResponseSchema = Schema.Struct({
  requestId: Schema.String,
  status: CropRoiStatusSchema,
  disposition: CropRoiDispositionSchema,
}).annotate({ identifier: "CropRoiResponse" });

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
}).annotate({ identifier: "CropRoiProgress" });

export const NullableCropRoiProgressSchema = Schema.NullOr(CropRoiProgressSchema).annotate({
  identifier: "NullableCropRoiProgress",
});

export const RoiPosExistsResponseSchema = Schema.Struct({
  exists: Schema.Boolean,
}).annotate({ identifier: "RoiPosExistsResponse" });

/** POST /align/scan-source request body. */
export const ScanSourceRequestSchema = Schema.Struct({
  source: AlignerSourceSchema,
}).annotate({ identifier: "ScanSourceRequest" });

/** POST /align/load-frame request body. */
export const LoadFrameRequestSchema = Schema.Struct({
  source: AlignerSourceSchema,
  request: FrameRequestSchema,
  contrast: Schema.NullOr(ContrastWindowSchema),
}).annotate({ identifier: "LoadFrameRequest" });

/** POST /align/save-bbox request body. */
export const SaveBboxRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  pos: U32,
  csv: Schema.String,
  alignState: SavedAlignStateSchema,
}).annotate({ identifier: "SaveBboxRequest" });

export const LoadAlignStateQuerySchema = Schema.Struct({
  workspacePath: Schema.String,
  pos: U32FromString,
}).annotate({ identifier: "LoadAlignStateQuery" });

export const OutputPathsQuerySchema = Schema.Struct({
  pos: U32FromString,
}).annotate({ identifier: "OutputPathsQuery" });

export const SavedBboxPositionsQuerySchema = Schema.Struct({
  workspacePath: Schema.String,
}).annotate({ identifier: "SavedBboxPositionsQuery" });

export const RoiPosExistsQuerySchema = Schema.Struct({
  workspacePath: Schema.String,
  pos: U32FromString,
}).annotate({ identifier: "RoiPosExistsQuery" });

export const CancelCropRoiRequestSchema = Schema.Struct({
  requestId: Schema.String,
}).annotate({ identifier: "CancelCropRoiRequest" });

export const CropRoiProgressQuerySchema = Schema.Struct({
  requestId: Schema.String,
}).annotate({ identifier: "CropRoiProgressQuery" });

export const LatestCropQuerySchema = Schema.Struct({
  workspacePath: Schema.String,
}).annotate({ identifier: "LatestCropQuery" });

export type AlignGridShape = typeof AlignGridShapeSchema.Type;
export type AlignGridState = typeof AlignGridStateSchema.Type;
export type AlignGridCellCoord = typeof AlignGridCellCoordSchema.Type;
export type SavedAlignState = typeof SavedAlignStateSchema.Type;
export type AutoExcludePreviewCell = typeof AutoExcludePreviewCellSchema.Type;
export type AutoExcludePreviewCellScore = typeof AutoExcludePreviewCellScoreSchema.Type;
export type AutoExcludeHistogramBin = typeof AutoExcludeHistogramBinSchema.Type;
export type AutoExcludePreviewResponse = typeof AutoExcludePreviewResponseSchema.Type;
export type SaveBboxResponse = typeof SaveBboxResponseSchema.Type;
export type AlignOutputPaths = typeof AlignOutputPathsSchema.Type;
export type CropOutputFormat = typeof CropOutputFormatSchema.Type;
export type CropRoiStatus = typeof CropRoiStatusSchema.Type;
export type CropRoiDisposition = typeof CropRoiDispositionSchema.Type;
export type CropRoiRequest = typeof CropRoiRequestSchema.Type;
export type CropRoiResponse = typeof CropRoiResponseSchema.Type;
export type CropRoiProgress = typeof CropRoiProgressSchema.Type;
export type RoiPosExistsResponse = typeof RoiPosExistsResponseSchema.Type;
export type ScanSourceRequest = typeof ScanSourceRequestSchema.Type;
export type LoadFrameRequest = typeof LoadFrameRequestSchema.Type;
export type SaveBboxRequest = typeof SaveBboxRequestSchema.Type;
export type LoadAlignStateQuery = typeof LoadAlignStateQuerySchema.Type;
export type OutputPathsQuery = typeof OutputPathsQuerySchema.Type;
export type SavedBboxPositionsQuery = typeof SavedBboxPositionsQuerySchema.Type;
export type RoiPosExistsQuery = typeof RoiPosExistsQuerySchema.Type;
export type CancelCropRoiRequest = typeof CancelCropRoiRequestSchema.Type;
export type CropRoiProgressQuery = typeof CropRoiProgressQuerySchema.Type;
export type LatestCropQuery = typeof LatestCropQuerySchema.Type;

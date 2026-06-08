import * as Schema from "effect/Schema";

import { PIXEL_TYPES } from "./constants.ts";

/**
 * Effect Schema is the single source of truth for the cross-language wire
 * contract. JSON Schema `format` annotations below pin the exact Rust numeric
 * types so the generated serde structs match the domain code (`u32`/`i32`/
 * `f64`). Each named schema carries an `identifier` so OpenAPI emits a clean
 * component name (and `typify` a clean Rust type name). The TypeScript wire
 * types are derived from these schemas at the bottom of this file.
 */
const U32 = Schema.Number.pipe(Schema.int(), Schema.nonNegative()).annotations({
  jsonSchema: { type: "integer", format: "uint32", minimum: 0 },
});
const I32 = Schema.Number.pipe(Schema.int()).annotations({
  jsonSchema: { type: "integer", format: "int32" },
});
const F64 = Schema.Number.annotations({ jsonSchema: { type: "number", format: "double" } });
const NumArray = Schema.mutable(Schema.Array(U32));
const StrArray = Schema.mutable(Schema.Array(Schema.String));

export const AppIdSchema = Schema.Literal("aligner", "annotator", "studio").annotations({
  identifier: "AppId",
});

export const HelloMessageSchema = Schema.Struct({
  app: AppIdSchema,
  version: Schema.String,
}).annotations({ identifier: "Hello" });

export const HostFsEntrySchema = Schema.Struct({
  name: Schema.String,
  path: Schema.String,
  isDirectory: Schema.Boolean,
}).annotations({ identifier: "HostFsEntry" });

export const HostListDirectoryResultSchema = Schema.Struct({
  path: Schema.NullOr(Schema.String),
  parent: Schema.NullOr(Schema.String),
  entries: Schema.mutable(Schema.Array(HostFsEntrySchema)),
}).annotations({ identifier: "HostListDirectoryResult" });

export const HomeDirectoryResponseSchema = Schema.Struct({
  path: Schema.String,
}).annotations({ identifier: "HomeDirectoryResponse" });

export const ReadTextFileResponseSchema = Schema.Struct({
  contents: Schema.String,
}).annotations({ identifier: "ReadTextFileResponse" });

export const SaveAssayJsonRequestSchema = Schema.Struct({
  saveTo: Schema.String,
  contents: Schema.String,
}).annotations({ identifier: "SaveAssayJsonRequest" });

export const SaveAssayJsonResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  path: Schema.String,
}).annotations({ identifier: "SaveAssayJsonResponse" });

export const SaveResultPdfRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  fileName: Schema.String,
  contentsBase64: Schema.String,
}).annotations({ identifier: "SaveResultPdfRequest" });

export const SaveResultPdfResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  directory: Schema.String,
  path: Schema.String,
}).annotations({ identifier: "SaveResultPdfResponse" });

export const WorkspaceScanSchema = Schema.Struct({
  positions: NumArray,
  channels: NumArray,
  times: NumArray,
  zSlices: NumArray,
}).annotations({ identifier: "WorkspaceScan" });

export const FolderSourceSchema = Schema.Struct({
  kind: Schema.Literal("folder"),
  path: Schema.String,
  subfolderTemplate: Schema.String,
  filenameTemplate: Schema.String,
}).annotations({ identifier: "FolderSource" });

export const AlignerSourceSchema = Schema.Union(
  FolderSourceSchema,
  Schema.Struct({ kind: Schema.Literal("tif"), path: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("jpg"), path: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("nd2"), path: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("czi"), path: Schema.String }),
).annotations({ identifier: "AlignerSource" });

export const FrameRequestSchema = Schema.Struct({
  pos: U32,
  channel: U32,
  time: U32,
  z: U32,
}).annotations({ identifier: "FrameRequest" });

export const ContrastWindowSchema = Schema.Struct({
  min: U32,
  max: U32,
}).annotations({ identifier: "ContrastWindow" });

export const PixelTypeSchema = Schema.Literal(...PIXEL_TYPES).annotations({
  identifier: "PixelType",
});

export const FramePayloadSchema = Schema.Struct({
  width: U32,
  height: U32,
  dataBase64: Schema.String,
  pixelType: PixelTypeSchema,
  contrastDomain: ContrastWindowSchema,
  suggestedContrast: ContrastWindowSchema,
  appliedContrast: ContrastWindowSchema,
}).annotations({ identifier: "FramePayload" });

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

export const AnalysisStatusSchema = Schema.Literal(
  "queued",
  "running",
  "completed",
  "error",
).annotations({ identifier: "AnalysisStatus" });

export const AnalysisStageSchema = Schema.Literal(
  "queued",
  "preparing",
  "segment",
  "timeseries",
  "auc",
  "fit",
  "completed",
).annotations({ identifier: "AnalysisStage" });

export const StudioAnalysisCsvFileSchema = Schema.Struct({
  kind: Schema.String,
  fileName: Schema.String,
  path: Schema.String,
  csv: Schema.String,
}).annotations({ identifier: "AnalysisCsvFile" });

export const AnalysisProgressSchema = Schema.Struct({
  requestId: Schema.String,
  status: AnalysisStatusSchema,
  stage: AnalysisStageSchema,
  progress: F64,
  message: Schema.NullOr(Schema.String),
  resultFiles: Schema.optional(Schema.mutable(Schema.Array(StudioAnalysisCsvFileSchema))),
  error: Schema.NullOr(Schema.String),
}).annotations({ identifier: "AnalysisProgress" });

export const NullableAnalysisProgressSchema = Schema.NullOr(AnalysisProgressSchema);

export const AnalysisProgressMessageSchema = Schema.Struct({
  type: Schema.Literal("analysisProgress"),
  progress: AnalysisProgressSchema,
}).annotations({ identifier: "AnalysisProgressMessage" });

export const AnalysisStartRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  requestId: Schema.String,
}).annotations({ identifier: "AnalysisStartRequest" });

export const RoiPosExistsResponseSchema = Schema.Struct({
  exists: Schema.Boolean,
}).annotations({ identifier: "RoiPosExistsResponse" });

export const RoiFrameRequestSchema = Schema.Struct({
  pos: U32,
  roi: U32,
  channel: U32,
  time: U32,
  z: U32,
}).annotations({ identifier: "RoiFrameRequest" });

export const RoiBboxSchema = Schema.Struct({
  roi: U32,
  x: U32,
  y: U32,
  w: U32,
  h: U32,
}).annotations({ identifier: "RoiBbox" });

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

export const ServerWsMessageSchema = Schema.Union(
  HelloMessageSchema,
  CropRoiProgressMessageSchema,
  AnalysisProgressMessageSchema,
).annotations({ identifier: "ServerWsMessage" });

// --- Derived TypeScript wire types -----------------------------------------
// These are the canonical types consumed across the apps. They are projected
// directly from the schemas above so the schema stays the single source of
// truth.

export type AppId = typeof AppIdSchema.Type;
export type HelloMessage = typeof HelloMessageSchema.Type;
export type HostFsEntry = typeof HostFsEntrySchema.Type;
export type HostListDirectoryResult = typeof HostListDirectoryResultSchema.Type;
export type HomeDirectoryResponse = typeof HomeDirectoryResponseSchema.Type;
export type ReadTextFileResponse = typeof ReadTextFileResponseSchema.Type;
export type SaveAssayJsonRequest = typeof SaveAssayJsonRequestSchema.Type;
export type SaveAssayJsonResponse = typeof SaveAssayJsonResponseSchema.Type;
export type SaveResultPdfRequest = typeof SaveResultPdfRequestSchema.Type;
export type SaveResultPdfResponse = typeof SaveResultPdfResponseSchema.Type;
export type WorkspaceScan = typeof WorkspaceScanSchema.Type;
export type AlignerSource = typeof AlignerSourceSchema.Type;
export type ImageSource = AlignerSource;
export type FolderSource = Extract<AlignerSource, { kind: "folder" }>;
export type Nd2Source = Extract<AlignerSource, { kind: "nd2" }>;
export type CziSource = Extract<AlignerSource, { kind: "czi" }>;
export type FrameRequest = typeof FrameRequestSchema.Type;
export type ContrastWindow = typeof ContrastWindowSchema.Type;
export type FramePayload = typeof FramePayloadSchema.Type;
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
export type AnalysisStatus = typeof AnalysisStatusSchema.Type;
export type AnalysisStage = typeof AnalysisStageSchema.Type;
export type StudioAnalysisCsvFile = typeof StudioAnalysisCsvFileSchema.Type;
export type AnalysisProgress = typeof AnalysisProgressSchema.Type;
export type AnalysisProgressMessage = typeof AnalysisProgressMessageSchema.Type;
export type AnalysisStartRequest = typeof AnalysisStartRequestSchema.Type;
export type RoiPosExistsResponse = typeof RoiPosExistsResponseSchema.Type;
export type RoiFrameRequest = typeof RoiFrameRequestSchema.Type;
export type RoiBbox = typeof RoiBboxSchema.Type;
export type RoiIndexEntry = typeof RoiIndexEntrySchema.Type;
export type RoiIndexFile = typeof RoiIndexFileSchema.Type;
export type RoiPositionScan = typeof RoiPositionScanSchema.Type;
export type RoiWorkspaceScan = typeof RoiWorkspaceScanSchema.Type;
export type AnnotationLabel = typeof AnnotationLabelSchema.Type;
export type RoiFrameAnnotation = typeof RoiFrameAnnotationSchema.Type;
export type RoiFrameAnnotationPayload = typeof RoiFrameAnnotationPayloadSchema.Type;
export type LoadedRoiFrameAnnotation = typeof LoadedRoiFrameAnnotationSchema.Type;
export type ServerWsMessage = typeof ServerWsMessageSchema.Type;

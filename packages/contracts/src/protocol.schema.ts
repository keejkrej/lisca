import * as Schema from "effect/Schema";

import { PIXEL_TYPES } from "./constants.js";

import type {
  AlignGridCellCoord,
  AlignGridShape,
  AlignGridState,
  AlignOutputPaths,
  AlignerSource,
  AnalysisProgress,
  AnalysisProgressMessage,
  AnalysisStage,
  AnalysisStartRequest,
  AnalysisStatus,
  AnnotationLabel,
  AppId,
  AutoExcludeHistogramBin,
  AutoExcludePreviewCell,
  AutoExcludePreviewCellScore,
  AutoExcludePreviewRequest,
  AutoExcludePreviewResponse,
  ContrastWindow,
  CropOutputFormat,
  CropRoiProgress,
  CropRoiProgressMessage,
  CropRoiRequest,
  CropRoiResponse,
  CropRoiStatus,
  FramePayload,
  FrameRequest,
  HelloMessage,
  HomeDirectoryResponse,
  HostFsEntry,
  HostListDirectoryResult,
  LoadedRoiFrameAnnotation,
  ReadTextFileResponse,
  RoiBbox,
  RoiFrameAnnotation,
  RoiFrameAnnotationPayload,
  RoiFrameRequest,
  RoiIndexEntry,
  RoiIndexFile,
  RoiPosExistsResponse,
  RoiPositionScan,
  RoiWorkspaceScan,
  SaveAssayJsonRequest,
  SaveAssayJsonResponse,
  SaveBboxResponse,
  SaveResultPdfRequest,
  SaveResultPdfResponse,
  SavedAlignState,
  StudioAnalysisCsvFile,
  WorkspaceScan,
} from "./protocol.wire.js";

const UInt = Schema.Number.pipe(Schema.int(), Schema.nonNegative());
const Int = Schema.Number.pipe(Schema.int());
const NumArray = Schema.mutable(Schema.Array(UInt));
const StrArray = Schema.mutable(Schema.Array(Schema.String));

export const AppIdSchema = Schema.Literal("aligner", "annotator", "studio") satisfies Schema.Schema<AppId>;

export const HelloMessageSchema = Schema.Struct({
  app: AppIdSchema,
  version: Schema.String,
}) satisfies Schema.Schema<HelloMessage>;

export const HostFsEntrySchema = Schema.Struct({
  name: Schema.String,
  path: Schema.String,
  isDirectory: Schema.Boolean,
}) satisfies Schema.Schema<HostFsEntry>;

export const HostListDirectoryResultSchema = Schema.Struct({
  path: Schema.NullOr(Schema.String),
  parent: Schema.NullOr(Schema.String),
  entries: Schema.mutable(Schema.Array(HostFsEntrySchema)),
}) satisfies Schema.Schema<HostListDirectoryResult>;

export const HomeDirectoryResponseSchema = Schema.Struct({
  path: Schema.String,
}) satisfies Schema.Schema<HomeDirectoryResponse>;

export const ReadTextFileResponseSchema = Schema.Struct({
  contents: Schema.String,
}) satisfies Schema.Schema<ReadTextFileResponse>;

export const SaveAssayJsonRequestSchema = Schema.Struct({
  saveTo: Schema.String,
  contents: Schema.String,
}) satisfies Schema.Schema<SaveAssayJsonRequest>;

export const SaveAssayJsonResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  path: Schema.String,
}) satisfies Schema.Schema<SaveAssayJsonResponse>;

export const SaveResultPdfRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  fileName: Schema.String,
  contentsBase64: Schema.String,
}) satisfies Schema.Schema<SaveResultPdfRequest>;

export const SaveResultPdfResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  directory: Schema.String,
  path: Schema.String,
}) satisfies Schema.Schema<SaveResultPdfResponse>;

export const WorkspaceScanSchema = Schema.Struct({
  positions: NumArray,
  channels: NumArray,
  times: NumArray,
  zSlices: NumArray,
}) satisfies Schema.Schema<WorkspaceScan>;

export const FolderSourceSchema = Schema.Struct({
  kind: Schema.Literal("folder"),
  path: Schema.String,
  subfolderTemplate: Schema.String,
  filenameTemplate: Schema.String,
});

export const AlignerSourceSchema = Schema.Union(
  FolderSourceSchema,
  Schema.Struct({ kind: Schema.Literal("tif"), path: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("jpg"), path: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("nd2"), path: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("czi"), path: Schema.String }),
) satisfies Schema.Schema<AlignerSource>;

export const FrameRequestSchema = Schema.Struct({
  pos: UInt,
  channel: UInt,
  time: UInt,
  z: UInt,
}) satisfies Schema.Schema<FrameRequest>;

export const ContrastWindowSchema = Schema.Struct({
  min: UInt,
  max: UInt,
}) satisfies Schema.Schema<ContrastWindow>;

export const PixelTypeSchema = Schema.Literal(...PIXEL_TYPES);

export const FramePayloadSchema = Schema.Struct({
  width: UInt,
  height: UInt,
  dataBase64: Schema.String,
  pixelType: PixelTypeSchema,
  contrastDomain: ContrastWindowSchema,
  suggestedContrast: ContrastWindowSchema,
  appliedContrast: ContrastWindowSchema,
}) satisfies Schema.Schema<FramePayload>;

export const AlignGridShapeSchema = Schema.Literal(
  "rect",
  "square",
  "hex",
) satisfies Schema.Schema<AlignGridShape>;

export const AlignGridStateSchema = Schema.Struct({
  enabled: Schema.Boolean,
  shape: AlignGridShapeSchema,
  tx: Schema.Number,
  ty: Schema.Number,
  rotation: Schema.Number,
  spacingA: Schema.Number,
  spacingB: Schema.Number,
  cellWidth: Schema.Number,
  cellHeight: Schema.Number,
  opacity: Schema.Number,
}) satisfies Schema.Schema<AlignGridState>;

export const AlignGridCellCoordSchema = Schema.Struct({
  i: Int,
  j: Int,
}) satisfies Schema.Schema<AlignGridCellCoord>;

export const SavedAlignStateSchema = Schema.Struct({
  grid: AlignGridStateSchema,
  excludedCells: Schema.mutable(Schema.Array(AlignGridCellCoordSchema)),
}) satisfies Schema.Schema<SavedAlignState>;

export const NullableSavedAlignStateSchema = Schema.NullOr(
  SavedAlignStateSchema,
) satisfies Schema.Schema<SavedAlignState | null>;

export const UIntArraySchema = NumArray satisfies Schema.Schema<number[]>;

export const AutoExcludePreviewCellSchema = Schema.Struct({
  i: Int,
  j: Int,
  x: UInt,
  y: UInt,
  w: UInt,
  h: UInt,
}) satisfies Schema.Schema<AutoExcludePreviewCell>;

export const AutoExcludePreviewRequestSchema = Schema.Struct({
  source: AlignerSourceSchema,
  selection: FrameRequestSchema,
  cells: Schema.mutable(Schema.Array(AutoExcludePreviewCellSchema)),
}) satisfies Schema.Schema<AutoExcludePreviewRequest>;

export const AutoExcludePreviewCellScoreSchema = Schema.Struct({
  i: Int,
  j: Int,
  score: Schema.Number,
}) satisfies Schema.Schema<AutoExcludePreviewCellScore>;

export const AutoExcludeHistogramBinSchema = Schema.Struct({
  start: Schema.Number,
  end: Schema.Number,
  count: UInt,
}) satisfies Schema.Schema<AutoExcludeHistogramBin>;

export const AutoExcludePreviewResponseSchema = Schema.Struct({
  eligibleCellCount: UInt,
  cellScores: Schema.mutable(Schema.Array(AutoExcludePreviewCellScoreSchema)),
  histogramBins: Schema.mutable(Schema.Array(AutoExcludeHistogramBinSchema)),
  scoreMin: Schema.Number,
  scoreMax: Schema.Number,
  threshold: Schema.Number,
}) satisfies Schema.Schema<AutoExcludePreviewResponse>;

export const SaveBboxResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  error: Schema.NullOr(Schema.String),
}) satisfies Schema.Schema<SaveBboxResponse>;

export const AlignOutputPathsSchema = Schema.Struct({
  bbox: Schema.String,
  align: Schema.String,
  roi: Schema.String,
}) satisfies Schema.Schema<AlignOutputPaths>;

export const CropOutputFormatSchema = Schema.Literal("tiff") satisfies Schema.Schema<CropOutputFormat>;

export const CropRoiStatusSchema = Schema.Literal(
  "queued",
  "running",
  "completed",
  "cancelled",
  "error",
) satisfies Schema.Schema<CropRoiStatus>;

export const CropRoiRequestSchema = Schema.Struct({
  requestId: Schema.String,
  workspacePath: Schema.String,
  source: AlignerSourceSchema,
  positions: NumArray,
  overwrite: Schema.Boolean,
  outputFormat: Schema.optional(CropOutputFormatSchema),
}) satisfies Schema.Schema<CropRoiRequest>;

export const CropRoiResponseSchema = Schema.Struct({
  requestId: Schema.String,
  status: CropRoiStatusSchema,
}) satisfies Schema.Schema<CropRoiResponse>;

export const CropRoiProgressSchema = Schema.Struct({
  requestId: Schema.String,
  status: CropRoiStatusSchema,
  position: Schema.NullOr(UInt),
  completedPositions: UInt,
  totalPositions: UInt,
  completedRois: UInt,
  totalRois: UInt,
  message: Schema.NullOr(Schema.String),
  error: Schema.optional(Schema.NullOr(Schema.String)),
}) satisfies Schema.Schema<CropRoiProgress>;

export const CropRoiProgressMessageSchema = Schema.Struct({
  type: Schema.Literal("cropRoiProgress"),
  progress: CropRoiProgressSchema,
}) satisfies Schema.Schema<CropRoiProgressMessage>;

export const AnalysisStatusSchema = Schema.Literal(
  "queued",
  "running",
  "completed",
  "error",
) satisfies Schema.Schema<AnalysisStatus>;

export const AnalysisStageSchema = Schema.Literal(
  "queued",
  "preparing",
  "segment",
  "timeseries",
  "auc",
  "fit",
  "completed",
) satisfies Schema.Schema<AnalysisStage>;

export const StudioAnalysisCsvFileSchema = Schema.Struct({
  kind: Schema.String,
  fileName: Schema.String,
  path: Schema.String,
  csv: Schema.String,
}) satisfies Schema.Schema<StudioAnalysisCsvFile>;

export const AnalysisProgressSchema = Schema.Struct({
  requestId: Schema.String,
  status: AnalysisStatusSchema,
  stage: AnalysisStageSchema,
  progress: Schema.Number,
  message: Schema.NullOr(Schema.String),
  resultFiles: Schema.optional(Schema.mutable(Schema.Array(StudioAnalysisCsvFileSchema))),
  error: Schema.NullOr(Schema.String),
}) satisfies Schema.Schema<AnalysisProgress>;

export const NullableAnalysisProgressSchema = Schema.NullOr(
  AnalysisProgressSchema,
) satisfies Schema.Schema<AnalysisProgress | null>;

export const AnalysisProgressMessageSchema = Schema.Struct({
  type: Schema.Literal("analysisProgress"),
  progress: AnalysisProgressSchema,
}) satisfies Schema.Schema<AnalysisProgressMessage>;

export const AnalysisStartRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  requestId: Schema.String,
}) satisfies Schema.Schema<AnalysisStartRequest>;

export const RoiPosExistsResponseSchema = Schema.Struct({
  exists: Schema.Boolean,
}) satisfies Schema.Schema<RoiPosExistsResponse>;

export const RoiFrameRequestSchema = Schema.Struct({
  pos: UInt,
  roi: UInt,
  channel: UInt,
  time: UInt,
  z: UInt,
}) satisfies Schema.Schema<RoiFrameRequest>;

export const RoiBboxSchema = Schema.Struct({
  roi: UInt,
  x: UInt,
  y: UInt,
  w: UInt,
  h: UInt,
}) satisfies Schema.Schema<RoiBbox>;

export const RoiIndexEntrySchema = Schema.Struct({
  roi: UInt,
  fileName: Schema.String,
  bbox: RoiBboxSchema,
  shape: Schema.Tuple(UInt, UInt, UInt, UInt, UInt),
}) satisfies Schema.Schema<RoiIndexEntry>;

export const RoiIndexFileSchema = Schema.Struct({
  position: UInt,
  axisOrder: Schema.String,
  pageOrder: StrArray,
  timeCount: UInt,
  channelCount: UInt,
  zCount: UInt,
  source: AlignerSourceSchema,
  rois: Schema.mutable(Schema.Array(RoiIndexEntrySchema)),
}) satisfies Schema.Schema<RoiIndexFile>;

export const RoiPositionScanSchema = Schema.Struct({
  pos: UInt,
  source: AlignerSourceSchema,
  channels: NumArray,
  times: NumArray,
  zSlices: NumArray,
  rois: Schema.mutable(Schema.Array(RoiIndexEntrySchema)),
}) satisfies Schema.Schema<RoiPositionScan>;

export const RoiWorkspaceScanSchema = Schema.Struct({
  positions: Schema.mutable(Schema.Array(RoiPositionScanSchema)),
}) satisfies Schema.Schema<RoiWorkspaceScan>;

export const AnnotationLabelSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  color: Schema.String,
}) satisfies Schema.Schema<AnnotationLabel>;

export const AnnotationLabelArraySchema = Schema.mutable(
  Schema.Array(AnnotationLabelSchema),
) as Schema.Schema<AnnotationLabel[]>;

export const RoiFrameAnnotationSchema = Schema.Struct({
  classificationLabelId: Schema.NullOr(Schema.String),
  maskPath: Schema.NullOr(Schema.String),
  updatedAt: Schema.NullOr(Schema.String),
}) satisfies Schema.Schema<RoiFrameAnnotation>;

export const RoiFrameAnnotationPayloadSchema = Schema.Struct({
  classificationLabelId: Schema.NullOr(Schema.String),
  maskBase64Png: Schema.NullOr(Schema.String),
}) satisfies Schema.Schema<RoiFrameAnnotationPayload>;

export const LoadedRoiFrameAnnotationSchema = Schema.Struct({
  annotation: RoiFrameAnnotationSchema,
  maskBase64Png: Schema.NullOr(Schema.String),
}) satisfies Schema.Schema<LoadedRoiFrameAnnotation>;

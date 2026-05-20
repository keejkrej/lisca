/**
 * Canonical wire types for HTTP/WebSocket payloads.
 * `protocol.generated.ts` is produced by Specta from `crates/lisca/src/protocol.rs`.
 */
import type { PixelType } from "./constants.ts";
import type {
  AlignGridCellCoord,
  AlignGridShape_Deserialize,
  AlignOutputPaths,
  AlignerSource,
  AnalysisCsvFile,
  AnalysisProgress as GeneratedAnalysisProgress,
  AnalysisStage,
  AnalysisStartRequest,
  AnalysisStatus,
  AnnotationLabel,
  AppId,
  AutoExcludePreviewCell,
  AutoExcludePreviewRequest,
  ContrastWindow,
  CropOutputFormat,
  CropRoiProgress as GeneratedCropRoiProgress,
  CropRoiRequest,
  CropRoiResponse,
  CropRoiStatus,
  FramePayload as GeneratedFramePayload,
  FrameRequest,
  Hello,
  HomeDirectoryResponse,
  HostFsEntry,
  HostListDirectoryResult,
  LoadedRoiFrameAnnotation,
  ReadTextFileResponse,
  RoiBbox,
  RoiFrameAnnotation,
  RoiFrameAnnotationPayload,
  RoiFrameRequest,
  RoiIndexEntry as GeneratedRoiIndexEntry,
  RoiIndexFile as GeneratedRoiIndexFile,
  RoiPosExistsResponse,
  RoiPositionScan as GeneratedRoiPositionScan,
  RoiWorkspaceScan as GeneratedRoiWorkspaceScan,
  SaveAssayJsonRequest,
  SaveAssayJsonResponse,
  SaveBboxResponse,
  SaveResultPdfRequest,
  SaveResultPdfResponse,
  WorkspaceScan,
} from "./protocol.generated.ts";

export type { AppId };
export type HelloMessage = Hello;
export type { HostFsEntry, HostListDirectoryResult, HomeDirectoryResponse, ReadTextFileResponse };
export type {
  SaveAssayJsonRequest,
  SaveAssayJsonResponse,
  SaveResultPdfRequest,
  SaveResultPdfResponse,
};
export type { WorkspaceScan, AlignerSource };
export type ImageSource = AlignerSource;
export type { FrameRequest, ContrastWindow };
export type FramePayload = Omit<GeneratedFramePayload, "pixelType"> & { pixelType: PixelType };
export type AlignGridShape = AlignGridShape_Deserialize;
/** Runtime grid state uses concrete numbers; Specta PhasesFormat marks these nullable. */
export type AlignGridState = {
  enabled: boolean;
  shape: AlignGridShape;
  tx: number;
  ty: number;
  rotation: number;
  spacingA: number;
  spacingB: number;
  cellWidth: number;
  cellHeight: number;
  opacity: number;
};
export type { AlignGridCellCoord };
export type SavedAlignState = {
  grid: AlignGridState;
  excludedCells: AlignGridCellCoord[];
};
export type FolderSource = Extract<AlignerSource, { kind: "folder" }>;
export type Nd2Source = Extract<AlignerSource, { kind: "nd2" }>;
export type CziSource = Extract<AlignerSource, { kind: "czi" }>;
export type { AutoExcludePreviewCell, AutoExcludePreviewRequest };
export type AutoExcludePreviewCellScore = {
  i: number;
  j: number;
  score: number;
};
export type AutoExcludeHistogramBin = {
  start: number;
  end: number;
  count: number;
};
export type AutoExcludePreviewResponse = {
  eligibleCellCount: number;
  cellScores: AutoExcludePreviewCellScore[];
  histogramBins: AutoExcludeHistogramBin[];
  scoreMin: number;
  scoreMax: number;
  threshold: number;
};
export type {
  SaveBboxResponse,
  AlignOutputPaths,
  CropOutputFormat,
  CropRoiStatus,
  CropRoiRequest,
  CropRoiResponse,
};
export type CropRoiProgress = Omit<GeneratedCropRoiProgress, "error"> & {
  error?: string | null;
};
export type StudioAnalysisCsvFile = AnalysisCsvFile;
export type { AnalysisStatus, AnalysisStage, AnalysisStartRequest };
export type AnalysisProgress = Omit<GeneratedAnalysisProgress, "progress" | "resultFiles"> & {
  progress: number;
  resultFiles?: StudioAnalysisCsvFile[];
};
export type { RoiPosExistsResponse, RoiFrameRequest, RoiBbox };
export type RoiIndexEntry = Omit<GeneratedRoiIndexEntry, "shape"> & {
  shape: readonly [number, number, number, number, number];
};
export type RoiIndexFile = Omit<GeneratedRoiIndexFile, "rois"> & { rois: RoiIndexEntry[] };
export type RoiPositionScan = Omit<GeneratedRoiPositionScan, "rois"> & { rois: RoiIndexEntry[] };
export type RoiWorkspaceScan = Omit<GeneratedRoiWorkspaceScan, "positions"> & {
  positions: RoiPositionScan[];
};
export type {
  AnnotationLabel,
  RoiFrameAnnotation,
  RoiFrameAnnotationPayload,
  LoadedRoiFrameAnnotation,
};

export type CropRoiProgressMessage = {
  type: "cropRoiProgress";
  progress: CropRoiProgress;
};

export type AnalysisProgressMessage = {
  type: "analysisProgress";
  progress: AnalysisProgress;
};

export type ServerWsMessage = HelloMessage | CropRoiProgressMessage | AnalysisProgressMessage;

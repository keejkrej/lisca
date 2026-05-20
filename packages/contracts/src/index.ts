export { WS_PATH } from "./constants.js";
export * from "./decode.js";
export * from "./protocol.schema.js";
export * from "./protocol.wire.js";

export type FolderSourceTemplatePreset = {
  label: string;
  subfolderTemplate: string;
  filenameTemplate: string;
};

export const FOLDER_SOURCE_TEMPLATE_PRESETS = [
  {
    label: "Standard folder",
    subfolderTemplate: "Pos{p}",
    filenameTemplate: "img_channel{c}_position{p}_time{t}_z{z}",
  },
  {
    label: "Compact folder",
    subfolderTemplate: "Pos{p}",
    filenameTemplate: "img_{t}_{c}_{z}",
  },
] as const satisfies readonly FolderSourceTemplatePreset[];

export const DEFAULT_FOLDER_SOURCE_TEMPLATE = FOLDER_SOURCE_TEMPLATE_PRESETS[0];

export type HostFilePickerMode =
  | "workspace"
  | "folder"
  | "nd2_file"
  | "czi_file"
  | "assay_json_file";

export type AlignerHostPort = {
  listDirectory(path: string | null): Promise<HostListDirectoryResult>;
  userHomeDirectory(): Promise<string>;
};

export type StudioHostPort = AlignerHostPort & {
  readTextFile(path: string, signal?: AbortSignal): Promise<string>;
  saveAssayJson(saveTo: string, contents: string): Promise<SaveAssayJsonResponse>;
  saveResultPdf(request: SaveResultPdfRequest): Promise<SaveResultPdfResponse>;
};

export type AnnotatorDataPort = AlignerHostPort & {
  scanRoiWorkspace(workspacePath: string, signal?: AbortSignal): Promise<RoiWorkspaceScan>;
  loadLabels(workspacePath: string, signal?: AbortSignal): Promise<AnnotationLabel[]>;
  saveLabels(
    workspacePath: string,
    labels: AnnotationLabel[],
    signal?: AbortSignal,
  ): Promise<AnnotationLabel[]>;
  loadRoiFrame(
    workspacePath: string,
    request: RoiFrameRequest,
    contrast: ContrastWindow | null,
    signal?: AbortSignal,
  ): Promise<FramePayload>;
  loadRoiFrameAnnotation(
    workspacePath: string,
    request: RoiFrameRequest,
    signal?: AbortSignal,
  ): Promise<LoadedRoiFrameAnnotation>;
  saveRoiFrameAnnotation(
    workspacePath: string,
    request: RoiFrameRequest,
    annotation: RoiFrameAnnotationPayload,
    signal?: AbortSignal,
  ): Promise<RoiFrameAnnotation>;
};

import type {
  AnnotationLabel,
  FramePayload,
  HostListDirectoryResult,
  LoadedRoiFrameAnnotation,
  RoiFrameAnnotation,
  RoiFrameAnnotationPayload,
  RoiFrameRequest,
  RoiWorkspaceScan,
  SaveAssayJsonResponse,
  SaveResultPdfRequest,
  SaveResultPdfResponse,
} from "./protocol.wire.js";

export const ASSAY_NAME = {
  GENE_EXPRESSION: "gene-expression",
  IMMUNE_KILLING: "immune-killing",
  LNP_BINDING: "lnp-binding",
  CUSTOM_ASSAY: "custom-assay",
} as const;

export type AssayName = (typeof ASSAY_NAME)[keyof typeof ASSAY_NAME];
export type GeneExpressionAssayName = typeof ASSAY_NAME.GENE_EXPRESSION;

export const ASSAY_FEATURE = {
  MORPHOLOGY: "morphology",
  PART_COUNT: "partcount",
  PART_FLUOR: "partfluor",
  TOTAL_FLUOR: "totalfluor",
} as const;

export type AssayFeature = (typeof ASSAY_FEATURE)[keyof typeof ASSAY_FEATURE];

export const GENE_EXPRESSION_FEATURE_IDS = [
  ASSAY_FEATURE.MORPHOLOGY,
  ASSAY_FEATURE.PART_COUNT,
  ASSAY_FEATURE.PART_FLUOR,
  ASSAY_FEATURE.TOTAL_FLUOR,
] as const;

export type AssayFeatureList = readonly AssayFeature[];

export type NonEmptyAssayFeatureList = [AssayFeature, ...AssayFeature[]];

export type Assay = {
  name: AssayName;
  features: AssayFeatureList;
};

export type GeneExpressionFeatureList = [
  GeneExpressionAssayFeature,
  ...GeneExpressionAssayFeature[],
];

export type GeneExpressionAssayFeature = (typeof GENE_EXPRESSION_FEATURE_IDS)[number];

export type GeneExpressionAssay = {
  name: GeneExpressionAssayName;
  features: GeneExpressionFeatureList;
};

export type StudioAssayId = AssayName;

export type StudioDataSourceKind = AlignerSource["kind"] | null;

import type { AlignerSource, FolderSource, Nd2Source, CziSource } from "./protocol.wire.js";
export type { FolderSource, Nd2Source, CziSource };

export type StudioTimelapseUnit = "second" | "minute" | "hour";

export type StudioBasicInfoFeatureId = AssayFeature;

export type StudioBasicInfoSlideId = "slide-i" | "slide-vi";

export type StudioBasicInfoStep1 = {
  name: string;
  date: string;
  dataPath: string;
  folderSubfolderTemplate: string;
  folderFilenameTemplate: string;
  saveTo: string;
};

export type StudioBasicInfoStep2 = {
  pattern: string;
  timelapseAmount: number | null;
  timelapseUnit: StudioTimelapseUnit;
  selectedFeatures: readonly StudioBasicInfoFeatureId[];
};

export type StudioBasicInfoSampleRow = {
  channel: string;
  name: string;
  positions: string;
  maskChannel: string;
  signalChannel: string;
};

export type StudioBasicInfoStep3 = {
  selectedSlideId: StudioBasicInfoSlideId;
  samplesBySlide: Record<StudioBasicInfoSlideId, StudioBasicInfoSampleRow[]>;
};

export type StudioAssayJson = {
  assayId: StudioAssayId;
  assayLabel: string;
  dataSourceKind?: StudioDataSourceKind;
  info1: StudioBasicInfoStep1;
  info2: StudioBasicInfoStep2;
  info3: StudioBasicInfoStep3;
};

export type { PixelType } from "./constants.js";
export { PIXEL_TYPES } from "./constants.js";
import type { PixelType } from "./constants.js";

export type PixelArray =
  | Uint8Array
  | Uint8ClampedArray
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array;

export type FrameResult = {
  width: number;
  height: number;
  pixels: PixelArray;
  pixelType?: PixelType;
  contrastDomain?: ContrastWindow;
  suggestedContrast?: ContrastWindow;
  appliedContrast?: ContrastWindow;
};

import type { ContrastWindow } from "./protocol.wire.js";

export type AnnotationMode = "classification" | "segmentation";

export type AnalysisDataPort = {
  startAnalysis(request: AnalysisStartRequest): Promise<AnalysisProgress>;
  getAnalysisProgress(requestId: string): Promise<AnalysisProgress>;
  onAnalysisProgress(
    requestId: string,
    onProgress: (progress: AnalysisProgress) => void,
  ): () => void;
};

import type { AnalysisProgress, AnalysisStartRequest } from "./protocol.wire.js";

export type AlignerDataPort = {
  scanSource(source: AlignerSource): Promise<WorkspaceScan>;
  loadFrame(
    source: AlignerSource,
    request: FrameRequest,
    contrast?: ContrastWindow | null,
  ): Promise<FrameResult>;
  loadAlignState(workspacePath: string, pos: number): Promise<SavedAlignState | null>;
  saveBbox(
    workspacePath: string,
    pos: number,
    csv: string,
    alignState: SavedAlignState,
  ): Promise<SaveBboxResponse>;
  autoExcludePreview(request: AutoExcludePreviewRequest): Promise<AutoExcludePreviewResponse>;
  listSavedBboxPositions(workspacePath: string): Promise<number[]>;
  cropRoi(request: CropRoiRequest): Promise<CropRoiResponse>;
  cancelCropRoi(requestId: string): Promise<CropRoiProgress>;
  onCropRoiProgress(requestId: string, onProgress: (progress: CropRoiProgress) => void): () => void;
  roiPosExists(workspacePath: string, pos: number): Promise<boolean>;
};

import type {
  AutoExcludePreviewRequest,
  AutoExcludePreviewResponse,
  CropRoiProgress,
  CropRoiRequest,
  CropRoiResponse,
  FrameRequest,
  SaveBboxResponse,
  SavedAlignState,
  WorkspaceScan,
} from "./protocol.wire.js";

export type StudioDataPort = AlignerDataPort &
  AnalysisDataPort &
  StudioHostPort & {
    scanRoiWorkspace(workspacePath: string, signal?: AbortSignal): Promise<RoiWorkspaceScan>;
    getAnalysisResults(workspacePath: string): Promise<AnalysisProgress | null>;
    getLatestAnalysisProgress(workspacePath: string): Promise<AnalysisProgress | null>;
    loadRoiFrame(
      workspacePath: string,
      request: RoiFrameRequest,
      contrast?: ContrastWindow | null,
      signal?: AbortSignal,
    ): Promise<FrameResult>;
  };

export type CanvasStatusTone = "default" | "error" | "success";

export type CanvasStatusMessage = {
  text: string;
  tone?: CanvasStatusTone;
};

export type AlignCanvasStatusTone = CanvasStatusTone;

export type AlignCanvasStatusMessage = CanvasStatusMessage;

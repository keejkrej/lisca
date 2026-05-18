export type AppId = "aligner" | "annotator" | "studio";

export type HelloMessage = {
  app: AppId;
  version: string;
};

export const WS_PATH = "/ws" as const;

export type FolderSource = {
  kind: "folder";
  path: string;
  subfolderTemplate: string;
  filenameTemplate: string;
};

export type Nd2Source = {
  kind: "nd2";
  path: string;
};

export type CziSource = {
  kind: "czi";
  path: string;
};

export type AlignerSource = FolderSource | Nd2Source | CziSource;
export type ImageSource = AlignerSource;

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

export type HostFsEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
};

export type HostListDirectoryResult = {
  path: string | null;
  parent: string | null;
  entries: HostFsEntry[];
};

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

export type StudioSaveAssayJsonResponse = {
  ok: true;
  path: string;
};

export type StudioHostPort = AlignerHostPort & {
  readTextFile(path: string): Promise<string>;
  saveAssayJson(saveTo: string, contents: string): Promise<StudioSaveAssayJsonResponse>;
};

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

export type GeneExpressionFeatureList = [GeneExpressionAssayFeature, ...GeneExpressionAssayFeature[]];

export type GeneExpressionAssayFeature = (typeof GENE_EXPRESSION_FEATURE_IDS)[number];

export type GeneExpressionAssay = {
  name: GeneExpressionAssayName;
  features: GeneExpressionFeatureList;
};

export type StudioAssayId = AssayName;

export type StudioDataSourceKind = AlignerSource["kind"] | null;

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

export type PixelType = "uint8" | "uint8clamped" | "int8" | "uint16" | "int16" | "uint32" | "int32";

export type PixelArray =
  | Uint8Array
  | Uint8ClampedArray
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array;

export type ContrastWindow = {
  min: number;
  max: number;
};

export type FrameResult = {
  width: number;
  height: number;
  pixels: PixelArray;
  pixelType?: PixelType;
  contrastDomain?: ContrastWindow;
  suggestedContrast?: ContrastWindow;
  appliedContrast?: ContrastWindow;
};

export type FramePayload = {
  width: number;
  height: number;
  dataBase64: string;
  pixelType: PixelType;
  contrastDomain: ContrastWindow;
  suggestedContrast: ContrastWindow;
  appliedContrast: ContrastWindow;
};

export type FrameRequest = {
  pos: number;
  channel: number;
  time: number;
  z: number;
};

export type WorkspaceScan = {
  positions: number[];
  channels: number[];
  times: number[];
  zSlices: number[];
};

export type RoiFrameRequest = FrameRequest & {
  roi: number;
};

export type RoiBbox = {
  roi: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type RoiIndexEntry = {
  roi: number;
  fileName: string;
  bbox: RoiBbox;
  shape: [number, number, number, number, number];
};

export type RoiIndexFile = {
  position: number;
  axisOrder: "TCZYX";
  pageOrder: ["t", "c", "z"];
  timeCount: number;
  channelCount: number;
  zCount: number;
  source: ImageSource;
  rois: RoiIndexEntry[];
};

export type RoiPositionScan = {
  pos: number;
  source: ImageSource;
  channels: number[];
  times: number[];
  zSlices: number[];
  rois: RoiIndexEntry[];
};

export type RoiWorkspaceScan = {
  positions: RoiPositionScan[];
};

export type AnnotationMode = "classification" | "segmentation";

export type AnnotationLabel = {
  id: string;
  name: string;
  color: string;
};

export type RoiFrameAnnotation = {
  classificationLabelId: string | null;
  maskPath: string | null;
  updatedAt: string | null;
};

export type RoiFrameAnnotationPayload = {
  classificationLabelId: string | null;
  maskBase64Png: string | null;
};

export type LoadedRoiFrameAnnotation = {
  annotation: RoiFrameAnnotation;
  maskBase64Png: string | null;
};

export type AlignGridShape = "rect" | "hex";

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

export type AlignGridCellCoord = {
  i: number;
  j: number;
};

export type SavedAlignState = {
  grid: AlignGridState;
  excludedCells: AlignGridCellCoord[];
};

export type AutoExcludePreviewCell = AlignGridCellCoord & {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type AutoExcludePreviewRequest = {
  source: AlignerSource;
  selection: FrameRequest;
  cells: AutoExcludePreviewCell[];
};

export type AutoExcludePreviewCellScore = AlignGridCellCoord & {
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

export type SaveBboxResponse = {
  ok: boolean;
  error?: string;
};

export type AlignOutputPaths = {
  bbox: string;
  align: string;
  roi: string;
};

export type CropOutputFormat = "tiff";

export type CropRoiStatus = "queued" | "running" | "completed" | "cancelled" | "error";

export type CropRoiRequest = {
  requestId: string;
  workspacePath: string;
  source: AlignerSource;
  positions: number[];
  overwrite: boolean;
  outputFormat?: CropOutputFormat;
};

export type CropRoiResponse = {
  requestId: string;
  status: CropRoiStatus;
};

export type CropRoiProgress = {
  requestId: string;
  status: CropRoiStatus;
  position: number | null;
  completedPositions: number;
  totalPositions: number;
  completedRois: number;
  totalRois: number;
  message: string | null;
  error?: string;
};

export type CropRoiProgressMessage = {
  type: "cropRoiProgress";
  progress: CropRoiProgress;
};

export type ServerWsMessage = HelloMessage | CropRoiProgressMessage;

export type RoiPosExistsResponse = {
  exists: boolean;
};

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

export type CanvasStatusTone = "default" | "error" | "success";

export type CanvasStatusMessage = {
  text: string;
  tone?: CanvasStatusTone;
};

export type AlignCanvasStatusTone = CanvasStatusTone;

export type AlignCanvasStatusMessage = CanvasStatusMessage;

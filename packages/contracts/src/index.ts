export type AppId = "aligner" | "annotator" | "studio";

export type HelloMessage = {
  app: AppId;
  version: string;
};

export const WS_PATH = "/ws" as const;

export type TifSource = {
  kind: "tif";
  path: string;
};

export type JpgSource = {
  kind: "jpg";
  path: string;
};

export type Nd2Source = {
  kind: "nd2";
  path: string;
};

export type CziSource = {
  kind: "czi";
  path: string;
};

export type AlignerSource = TifSource | JpgSource | Nd2Source | CziSource;
export type ImageSource = AlignerSource;

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
  | "tif_dir"
  | "jpg_dir"
  | "nd2_file"
  | "czi_file"
  | "assay_json_file";

export type AlignerHostPort = {
  listDirectory(path: string | null): Promise<HostListDirectoryResult>;
  userHomeDirectory(): Promise<string>;
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
  onCropRoiProgress(
    requestId: string,
    onProgress: (progress: CropRoiProgress) => void,
  ): () => void;
  roiPosExists(workspacePath: string, pos: number): Promise<boolean>;
};

export type AlignCanvasStatusTone = "default" | "error" | "success";

export type AlignCanvasStatusMessage = {
  text: string;
  tone?: AlignCanvasStatusTone;
};

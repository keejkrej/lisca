export interface WorkspaceScan {
  positions: number[];
  channels: number[];
  times: number[];
  zSlices: number[];
}

export interface RoiBbox {
  roi: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RoiIndexEntry {
  roi: number;
  fileName: string;
  bbox: RoiBbox;
  shape: [number, number, number, number, number];
}

export interface RoiPositionScan {
  pos: number;
  source: ViewerSource;
  channels: number[];
  times: number[];
  zSlices: number[];
  rois: RoiIndexEntry[];
}

export interface RoiWorkspaceScan {
  positions: RoiPositionScan[];
}

export interface AnnotationLabel {
  id: string;
  name: string;
  color: string;
}

export interface RoiFrameAnnotation {
  classificationLabelId: string | null;
  maskPath: string | null;
  updatedAt: string | null;
}

export interface RoiFrameAnnotationPayload {
  classificationLabelId: string | null;
  maskBase64Png: string | null;
}

export interface LoadedRoiFrameAnnotation {
  annotation: RoiFrameAnnotation;
  maskBase64Png: string | null;
}

export interface TifSource {
  kind: "tif";
  path: string;
}

export interface Nd2Source {
  kind: "nd2";
  path: string;
}

export interface CziSource {
  kind: "czi";
  path: string;
}

export type ViewerSource = TifSource | Nd2Source | CziSource;

export type PixelType =
  | "uint8"
  | "uint8clamped"
  | "int8"
  | "uint16"
  | "int16"
  | "uint32"
  | "int32";

export type PixelArray =
  | Uint8Array
  | Uint8ClampedArray
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array;

export interface FrameRequest {
  pos: number;
  channel: number;
  time: number;
  z: number;
}

export type GridShape = "square" | "hex";

export interface GridState {
  enabled: boolean;
  shape: GridShape;
  tx: number;
  ty: number;
  rotation: number;
  spacingA: number;
  spacingB: number;
  cellWidth: number;
  cellHeight: number;
  opacity: number;
}

export interface RoiFrameRequest {
  pos: number;
  roi: number;
  channel: number;
  time: number;
  z: number;
}

export interface FrameResult {
  width: number;
  height: number;
  pixels: PixelArray;
  pixelType?: PixelType;
  contrastDomain?: ContrastWindow;
  suggestedContrast?: ContrastWindow;
  appliedContrast?: ContrastWindow;
}

export interface ViewerDataSource {
  scanSource(source: ViewerSource): Promise<WorkspaceScan>;
  loadFrame(source: ViewerSource, request: FrameRequest, options?: LoadFrameOptions): Promise<FrameResult>;
}

export interface ViewerDataPort extends ViewerDataSource {
  scanRoiWorkspace(workspacePath: string): Promise<RoiWorkspaceScan>;
  listSavedBboxPositions(workspacePath: string): Promise<number[]>;
  autoExcludePreview(request: AutoExcludePreviewRequest): Promise<AutoExcludePreviewResponse>;
  loadAnnotationLabels(workspacePath: string): Promise<AnnotationLabel[]>;
  saveAnnotationLabels(workspacePath: string, labels: AnnotationLabel[]): Promise<AnnotationLabel[]>;
  loadRoiFrame(
    workspacePath: string,
    request: RoiFrameRequest,
    options?: LoadFrameOptions,
  ): Promise<FrameResult>;
  loadRoiFrameAnnotation(
    workspacePath: string,
    request: RoiFrameRequest,
  ): Promise<LoadedRoiFrameAnnotation>;
  saveRoiFrameAnnotation(
    workspacePath: string,
    request: RoiFrameRequest,
    annotation: RoiFrameAnnotationPayload,
  ): Promise<RoiFrameAnnotation>;
  saveBbox(workspacePath: string, source: ViewerSource, pos: number, csv: string): Promise<SaveBboxResponse>;
  cropRoi(
    workspacePath: string,
    source: ViewerSource,
    pos: number,
    format: CropOutputFormat,
    requestId?: string,
  ): Promise<CropRoiResponse>;
  cancelCropRoi(requestId: string): Promise<void>;
  onCropRoiProgress(listener: (event: CropRoiProgressEvent) => void): () => void;
}

export interface ViewerHostPort {
  pickWorkspace(): Promise<string | null>;
  pickTifDirectory(): Promise<string | null>;
  pickNd2File(): Promise<string | null>;
  pickCziFile(): Promise<string | null>;
  roiPosExists(workspacePath: string, pos: number): Promise<boolean>;
}

export interface ViewerSelection {
  pos: number;
  channel: number;
  time: number;
  z: number;
}

export interface ContrastWindow {
  min: number;
  max: number;
}

export interface AutoExcludePreviewRequest {
  source: ViewerSource;
  selection: FrameRequest;
  cells: AutoExcludePreviewCell[];
}

export interface AutoExcludePreviewCell {
  i: number;
  j: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AutoExcludePreviewCellScore {
  i: number;
  j: number;
  score: number;
}

export interface AutoExcludeHistogramBin {
  start: number;
  end: number;
  count: number;
}

export interface AutoExcludePreviewResponse {
  eligibleCellCount: number;
  cellScores: AutoExcludePreviewCellScore[];
  histogramBins: AutoExcludeHistogramBin[];
  scoreMin: number;
  scoreMax: number;
  threshold: number;
}

export interface LoadFrameOptions {
  contrast?: ContrastWindow;
}

export type ViewerCanvasStatusTone = "default" | "error" | "success";

export interface ViewerCanvasStatusMessage {
  text: string;
  tone?: ViewerCanvasStatusTone;
}

export interface SaveBboxResponse {
  ok: boolean;
  error?: string;
}

export type CropOutputFormat = "tiff";
export type CropRoiStatus = "success" | "error" | "cancelled";

export interface CropRoiResponse {
  ok: boolean;
  status: CropRoiStatus;
  cancelled?: boolean;
  error?: string;
  outputPath?: string;
}

export interface CropRoiProgressEvent {
  requestId: string;
  progress: number;
  message: string;
}

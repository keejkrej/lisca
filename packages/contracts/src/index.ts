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

export type AlignCanvasStatusTone = "default" | "error" | "success";

export type AlignCanvasStatusMessage = {
  text: string;
  tone?: AlignCanvasStatusTone;
};

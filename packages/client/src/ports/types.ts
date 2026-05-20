import type {
  AlignerSource,
  AnalysisProgress,
  AnalysisStartRequest,
  AnnotationLabel,
  AutoExcludePreviewRequest,
  AutoExcludePreviewResponse,
  ContrastWindow,
  CropRoiProgress,
  CropRoiRequest,
  CropRoiResponse,
  FramePayload,
  FrameRequest,
  FrameResult,
  HostListDirectoryResult,
  LoadedRoiFrameAnnotation,
  RoiFrameAnnotation,
  RoiFrameAnnotationPayload,
  RoiFrameRequest,
  RoiWorkspaceScan,
  SaveAssayJsonResponse,
  SaveBboxResponse,
  SavedAlignState,
  SaveResultPdfRequest,
  SaveResultPdfResponse,
  WorkspaceScan,
} from "@lisca/contracts";

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

export type AnalysisDataPort = {
  startAnalysis(request: AnalysisStartRequest): Promise<AnalysisProgress>;
  getAnalysisProgress(requestId: string): Promise<AnalysisProgress>;
  onAnalysisProgress(
    requestId: string,
    onProgress: (progress: AnalysisProgress) => void,
  ): () => void;
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

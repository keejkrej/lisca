import type {
  AlignerSource,
  AnalysisProgress,
  AnalysisStartRequest,
  AnnotationLabel,
  ContrastWindow,
  CreateDirectoryResponse,
  CropRoiProgress,
  CropRoiRequest,
  CropRoiResponse,
  FrameRequest,
  HostListDirectoryResult,
  LoadedRoiFrameAnnotation,
  OperationDetail,
  OperationSummary,
  RoiFrameAnnotation,
  RoiFrameAnnotationPayload,
  RoiFrameRequest,
  RoiWorkspaceScan,
  SaveAssayJsonResponse,
  SaveBboxResponse,
  SavedAlignState,
  SaveResultPdfRequest,
  SaveResultPdfResponse,
  SmartExcludeRequest,
  SmartExcludeResponse,
  SmartSegmentRequest,
  SmartSegmentResponse,
  TaskDetail,
  WorkspaceScan,
} from "@lisca/contracts";
import type { TaskCommandError } from "@lisca/contracts/http-api";
import type { FrameResult } from "@lisca/utils";
import type { ClientEffect } from "../infra/runtime";

export type HostPort = {
  listDirectory(path: string | null, signal?: AbortSignal): ClientEffect<HostListDirectoryResult>;
  userHomeDirectory(signal?: AbortSignal): ClientEffect<string>;
  createDirectory(
    parentPath: string,
    name: string,
    signal?: AbortSignal,
  ): ClientEffect<CreateDirectoryResponse>;
};

export type TaskDataPort = {
  listOperations(signal?: AbortSignal): ClientEffect<OperationSummary[]>;
  getOperation(operationId: string, signal?: AbortSignal): ClientEffect<OperationDetail>;
  getTask(taskId: string, signal?: AbortSignal): ClientEffect<TaskDetail>;
  cancelOperation(
    operationId: string,
    signal?: AbortSignal,
  ): ClientEffect<OperationDetail, TaskCommandError>;
  cancelTask(taskId: string, signal?: AbortSignal): ClientEffect<OperationDetail, TaskCommandError>;
  retryTask(taskId: string, signal?: AbortSignal): ClientEffect<OperationDetail, TaskCommandError>;
};

export type StudioHostPort = HostPort & {
  readTextFile(path: string, signal?: AbortSignal): ClientEffect<string>;
  saveAssayJson(saveTo: string, contents: string): ClientEffect<SaveAssayJsonResponse>;
  saveResultPdf(request: SaveResultPdfRequest): ClientEffect<SaveResultPdfResponse>;
};

export type AnnotatorDataPort = HostPort &
  TaskDataPort & {
    scanRoiWorkspace(workspacePath: string, signal?: AbortSignal): ClientEffect<RoiWorkspaceScan>;
    loadLabels(workspacePath: string, signal?: AbortSignal): ClientEffect<AnnotationLabel[]>;
    saveLabels(
      workspacePath: string,
      labels: AnnotationLabel[],
      signal?: AbortSignal,
    ): ClientEffect<AnnotationLabel[]>;
    loadRoiFrame(
      workspacePath: string,
      request: RoiFrameRequest,
      contrast: ContrastWindow | null,
      signal?: AbortSignal,
    ): ClientEffect<FrameResult>;
    loadRoiFrameAnnotation(
      workspacePath: string,
      request: RoiFrameRequest,
      signal?: AbortSignal,
    ): ClientEffect<LoadedRoiFrameAnnotation>;
    saveRoiFrameAnnotation(
      workspacePath: string,
      request: RoiFrameRequest,
      annotation: RoiFrameAnnotationPayload,
      signal?: AbortSignal,
    ): ClientEffect<RoiFrameAnnotation>;
    smartSegment(
      request: SmartSegmentRequest,
      signal?: AbortSignal,
    ): ClientEffect<SmartSegmentResponse>;
  };

export type AnalysisDataPort = {
  startAnalysis(request: AnalysisStartRequest): ClientEffect<AnalysisProgress>;
  getAnalysisProgress(requestId: string): ClientEffect<AnalysisProgress>;
  onAnalysisProgress(
    requestId: string,
    onProgress: (progress: AnalysisProgress) => void,
  ): () => void;
};

export type AlignerDataPort = HostPort &
  TaskDataPort & {
    scanSource(source: AlignerSource): ClientEffect<WorkspaceScan>;
    loadFrame(
      source: AlignerSource,
      request: FrameRequest,
      contrast?: ContrastWindow | null,
      signal?: AbortSignal,
    ): ClientEffect<FrameResult>;
    loadAlignState(workspacePath: string, pos: number): ClientEffect<SavedAlignState | null>;
    saveBbox(
      workspacePath: string,
      pos: number,
      csv: string,
      alignState: SavedAlignState,
    ): ClientEffect<SaveBboxResponse>;
    listSavedBboxPositions(workspacePath: string): ClientEffect<number[]>;
    cropRoi(request: CropRoiRequest): ClientEffect<CropRoiResponse>;
    getLatestCropProgress(workspacePath: string): ClientEffect<CropRoiProgress | null>;
    cancelCropRoi(requestId: string): ClientEffect<CropRoiProgress>;
    onCropRoiProgress(
      requestId: string,
      onProgress: (progress: CropRoiProgress) => void,
    ): () => void;
    roiPosExists(workspacePath: string, pos: number): ClientEffect<boolean>;
    smartExclude(
      request: SmartExcludeRequest,
      signal?: AbortSignal,
    ): ClientEffect<SmartExcludeResponse>;
  };

export type StudioDataPort = AlignerDataPort &
  AnalysisDataPort &
  StudioHostPort & {
    scanRoiWorkspace(workspacePath: string, signal?: AbortSignal): ClientEffect<RoiWorkspaceScan>;
    getAnalysisResults(workspacePath: string): ClientEffect<AnalysisProgress | null>;
    getLatestAnalysisProgress(workspacePath: string): ClientEffect<AnalysisProgress | null>;
    loadLabels(workspacePath: string, signal?: AbortSignal): ClientEffect<AnnotationLabel[]>;
    saveLabels(
      workspacePath: string,
      labels: AnnotationLabel[],
      signal?: AbortSignal,
    ): ClientEffect<AnnotationLabel[]>;
    loadRoiFrame(
      workspacePath: string,
      request: RoiFrameRequest,
      contrast?: ContrastWindow | null,
      signal?: AbortSignal,
    ): ClientEffect<FrameResult>;
    loadRoiFrameAnnotation(
      workspacePath: string,
      request: RoiFrameRequest,
      signal?: AbortSignal,
    ): ClientEffect<LoadedRoiFrameAnnotation>;
    saveRoiFrameAnnotation(
      workspacePath: string,
      request: RoiFrameRequest,
      annotation: RoiFrameAnnotationPayload,
      signal?: AbortSignal,
    ): ClientEffect<RoiFrameAnnotation>;
    smartSegment(
      request: SmartSegmentRequest,
      signal?: AbortSignal,
    ): ClientEffect<SmartSegmentResponse>;
  };

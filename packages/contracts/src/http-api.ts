import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import * as Schema from "effect/Schema";

import {
  AlignOutputPathsSchema,
  AnalysisProgressQuerySchema,
  AnalysisProgressSchema,
  AnalysisStartRequestSchema,
  AnnotationLabelArraySchema,
  CancelCropRoiRequestSchema,
  CropRoiProgressQuerySchema,
  CropRoiProgressSchema,
  CropRoiRequestSchema,
  CropRoiResponseSchema,
  CreateDirectoryRequestSchema,
  CreateDirectoryResponseSchema,
  FramePayloadSchema,
  HomeDirectoryResponseSchema,
  HostListDirectoryQuerySchema,
  HostListDirectoryResultSchema,
  LatestAnalysisQuerySchema,
  LatestCropQuerySchema,
  LoadAlignStateQuerySchema,
  LoadAnnotationLabelsRequestSchema,
  LoadedRoiFrameAnnotationSchema,
  LoadFrameRequestSchema,
  LoadRoiFrameAnnotationRequestSchema,
  LoadRoiFrameRequestSchema,
  MemoryRecentQuerySchema,
  NullableAnalysisProgressSchema,
  NullableCropRoiProgressSchema,
  NullableSavedAlignStateSchema,
  OutputPathsQuerySchema,
  OperationDetailQuerySchema,
  OperationDetailSchema,
  OperationCancelRequestSchema,
  OperationListSchema,
  ReadTextFileQuerySchema,
  ReadTextFileResponseSchema,
  RoiFrameAnnotationSchema,
  RoiPosExistsQuerySchema,
  RoiPosExistsResponseSchema,
  RoiWorkspaceScanSchema,
  SaveAnnotationLabelsRequestSchema,
  SaveAssayJsonRequestSchema,
  SaveAssayJsonResponseSchema,
  SaveBboxRequestSchema,
  SaveBboxResponseSchema,
  SavedBboxPositionsQuerySchema,
  SaveRoiFrameAnnotationRequestSchema,
  SaveResultPdfRequestSchema,
  SaveResultPdfResponseSchema,
  ScanRoiWorkspaceRequestSchema,
  ScanSourceRequestSchema,
  SmartExcludeRequestSchema,
  SmartExcludeResponseSchema,
  SmartSegmentRequestSchema,
  SmartSegmentResponseSchema,
  TaskDetailQuerySchema,
  TaskDetailSchema,
  TaskCancelRequestSchema,
  TaskRetryRequestSchema,
  MemoryRecentResponseSchema,
  MemoryTouchRequestSchema,
  MemoryTouchResponseSchema,
  ProfileCreateRequestSchema,
  ProfileListResponseSchema,
  ProfileSessionResponseSchema,
  ProfileSignInRequestSchema,
  ProfileSignOutResponseSchema,
  UIntArraySchema,
  WorkspaceScanSchema,
} from "./schema/index";

/**
 * Structured request error. Replaces the previous plain-text 400 so every
 * backend speaks the same JSON error envelope: `{ "_tag": "RequestError",
 * "message": string }`.
 */
export class RequestError extends Schema.TaggedError<RequestError>()(
  "RequestError",
  { message: Schema.String },
  { httpApiStatus: 400 },
) {}

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 },
) {}

export class TaskCommandError extends Schema.TaggedError<TaskCommandError>()(
  "TaskCommandError",
  {
    code: Schema.Literals(["not-found", "invalid-transition"]),
    entity: Schema.Literals(["operation", "task"]),
    id: Schema.String,
    currentStatus: Schema.NullOr(Schema.String),
    message: Schema.String,
  },
  { httpApiStatus: 409 },
) {}

// --- fs group (shared host filesystem) ---------------------------------------
const fsGroup = HttpApiGroup.make("fs")
  .add(
    HttpApiEndpoint.get("listDirectory", "/fs/list", {
      query: HostListDirectoryQuerySchema,
      success: HostListDirectoryResultSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.get("userHomeDirectory", "/fs/home", {
      success: HomeDirectoryResponseSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.get("readTextFile", "/fs/read-text", {
      query: ReadTextFileQuerySchema,
      success: ReadTextFileResponseSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.get("readFile", "/fs/file", {
      query: ReadTextFileQuerySchema,
      success: ReadTextFileResponseSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("createDirectory", "/fs/create-directory", {
      payload: CreateDirectoryRequestSchema,
      success: CreateDirectoryResponseSchema,
      error: [RequestError, Unauthorized],
    }),
  );

// --- align group -------------------------------------------------------------
const alignGroup = HttpApiGroup.make("align")
  .add(
    HttpApiEndpoint.post("scanSource", "/align/scan-source", {
      payload: ScanSourceRequestSchema,
      success: WorkspaceScanSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("loadFrame", "/align/load-frame", {
      payload: LoadFrameRequestSchema,
      success: FramePayloadSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("saveBbox", "/align/save-bbox", {
      payload: SaveBboxRequestSchema,
      success: SaveBboxResponseSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.get("loadAlignState", "/align/align-state", {
      query: LoadAlignStateQuerySchema,
      success: NullableSavedAlignStateSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.get("outputPaths", "/align/output-paths", {
      query: OutputPathsQuerySchema,
      success: AlignOutputPathsSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.get("listSavedBboxPositions", "/align/saved-bbox-positions", {
      query: SavedBboxPositionsQuerySchema,
      success: UIntArraySchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.get("roiPosExists", "/align/roi-pos-exists", {
      query: RoiPosExistsQuerySchema,
      success: RoiPosExistsResponseSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("cropRoi", "/align/crop-roi", {
      payload: CropRoiRequestSchema,
      success: CropRoiResponseSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("cancelCropRoi", "/align/cancel-crop-roi", {
      payload: CancelCropRoiRequestSchema,
      success: CropRoiProgressSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.get("cropRoiProgress", "/align/crop-roi-progress", {
      query: CropRoiProgressQuerySchema,
      success: CropRoiProgressSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.get("getLatestCropProgress", "/align/crop-latest", {
      query: LatestCropQuerySchema,
      success: NullableCropRoiProgressSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("smartExclude", "/align/smart-exclude", {
      payload: SmartExcludeRequestSchema,
      success: SmartExcludeResponseSchema,
      error: [RequestError, Unauthorized],
    }),
  );

// --- annotate group ----------------------------------------------------------
const annotateGroup = HttpApiGroup.make("annotate")
  .add(
    HttpApiEndpoint.post("scanRoiWorkspace", "/annotate/scan-roi-workspace", {
      payload: ScanRoiWorkspaceRequestSchema,
      success: RoiWorkspaceScanSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("loadLabels", "/annotate/load-labels", {
      payload: LoadAnnotationLabelsRequestSchema,
      success: AnnotationLabelArraySchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("saveLabels", "/annotate/save-labels", {
      payload: SaveAnnotationLabelsRequestSchema,
      success: AnnotationLabelArraySchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("loadRoiFrame", "/annotate/load-roi-frame", {
      payload: LoadRoiFrameRequestSchema,
      success: FramePayloadSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("loadRoiFrameAnnotation", "/annotate/load-roi-frame-annotation", {
      payload: LoadRoiFrameAnnotationRequestSchema,
      success: LoadedRoiFrameAnnotationSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("saveRoiFrameAnnotation", "/annotate/save-roi-frame-annotation", {
      payload: SaveRoiFrameAnnotationRequestSchema,
      success: RoiFrameAnnotationSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("smartSegment", "/annotate/smart-segment", {
      payload: SmartSegmentRequestSchema,
      success: SmartSegmentResponseSchema,
      error: [RequestError, Unauthorized],
    }),
  );

// --- profile group (studio server only) --------------------------------------
const profileGroup = HttpApiGroup.make("profile")
  .add(
    HttpApiEndpoint.get("listProfiles", "/profile/list", {
      success: ProfileListResponseSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("createProfile", "/profile/create", {
      payload: ProfileCreateRequestSchema,
      success: ProfileSessionResponseSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("signInProfile", "/profile/sign-in", {
      payload: ProfileSignInRequestSchema,
      success: ProfileSessionResponseSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("signOutProfile", "/profile/sign-out", {
      success: ProfileSignOutResponseSchema,
      error: [Unauthorized, RequestError],
    }),
  );

// --- memory group (studio server only) ---------------------------------------
const memoryGroup = HttpApiGroup.make("memory")
  .add(
    HttpApiEndpoint.get("getRecentMemory", "/memory/recent", {
      query: MemoryRecentQuerySchema,
      success: MemoryRecentResponseSchema,
      error: [Unauthorized, RequestError],
    }),
  )
  .add(
    HttpApiEndpoint.post("touchMemory", "/memory/touch", {
      payload: MemoryTouchRequestSchema,
      success: MemoryTouchResponseSchema,
      error: [Unauthorized, RequestError],
    }),
  );

// --- tasks group (shared by every product backend) --------------------------
const tasksGroup = HttpApiGroup.make("tasks")
  .add(
    HttpApiEndpoint.get("listOperations", "/tasks/operations", {
      success: OperationListSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.get("getOperation", "/tasks/operation", {
      query: OperationDetailQuerySchema,
      success: OperationDetailSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.get("getTask", "/tasks/task", {
      query: TaskDetailQuerySchema,
      success: TaskDetailSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("cancelOperation", "/tasks/operation/cancel", {
      payload: OperationCancelRequestSchema,
      success: OperationDetailSchema,
      error: [TaskCommandError, RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("cancelTask", "/tasks/task/cancel", {
      payload: TaskCancelRequestSchema,
      success: OperationDetailSchema,
      error: [TaskCommandError, RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("retryTask", "/tasks/task/retry", {
      payload: TaskRetryRequestSchema,
      success: OperationDetailSchema,
      error: [TaskCommandError, RequestError, Unauthorized],
    }),
  );

// --- studio group ------------------------------------------------------------
const studioGroup = HttpApiGroup.make("studio")
  .add(
    HttpApiEndpoint.post("saveAssayJson", "/studio/save-assay-json", {
      payload: SaveAssayJsonRequestSchema,
      success: SaveAssayJsonResponseSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("saveResultPdf", "/studio/save-result-pdf", {
      payload: SaveResultPdfRequestSchema,
      success: SaveResultPdfResponseSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.post("startAnalysis", "/studio/start-analysis", {
      payload: AnalysisStartRequestSchema,
      success: AnalysisProgressSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.get("getAnalysisProgress", "/studio/analysis-progress", {
      query: AnalysisProgressQuerySchema,
      success: AnalysisProgressSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.get("getLatestAnalysisProgress", "/studio/latest-analysis", {
      query: LatestAnalysisQuerySchema,
      success: NullableAnalysisProgressSchema,
      error: [RequestError, Unauthorized],
    }),
  )
  .add(
    HttpApiEndpoint.get("getAnalysisResults", "/studio/analysis-results", {
      query: LatestAnalysisQuerySchema,
      success: NullableAnalysisProgressSchema,
      error: [RequestError, Unauthorized],
    }),
  );

/**
 * Effect HttpApi description of the lisca backend. This is the backbone of the
 * cross-language contract: the TS client is derived from it, OpenAPI 3.1 is
 * emitted from it, and the Rust serde types are generated from that OpenAPI.
 */
export const liscaApi = HttpApi.make("lisca")
  .add(fsGroup)
  .add(alignGroup)
  .add(annotateGroup)
  .add(profileGroup)
  .add(memoryGroup)
  .add(tasksGroup)
  .add(studioGroup);

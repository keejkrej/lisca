import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import * as Schema from "effect/Schema";

import {
  AlignOutputPathsSchema,
  AnalysisProgressSchema,
  AnalysisStartRequestSchema,
  AnnotationLabelArraySchema,
  AutoExcludePreviewRequestSchema,
  AutoExcludePreviewResponseSchema,
  ContrastWindowSchema,
  CropRoiProgressSchema,
  CropRoiRequestSchema,
  CropRoiResponseSchema,
  NullableCropRoiProgressSchema,
  FramePayloadSchema,
  HomeDirectoryResponseSchema,
  HostListDirectoryResultSchema,
  LoadedRoiFrameAnnotationSchema,
  LoadFrameRequestSchema,
  NullableAnalysisProgressSchema,
  NullableSavedAlignStateSchema,
  ReadTextFileResponseSchema,
  RoiFrameAnnotationPayloadSchema,
  RoiFrameAnnotationSchema,
  RoiFrameRequestSchema,
  RoiPosExistsResponseSchema,
  RoiWorkspaceScanSchema,
  SaveAssayJsonRequestSchema,
  SaveAssayJsonResponseSchema,
  SaveBboxRequestSchema,
  SaveBboxResponseSchema,
  SaveResultPdfRequestSchema,
  SaveResultPdfResponseSchema,
  ScanSourceRequestSchema,
  MemoryKindSchema,
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
  HttpApiSchema.annotations({ status: 400 }),
) {}

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 401 }),
) {}

const U32Param = Schema.NumberFromString.annotations({
  jsonSchema: { type: "integer", format: "uint32", minimum: 0 },
});

// --- fs group (shared host filesystem) ---------------------------------------
const fsGroup = HttpApiGroup.make("fs")
  .add(
    HttpApiEndpoint.get("listDirectory", "/fs/list")
      .setUrlParams(Schema.Struct({ path: Schema.optional(Schema.String) }))
      .addSuccess(HostListDirectoryResultSchema),
  )
  .add(HttpApiEndpoint.get("userHomeDirectory", "/fs/home").addSuccess(HomeDirectoryResponseSchema))
  .add(
    HttpApiEndpoint.get("readTextFile", "/fs/read-text")
      .setUrlParams(Schema.Struct({ path: Schema.String }))
      .addSuccess(ReadTextFileResponseSchema),
  );

// --- align group -------------------------------------------------------------
const alignGroup = HttpApiGroup.make("align")
  .add(
    HttpApiEndpoint.post("scanSource", "/align/scan-source")
      .setPayload(ScanSourceRequestSchema)
      .addSuccess(WorkspaceScanSchema),
  )
  .add(
    HttpApiEndpoint.post("loadFrame", "/align/load-frame")
      .setPayload(LoadFrameRequestSchema)
      .addSuccess(FramePayloadSchema),
  )
  .add(
    HttpApiEndpoint.post("autoExcludePreview", "/align/auto-exclude-preview")
      .setPayload(AutoExcludePreviewRequestSchema)
      .addSuccess(AutoExcludePreviewResponseSchema),
  )
  .add(
    HttpApiEndpoint.post("saveBbox", "/align/save-bbox")
      .setPayload(SaveBboxRequestSchema)
      .addSuccess(SaveBboxResponseSchema),
  )
  .add(
    HttpApiEndpoint.get("loadAlignState", "/align/align-state")
      .setUrlParams(Schema.Struct({ workspacePath: Schema.String, pos: U32Param }))
      .addSuccess(NullableSavedAlignStateSchema),
  )
  .add(
    HttpApiEndpoint.get("outputPaths", "/align/output-paths")
      .setUrlParams(Schema.Struct({ pos: U32Param }))
      .addSuccess(AlignOutputPathsSchema),
  )
  .add(
    HttpApiEndpoint.get("listSavedBboxPositions", "/align/saved-bbox-positions")
      .setUrlParams(Schema.Struct({ workspacePath: Schema.String }))
      .addSuccess(UIntArraySchema),
  )
  .add(
    HttpApiEndpoint.get("roiPosExists", "/align/roi-pos-exists")
      .setUrlParams(Schema.Struct({ workspacePath: Schema.String, pos: U32Param }))
      .addSuccess(RoiPosExistsResponseSchema),
  )
  .add(
    HttpApiEndpoint.post("cropRoi", "/align/crop-roi")
      .setPayload(CropRoiRequestSchema)
      .addSuccess(CropRoiResponseSchema),
  )
  .add(
    HttpApiEndpoint.post("cancelCropRoi", "/align/cancel-crop-roi")
      .setPayload(Schema.Struct({ requestId: Schema.String }))
      .addSuccess(CropRoiProgressSchema),
  )
  .add(
    HttpApiEndpoint.get("cropRoiProgress", "/align/crop-roi-progress")
      .setUrlParams(Schema.Struct({ requestId: Schema.String }))
      .addSuccess(CropRoiProgressSchema),
  )
  .add(
    HttpApiEndpoint.get("getLatestCropProgress", "/align/crop-latest")
      .setUrlParams(Schema.Struct({ workspacePath: Schema.String }))
      .addSuccess(NullableCropRoiProgressSchema),
  );

// --- annotate group ----------------------------------------------------------
const annotateGroup = HttpApiGroup.make("annotate")
  .add(
    HttpApiEndpoint.post("scanRoiWorkspace", "/annotate/scan-roi-workspace")
      .setPayload(Schema.Struct({ workspacePath: Schema.String }))
      .addSuccess(RoiWorkspaceScanSchema),
  )
  .add(
    HttpApiEndpoint.post("loadLabels", "/annotate/load-labels")
      .setPayload(Schema.Struct({ workspacePath: Schema.String }))
      .addSuccess(AnnotationLabelArraySchema),
  )
  .add(
    HttpApiEndpoint.post("saveLabels", "/annotate/save-labels")
      .setPayload(
        Schema.Struct({ workspacePath: Schema.String, labels: AnnotationLabelArraySchema }),
      )
      .addSuccess(AnnotationLabelArraySchema),
  )
  .add(
    HttpApiEndpoint.post("loadRoiFrame", "/annotate/load-roi-frame")
      .setPayload(
        Schema.Struct({
          workspacePath: Schema.String,
          request: RoiFrameRequestSchema,
          contrast: Schema.NullOr(ContrastWindowSchema),
        }),
      )
      .addSuccess(FramePayloadSchema),
  )
  .add(
    HttpApiEndpoint.post("loadRoiFrameAnnotation", "/annotate/load-roi-frame-annotation")
      .setPayload(Schema.Struct({ workspacePath: Schema.String, request: RoiFrameRequestSchema }))
      .addSuccess(LoadedRoiFrameAnnotationSchema),
  )
  .add(
    HttpApiEndpoint.post("saveRoiFrameAnnotation", "/annotate/save-roi-frame-annotation")
      .setPayload(
        Schema.Struct({
          workspacePath: Schema.String,
          request: RoiFrameRequestSchema,
          annotation: RoiFrameAnnotationPayloadSchema,
        }),
      )
      .addSuccess(RoiFrameAnnotationSchema),
  );

// --- profile group (studio server only) --------------------------------------
const profileGroup = HttpApiGroup.make("profile")
  .add(HttpApiEndpoint.get("listProfiles", "/profile/list").addSuccess(ProfileListResponseSchema))
  .add(
    HttpApiEndpoint.post("createProfile", "/profile/create")
      .setPayload(ProfileCreateRequestSchema)
      .addSuccess(ProfileSessionResponseSchema),
  )
  .add(
    HttpApiEndpoint.post("signInProfile", "/profile/sign-in")
      .setPayload(ProfileSignInRequestSchema)
      .addSuccess(ProfileSessionResponseSchema),
  )
  .add(
    HttpApiEndpoint.post("signOutProfile", "/profile/sign-out")
      .addSuccess(ProfileSignOutResponseSchema)
      .addError(Unauthorized),
  );

// --- memory group (studio server only) ---------------------------------------
const memoryGroup = HttpApiGroup.make("memory")
  .add(
    HttpApiEndpoint.get("getRecentMemory", "/memory/recent")
      .setUrlParams(
        Schema.Struct({
          type: MemoryKindSchema,
        }),
      )
      .addSuccess(MemoryRecentResponseSchema)
      .addError(Unauthorized),
  )
  .add(
    HttpApiEndpoint.post("touchMemory", "/memory/touch")
      .setPayload(MemoryTouchRequestSchema)
      .addSuccess(MemoryTouchResponseSchema)
      .addError(Unauthorized),
  );

// --- studio group ------------------------------------------------------------
const studioGroup = HttpApiGroup.make("studio")
  .add(
    HttpApiEndpoint.post("saveAssayJson", "/studio/save-assay-json")
      .setPayload(SaveAssayJsonRequestSchema)
      .addSuccess(SaveAssayJsonResponseSchema),
  )
  .add(
    HttpApiEndpoint.post("saveResultPdf", "/studio/save-result-pdf")
      .setPayload(SaveResultPdfRequestSchema)
      .addSuccess(SaveResultPdfResponseSchema),
  )
  .add(
    HttpApiEndpoint.post("startAnalysis", "/studio/start-analysis")
      .setPayload(AnalysisStartRequestSchema)
      .addSuccess(AnalysisProgressSchema),
  )
  .add(
    HttpApiEndpoint.get("getAnalysisProgress", "/studio/analysis-progress")
      .setUrlParams(Schema.Struct({ requestId: Schema.String }))
      .addSuccess(AnalysisProgressSchema),
  )
  .add(
    HttpApiEndpoint.get("getLatestAnalysisProgress", "/studio/latest-analysis")
      .setUrlParams(Schema.Struct({ workspacePath: Schema.String }))
      .addSuccess(NullableAnalysisProgressSchema),
  )
  .add(
    HttpApiEndpoint.get("getAnalysisResults", "/studio/analysis-results")
      .setUrlParams(Schema.Struct({ workspacePath: Schema.String }))
      .addSuccess(NullableAnalysisProgressSchema),
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
  .add(studioGroup)
  .addError(RequestError)
  .addError(Unauthorized);

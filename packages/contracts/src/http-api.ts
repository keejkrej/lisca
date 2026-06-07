import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import * as Schema from "effect/Schema";

import {
  AlignerSourceSchema,
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
  FramePayloadSchema,
  FrameRequestSchema,
  HomeDirectoryResponseSchema,
  HostListDirectoryResultSchema,
  LoadedRoiFrameAnnotationSchema,
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
  SaveBboxResponseSchema,
  SaveResultPdfRequestSchema,
  SaveResultPdfResponseSchema,
  SavedAlignStateSchema,
  SmbConnectRequestSchema,
  SmbConnectResponseSchema,
  SmbDisconnectRequestSchema,
  UIntArraySchema,
  WorkspaceScanSchema,
} from "./protocol.schema.ts";

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

const U32Param = Schema.NumberFromString.annotations({
  jsonSchema: { type: "integer", format: "uint32", minimum: 0 },
});

const OkSchema = Schema.Struct({ ok: Schema.Boolean }).annotations({ identifier: "OkResponse" });

/** POST /align/scan-source request body. */
export const ScanSourceRequestSchema = Schema.Struct({
  source: AlignerSourceSchema,
}).annotations({ identifier: "ScanSourceRequest" });

/** POST /align/load-frame request body. */
export const LoadFrameRequestSchema = Schema.Struct({
  source: AlignerSourceSchema,
  request: FrameRequestSchema,
  contrast: Schema.NullOr(ContrastWindowSchema),
}).annotations({ identifier: "LoadFrameRequest" });

/** POST /align/save-bbox request body. */
export const SaveBboxRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  pos: Schema.Number,
  csv: Schema.String,
  alignState: SavedAlignStateSchema,
}).annotations({ identifier: "SaveBboxRequest" });

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
  )
  .add(
    HttpApiEndpoint.post("connectSmb", "/fs/smb/connect")
      .setPayload(SmbConnectRequestSchema)
      .addSuccess(SmbConnectResponseSchema),
  )
  .add(
    HttpApiEndpoint.post("disconnectSmb", "/fs/smb/disconnect")
      .setPayload(SmbDisconnectRequestSchema)
      .addSuccess(OkSchema),
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
      .setPayload(
        Schema.Struct({ workspacePath: Schema.String, request: RoiFrameRequestSchema }),
      )
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
  .add(studioGroup)
  .addError(RequestError);

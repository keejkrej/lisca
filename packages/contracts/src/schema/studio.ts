import * as Schema from "effect/Schema";

import { F64, U32 } from "./primitives";

export const SaveAssayJsonRequestSchema = Schema.Struct({
  saveTo: Schema.String,
  contents: Schema.String,
}).annotate({ identifier: "SaveAssayJsonRequest" });

export const SaveAssayJsonResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  path: Schema.String,
}).annotate({ identifier: "SaveAssayJsonResponse" });

export const AnalysisStatusSchema = Schema.Literals([
  "queued",
  "running",
  "completed",
  "error",
]).annotate({ identifier: "AnalysisStatus" });

export const AnalysisStageSchema = Schema.Literals([
  "queued",
  "preparing",
  "segment",
  "traces",
  "auc",
  "fit",
  "completed",
]).annotate({ identifier: "AnalysisStage" });

export const StudioAnalysisCsvFileSchema = Schema.Struct({
  kind: Schema.String,
  fileName: Schema.String,
  path: Schema.String,
  csv: Schema.String,
}).annotate({ identifier: "AnalysisCsvFile" });

export const AnalysisProgressSchema = Schema.Struct({
  requestId: Schema.String,
  status: AnalysisStatusSchema,
  stage: AnalysisStageSchema,
  progress: F64,
  message: Schema.NullOr(Schema.String),
  resultFiles: Schema.optional(Schema.mutable(Schema.Array(StudioAnalysisCsvFileSchema))),
  error: Schema.NullOr(Schema.String),
}).annotate({ identifier: "AnalysisProgress" });

export const NullableAnalysisProgressSchema = Schema.NullOr(AnalysisProgressSchema);

export const AnalysisStartRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  requestId: Schema.String,
}).annotate({ identifier: "AnalysisStartRequest" });

export const AnalysisProgressQuerySchema = Schema.Struct({
  requestId: Schema.String,
}).annotate({ identifier: "AnalysisProgressQuery" });

export const LatestAnalysisQuerySchema = Schema.Struct({
  workspacePath: Schema.String,
}).annotate({ identifier: "LatestAnalysisQuery" });

export const LabelFreeProviderSchema = Schema.Literals(["openrouter"]).annotate({
  identifier: "LabelFreeProvider",
});

/** OpenRouter label-free status on the Studio API. Desktop sends it over IPC; hosted web uses same-origin HTTP. */
export const LabelFreeHealthSchema = Schema.Struct({
  apiVersion: U32,
  provider: LabelFreeProviderSchema,
  configured: Schema.Boolean,
  modelId: Schema.String,
  revision: Schema.String,
  dimensions: U32,
  batchSize: U32,
  cacheCap: U32,
}).annotate({ identifier: "LabelFreeHealth" });

export const LabelFreeKeyRequestSchema = Schema.Struct({
  apiKey: Schema.String,
}).annotate({ identifier: "LabelFreeKeyRequest" });

export const LabelFreeReferenceQuerySchema = Schema.Struct({
  workspacePath: Schema.String,
}).annotate({ identifier: "LabelFreeReferenceQuery" });

export const LabelFreeReferenceRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  name: Schema.String,
}).annotate({ identifier: "LabelFreeReferenceRequest" });

export const LabelFreeClassifyRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  name: Schema.String,
  limit: U32,
}).annotate({ identifier: "LabelFreeClassifyRequest" });

export const LabelFreeLabelCountSchema = Schema.Struct({
  label: Schema.String,
  count: U32,
}).annotate({ identifier: "LabelFreeLabelCount" });

export const LabelFreeReferenceSetSchema = Schema.Struct({
  name: Schema.String,
  count: U32,
  labels: Schema.mutable(Schema.Array(LabelFreeLabelCountSchema)),
  modelId: Schema.String,
  revision: Schema.String,
  encoderId: Schema.String,
}).annotate({ identifier: "LabelFreeReferenceSet" });

export const LabelFreeReferenceSetListSchema = Schema.mutable(
  Schema.Array(LabelFreeReferenceSetSchema),
).annotate({ identifier: "LabelFreeReferenceSetList" });

export const LabelFreeClassificationSchema = Schema.Struct({
  pos: U32,
  roi: U32,
  channel: U32,
  time: U32,
  z: U32,
  labelId: Schema.String,
  support: F64,
}).annotate({ identifier: "LabelFreeClassification" });

export const LabelFreeClassificationListSchema = Schema.mutable(
  Schema.Array(LabelFreeClassificationSchema),
).annotate({ identifier: "LabelFreeClassificationList" });

export type SaveAssayJsonRequest = typeof SaveAssayJsonRequestSchema.Type;
export type SaveAssayJsonResponse = typeof SaveAssayJsonResponseSchema.Type;
export type AnalysisStatus = typeof AnalysisStatusSchema.Type;
export type AnalysisStage = typeof AnalysisStageSchema.Type;
export type StudioAnalysisCsvFile = typeof StudioAnalysisCsvFileSchema.Type;
export type AnalysisProgress = typeof AnalysisProgressSchema.Type;
export type AnalysisStartRequest = typeof AnalysisStartRequestSchema.Type;
export type AnalysisProgressQuery = typeof AnalysisProgressQuerySchema.Type;
export type LatestAnalysisQuery = typeof LatestAnalysisQuerySchema.Type;
export type LabelFreeProvider = typeof LabelFreeProviderSchema.Type;
export type LabelFreeHealth = typeof LabelFreeHealthSchema.Type;
export type LabelFreeKeyRequest = typeof LabelFreeKeyRequestSchema.Type;
export type LabelFreeReferenceQuery = typeof LabelFreeReferenceQuerySchema.Type;
export type LabelFreeReferenceRequest = typeof LabelFreeReferenceRequestSchema.Type;
export type LabelFreeClassifyRequest = typeof LabelFreeClassifyRequestSchema.Type;
export type LabelFreeLabelCount = typeof LabelFreeLabelCountSchema.Type;
export type LabelFreeReferenceSet = typeof LabelFreeReferenceSetSchema.Type;
export type LabelFreeClassification = typeof LabelFreeClassificationSchema.Type;

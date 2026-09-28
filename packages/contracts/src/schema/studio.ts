import * as Schema from "effect/Schema";

import { F64 } from "./primitives";

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
  "timeseries",
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

export type SaveAssayJsonRequest = typeof SaveAssayJsonRequestSchema.Type;
export type SaveAssayJsonResponse = typeof SaveAssayJsonResponseSchema.Type;
export type AnalysisStatus = typeof AnalysisStatusSchema.Type;
export type AnalysisStage = typeof AnalysisStageSchema.Type;
export type StudioAnalysisCsvFile = typeof StudioAnalysisCsvFileSchema.Type;
export type AnalysisProgress = typeof AnalysisProgressSchema.Type;
export type AnalysisStartRequest = typeof AnalysisStartRequestSchema.Type;
export type AnalysisProgressQuery = typeof AnalysisProgressQuerySchema.Type;
export type LatestAnalysisQuery = typeof LatestAnalysisQuerySchema.Type;

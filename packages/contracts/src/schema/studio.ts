import * as Schema from "effect/Schema";

import { F64 } from "./primitives";

export const SaveAssayJsonRequestSchema = Schema.Struct({
  saveTo: Schema.String,
  contents: Schema.String,
}).annotations({ identifier: "SaveAssayJsonRequest" });

export const SaveAssayJsonResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  path: Schema.String,
}).annotations({ identifier: "SaveAssayJsonResponse" });

export const SaveResultPdfRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  fileName: Schema.String,
  contentsBase64: Schema.String,
}).annotations({ identifier: "SaveResultPdfRequest" });

export const SaveResultPdfResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  directory: Schema.String,
  path: Schema.String,
}).annotations({ identifier: "SaveResultPdfResponse" });

export const AnalysisStatusSchema = Schema.Literal(
  "queued",
  "running",
  "completed",
  "error",
).annotations({ identifier: "AnalysisStatus" });

export const AnalysisStageSchema = Schema.Literal(
  "queued",
  "preparing",
  "segment",
  "timeseries",
  "auc",
  "fit",
  "completed",
).annotations({ identifier: "AnalysisStage" });

export const StudioAnalysisCsvFileSchema = Schema.Struct({
  kind: Schema.String,
  fileName: Schema.String,
  path: Schema.String,
  csv: Schema.String,
}).annotations({ identifier: "AnalysisCsvFile" });

export const AnalysisProgressSchema = Schema.Struct({
  requestId: Schema.String,
  status: AnalysisStatusSchema,
  stage: AnalysisStageSchema,
  progress: F64,
  message: Schema.NullOr(Schema.String),
  resultFiles: Schema.optional(Schema.mutable(Schema.Array(StudioAnalysisCsvFileSchema))),
  error: Schema.NullOr(Schema.String),
}).annotations({ identifier: "AnalysisProgress" });

export const NullableAnalysisProgressSchema = Schema.NullOr(AnalysisProgressSchema);

export const AnalysisProgressMessageSchema = Schema.Struct({
  type: Schema.Literal("analysisProgress"),
  progress: AnalysisProgressSchema,
}).annotations({ identifier: "AnalysisProgressMessage" });

export const AnalysisStartRequestSchema = Schema.Struct({
  workspacePath: Schema.String,
  requestId: Schema.String,
}).annotations({ identifier: "AnalysisStartRequest" });

export type SaveAssayJsonRequest = typeof SaveAssayJsonRequestSchema.Type;
export type SaveAssayJsonResponse = typeof SaveAssayJsonResponseSchema.Type;
export type SaveResultPdfRequest = typeof SaveResultPdfRequestSchema.Type;
export type SaveResultPdfResponse = typeof SaveResultPdfResponseSchema.Type;
export type AnalysisStatus = typeof AnalysisStatusSchema.Type;
export type AnalysisStage = typeof AnalysisStageSchema.Type;
export type StudioAnalysisCsvFile = typeof StudioAnalysisCsvFileSchema.Type;
export type AnalysisProgress = typeof AnalysisProgressSchema.Type;
export type AnalysisProgressMessage = typeof AnalysisProgressMessageSchema.Type;
export type AnalysisStartRequest = typeof AnalysisStartRequestSchema.Type;

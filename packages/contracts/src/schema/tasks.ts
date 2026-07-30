import * as Schema from "effect/Schema";

import { U32, U64 } from "./primitives";

export const OperationStatusSchema = Schema.Literal(
  "queued",
  "running",
  "partially-complete",
  "completed",
  "failed",
  "cancelled",
  "cancellation-requested",
).annotations({ identifier: "OperationStatus" });

export const TaskStatusSchema = Schema.Literal(
  "queued",
  "blocked",
  "running",
  "completed",
  "failed",
  "cancelled",
  "cancellation-requested",
).annotations({ identifier: "TaskStatus" });

export const OperationAttentionSchema = Schema.Literal("none", "error").annotations({
  identifier: "OperationAttention",
});

export const TaskErrorSchema = Schema.Struct({
  code: Schema.String,
  message: Schema.String,
}).annotations({ identifier: "TaskError" });

export const TaskWorkProgressSchema = Schema.Struct({
  unit: Schema.String,
  completed: U32,
  total: U32,
  phase: Schema.NullOr(Schema.String),
  message: Schema.NullOr(Schema.String),
  updatedAtMs: U64,
}).annotations({ identifier: "TaskWorkProgress" });

export const OperationProgressSchema = Schema.Struct({
  total: U32,
  queued: U32,
  blocked: U32,
  running: U32,
  completed: U32,
  failed: U32,
  cancelled: U32,
  cancellationRequested: U32,
}).annotations({ identifier: "OperationProgress" });

export const OperationSummarySchema = Schema.Struct({
  operationId: Schema.String,
  kind: Schema.String,
  workspaceId: Schema.String,
  workspacePath: Schema.String,
  mutating: Schema.Boolean,
  status: OperationStatusSchema,
  attention: OperationAttentionSchema,
  progress: OperationProgressSchema,
  activeTaskKind: Schema.optional(Schema.NullOr(Schema.String)),
  workProgress: Schema.optional(Schema.NullOr(TaskWorkProgressSchema)),
  createdAtMs: U64,
  updatedAtMs: U64,
}).annotations({ identifier: "OperationSummary" });

export const OperationListSchema = Schema.mutable(Schema.Array(OperationSummarySchema)).annotations(
  {
    identifier: "OperationList",
  },
);

export const OperationDetailQuerySchema = Schema.Struct({
  operationId: Schema.String,
}).annotations({ identifier: "OperationDetailQuery" });

export const TaskDetailQuerySchema = Schema.Struct({
  taskId: Schema.String,
}).annotations({ identifier: "TaskDetailQuery" });

export const OperationCancelRequestSchema = Schema.Struct({
  operationId: Schema.String,
}).annotations({ identifier: "OperationCancelRequest" });

export const TaskCancelRequestSchema = Schema.Struct({
  taskId: Schema.String,
}).annotations({ identifier: "TaskCancelRequest" });

export const TaskRetryRequestSchema = Schema.Struct({
  taskId: Schema.String,
}).annotations({ identifier: "TaskRetryRequest" });

export const TaskAttemptSchema = Schema.Struct({
  attemptId: Schema.String,
  operationId: Schema.String,
  taskId: Schema.String,
  status: TaskStatusSchema,
  startedAtMs: Schema.NullOr(U64),
  finishedAtMs: Schema.NullOr(U64),
  error: Schema.NullOr(TaskErrorSchema),
}).annotations({ identifier: "TaskAttempt" });

export const TaskDependencyBlockSchema = Schema.Struct({
  taskId: Schema.String,
  taskKind: Schema.String,
  status: TaskStatusSchema,
  error: Schema.NullOr(TaskErrorSchema),
}).annotations({ identifier: "TaskDependencyBlock" });

export const TaskDetailSchema = Schema.Struct({
  taskId: Schema.String,
  operationId: Schema.String,
  taskKind: Schema.String,
  workspaceId: Schema.String,
  status: TaskStatusSchema,
  weight: U32,
  enqueueOrder: U64,
  dependencies: Schema.mutable(Schema.Array(Schema.String)),
  blockedBy: Schema.mutable(Schema.Array(TaskDependencyBlockSchema)),
  attempts: Schema.mutable(Schema.Array(TaskAttemptSchema)),
  workProgress: Schema.optional(Schema.NullOr(TaskWorkProgressSchema)),
}).annotations({ identifier: "TaskDetail" });

export const OperationDetailSchema = Schema.Struct({
  operation: OperationSummarySchema,
  tasks: Schema.mutable(Schema.Array(TaskDetailSchema)),
}).annotations({ identifier: "OperationDetail" });

export type OperationStatus = typeof OperationStatusSchema.Type;
export type TaskStatus = typeof TaskStatusSchema.Type;
export type OperationAttention = typeof OperationAttentionSchema.Type;
export type TaskError = typeof TaskErrorSchema.Type;
export type TaskWorkProgress = typeof TaskWorkProgressSchema.Type;
export type OperationProgress = typeof OperationProgressSchema.Type;
export type OperationSummary = typeof OperationSummarySchema.Type;
export type OperationList = typeof OperationListSchema.Type;
export type OperationDetailQuery = typeof OperationDetailQuerySchema.Type;
export type TaskDetailQuery = typeof TaskDetailQuerySchema.Type;
export type OperationCancelRequest = typeof OperationCancelRequestSchema.Type;
export type TaskCancelRequest = typeof TaskCancelRequestSchema.Type;
export type TaskRetryRequest = typeof TaskRetryRequestSchema.Type;
export type TaskAttempt = typeof TaskAttemptSchema.Type;
export type TaskDependencyBlock = typeof TaskDependencyBlockSchema.Type;
export type TaskDetail = typeof TaskDetailSchema.Type;
export type OperationDetail = typeof OperationDetailSchema.Type;

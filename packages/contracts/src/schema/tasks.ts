import * as Schema from "effect/Schema";

import { U32, U64 } from "./primitives";

export const TaskStatusSchema = Schema.Literals([
  "queued",
  "running",
  "partially-complete",
  "completed",
  "failed",
  "cancelled",
  "cancellation-requested",
]).annotate({ identifier: "TaskStatus" });

export const StepStatusSchema = Schema.Literals([
  "queued",
  "blocked",
  "running",
  "completed",
  "failed",
  "cancelled",
  "cancellation-requested",
]).annotate({ identifier: "StepStatus" });

export const TaskAttentionSchema = Schema.Literals(["none", "error"]).annotate({
  identifier: "TaskAttention",
});

export const StepErrorSchema = Schema.Struct({
  code: Schema.String,
  message: Schema.String,
}).annotate({ identifier: "StepError" });

export const StepWorkProgressSchema = Schema.Struct({
  unit: Schema.String,
  completed: U32,
  total: U32,
  phase: Schema.NullOr(Schema.String),
  message: Schema.NullOr(Schema.String),
  updatedAtMs: U64,
}).annotate({ identifier: "StepWorkProgress" });

export const TaskProgressSchema = Schema.Struct({
  total: U32,
  queued: U32,
  blocked: U32,
  running: U32,
  completed: U32,
  failed: U32,
  cancelled: U32,
  cancellationRequested: U32,
}).annotate({ identifier: "TaskProgress" });

export const TaskSummarySchema = Schema.Struct({
  taskId: Schema.String,
  kind: Schema.String,
  workspaceId: Schema.String,
  workspacePath: Schema.String,
  mutating: Schema.Boolean,
  status: TaskStatusSchema,
  attention: TaskAttentionSchema,
  progress: TaskProgressSchema,
  activeStepKind: Schema.optional(Schema.NullOr(Schema.String)),
  workProgress: Schema.optional(Schema.NullOr(StepWorkProgressSchema)),
  createdAtMs: U64,
  updatedAtMs: U64,
}).annotate({ identifier: "TaskSummary" });

export const TaskListSchema = Schema.mutable(Schema.Array(TaskSummarySchema)).annotate({
  identifier: "TaskList",
});

export const TaskDetailQuerySchema = Schema.Struct({
  taskId: Schema.String,
}).annotate({ identifier: "TaskDetailQuery" });

export const StepDetailQuerySchema = Schema.Struct({
  stepId: Schema.String,
}).annotate({ identifier: "StepDetailQuery" });

export const TaskCancelRequestSchema = Schema.Struct({
  taskId: Schema.String,
}).annotate({ identifier: "TaskCancelRequest" });

export const StepCancelRequestSchema = Schema.Struct({
  stepId: Schema.String,
}).annotate({ identifier: "StepCancelRequest" });

export const StepRetryRequestSchema = Schema.Struct({
  stepId: Schema.String,
}).annotate({ identifier: "StepRetryRequest" });

export const StepAttemptSchema = Schema.Struct({
  attemptId: Schema.String,
  taskId: Schema.String,
  stepId: Schema.String,
  status: StepStatusSchema,
  startedAtMs: Schema.NullOr(U64),
  finishedAtMs: Schema.NullOr(U64),
  error: Schema.NullOr(StepErrorSchema),
}).annotate({ identifier: "StepAttempt" });

export const StepDependencyBlockSchema = Schema.Struct({
  stepId: Schema.String,
  stepKind: Schema.String,
  status: StepStatusSchema,
  error: Schema.NullOr(StepErrorSchema),
}).annotate({ identifier: "StepDependencyBlock" });

export const StepDetailSchema = Schema.Struct({
  stepId: Schema.String,
  taskId: Schema.String,
  stepKind: Schema.String,
  workspaceId: Schema.String,
  status: StepStatusSchema,
  weight: U32,
  enqueueOrder: U64,
  dependencies: Schema.mutable(Schema.Array(Schema.String)),
  blockedBy: Schema.mutable(Schema.Array(StepDependencyBlockSchema)),
  attempts: Schema.mutable(Schema.Array(StepAttemptSchema)),
  workProgress: Schema.optional(Schema.NullOr(StepWorkProgressSchema)),
}).annotate({ identifier: "StepDetail" });

export const TaskDetailSchema = Schema.Struct({
  task: TaskSummarySchema,
  steps: Schema.mutable(Schema.Array(StepDetailSchema)),
}).annotate({ identifier: "TaskDetail" });

export type TaskStatus = typeof TaskStatusSchema.Type;
export type StepStatus = typeof StepStatusSchema.Type;
export type TaskAttention = typeof TaskAttentionSchema.Type;
export type StepError = typeof StepErrorSchema.Type;
export type StepWorkProgress = typeof StepWorkProgressSchema.Type;
export type TaskProgress = typeof TaskProgressSchema.Type;
export type TaskSummary = typeof TaskSummarySchema.Type;
export type TaskList = typeof TaskListSchema.Type;
export type TaskDetailQuery = typeof TaskDetailQuerySchema.Type;
export type StepDetailQuery = typeof StepDetailQuerySchema.Type;
export type TaskCancelRequest = typeof TaskCancelRequestSchema.Type;
export type StepCancelRequest = typeof StepCancelRequestSchema.Type;
export type StepRetryRequest = typeof StepRetryRequestSchema.Type;
export type StepAttempt = typeof StepAttemptSchema.Type;
export type StepDependencyBlock = typeof StepDependencyBlockSchema.Type;
export type StepDetail = typeof StepDetailSchema.Type;
export type TaskDetail = typeof TaskDetailSchema.Type;

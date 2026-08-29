import * as Schema from "effect/Schema";

import { U64 } from "./primitives";
import { AlignerSourceSchema } from "./shared";

export const MemoryKindSchema = Schema.Literals(["workspace", "source", "assay"]).annotate({
  identifier: "MemoryKind",
});

export const MemoryWorkspaceEntrySchema = Schema.Struct({
  path: Schema.String,
  label: Schema.optional(Schema.String),
  lastUsedAt: U64,
}).annotate({ identifier: "MemoryWorkspaceEntry" });

export const MemorySourceEntrySchema = Schema.Struct({
  source: AlignerSourceSchema,
  label: Schema.optional(Schema.String),
  lastUsedAt: U64,
}).annotate({ identifier: "MemorySourceEntry" });

export const MemoryAssayEntrySchema = Schema.Struct({
  path: Schema.String,
  assayLabel: Schema.optional(Schema.String),
  workspacePath: Schema.optional(Schema.String),
  lastUsedAt: U64,
}).annotate({ identifier: "MemoryAssayEntry" });

export const MemoryTouchRequestSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("workspace"),
    path: Schema.String,
    label: Schema.optional(Schema.String),
  }),
  Schema.Struct({
    kind: Schema.Literal("source"),
    source: AlignerSourceSchema,
    label: Schema.optional(Schema.String),
  }),
  Schema.Struct({
    kind: Schema.Literal("assay"),
    path: Schema.String,
    assayLabel: Schema.optional(Schema.String),
    workspacePath: Schema.optional(Schema.String),
  }),
]).annotate({ identifier: "MemoryTouchRequest" });

export const MemoryRecentResponseSchema = Schema.Struct({
  workspaces: Schema.optional(Schema.Array(MemoryWorkspaceEntrySchema)),
  sources: Schema.optional(Schema.Array(MemorySourceEntrySchema)),
  assays: Schema.optional(Schema.Array(MemoryAssayEntrySchema)),
}).annotate({ identifier: "MemoryRecentResponse" });

export const MemoryTouchResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
}).annotate({ identifier: "MemoryTouchResponse" });

export const MemoryRecentQuerySchema = Schema.Struct({
  type: MemoryKindSchema,
}).annotate({ identifier: "MemoryRecentQuery" });

export type MemoryKind = typeof MemoryKindSchema.Type;
export type MemoryWorkspaceEntry = typeof MemoryWorkspaceEntrySchema.Type;
export type MemorySourceEntry = typeof MemorySourceEntrySchema.Type;
export type MemoryAssayEntry = typeof MemoryAssayEntrySchema.Type;
export type MemoryTouchRequest = typeof MemoryTouchRequestSchema.Type;
export type MemoryRecentResponse = typeof MemoryRecentResponseSchema.Type;
export type MemoryTouchResponse = typeof MemoryTouchResponseSchema.Type;
export type MemoryRecentQuery = typeof MemoryRecentQuerySchema.Type;

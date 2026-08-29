import * as Schema from "effect/Schema";

export const HostFsEntrySchema = Schema.Struct({
  name: Schema.String,
  path: Schema.String,
  isDirectory: Schema.Boolean,
}).annotate({ identifier: "HostFsEntry" });

export const HostListDirectoryResultSchema = Schema.Struct({
  path: Schema.NullOr(Schema.String),
  parent: Schema.NullOr(Schema.String),
  entries: Schema.mutable(Schema.Array(HostFsEntrySchema)),
}).annotate({ identifier: "HostListDirectoryResult" });

export const HomeDirectoryResponseSchema = Schema.Struct({
  path: Schema.String,
}).annotate({ identifier: "HomeDirectoryResponse" });

export const ReadTextFileResponseSchema = Schema.Struct({
  contents: Schema.String,
}).annotate({ identifier: "ReadTextFileResponse" });

export const CreateDirectoryRequestSchema = Schema.Struct({
  parentPath: Schema.String,
  name: Schema.String,
}).annotate({ identifier: "CreateDirectoryRequest" });

export const CreateDirectoryResponseSchema = Schema.Struct({
  path: Schema.String,
}).annotate({ identifier: "CreateDirectoryResponse" });

export const HostListDirectoryQuerySchema = Schema.Struct({
  path: Schema.optional(Schema.String),
}).annotate({ identifier: "HostListDirectoryQuery" });

export const ReadTextFileQuerySchema = Schema.Struct({
  path: Schema.String,
}).annotate({ identifier: "ReadTextFileQuery" });

export type HostFsEntry = typeof HostFsEntrySchema.Type;
export type HostListDirectoryResult = typeof HostListDirectoryResultSchema.Type;
export type HomeDirectoryResponse = typeof HomeDirectoryResponseSchema.Type;
export type ReadTextFileResponse = typeof ReadTextFileResponseSchema.Type;
export type CreateDirectoryRequest = typeof CreateDirectoryRequestSchema.Type;
export type CreateDirectoryResponse = typeof CreateDirectoryResponseSchema.Type;
export type HostListDirectoryQuery = typeof HostListDirectoryQuerySchema.Type;
export type ReadTextFileQuery = typeof ReadTextFileQuerySchema.Type;

import * as Schema from "effect/Schema";

export const HostFsEntrySchema = Schema.Struct({
  name: Schema.String,
  path: Schema.String,
  isDirectory: Schema.Boolean,
}).annotations({ identifier: "HostFsEntry" });

export const HostListDirectoryResultSchema = Schema.Struct({
  path: Schema.NullOr(Schema.String),
  parent: Schema.NullOr(Schema.String),
  entries: Schema.mutable(Schema.Array(HostFsEntrySchema)),
}).annotations({ identifier: "HostListDirectoryResult" });

export const HomeDirectoryResponseSchema = Schema.Struct({
  path: Schema.String,
}).annotations({ identifier: "HomeDirectoryResponse" });

export const ReadTextFileResponseSchema = Schema.Struct({
  contents: Schema.String,
}).annotations({ identifier: "ReadTextFileResponse" });

export type HostFsEntry = typeof HostFsEntrySchema.Type;
export type HostListDirectoryResult = typeof HostListDirectoryResultSchema.Type;
export type HomeDirectoryResponse = typeof HomeDirectoryResponseSchema.Type;
export type ReadTextFileResponse = typeof ReadTextFileResponseSchema.Type;

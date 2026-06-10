import * as Schema from "effect/Schema";

import { PIXEL_TYPES } from "../constants.ts";
import { F64, NumArray, U32 } from "./primitives.ts";

export const AppIdSchema = Schema.Literal("aligner", "annotator", "studio").annotations({
  identifier: "AppId",
});

export const WorkspaceScanSchema = Schema.Struct({
  positions: NumArray,
  channels: NumArray,
  times: NumArray,
  zSlices: NumArray,
}).annotations({ identifier: "WorkspaceScan" });

export const FolderSourceSchema = Schema.Struct({
  kind: Schema.Literal("folder"),
  path: Schema.String,
  subfolderTemplate: Schema.String,
  filenameTemplate: Schema.String,
}).annotations({ identifier: "FolderSource" });

export const AlignerSourceSchema = Schema.Union(
  FolderSourceSchema,
  Schema.Struct({ kind: Schema.Literal("tif"), path: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("jpg"), path: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("nd2"), path: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("czi"), path: Schema.String }),
).annotations({ identifier: "AlignerSource" });

export const FrameRequestSchema = Schema.Struct({
  pos: U32,
  channel: U32,
  time: U32,
  z: U32,
}).annotations({ identifier: "FrameRequest" });

export const ContrastWindowSchema = Schema.Struct({
  min: U32,
  max: U32,
}).annotations({ identifier: "ContrastWindow" });

export const PixelTypeSchema = Schema.Literal(...PIXEL_TYPES).annotations({
  identifier: "PixelType",
});

export const FramePayloadSchema = Schema.Struct({
  width: U32,
  height: U32,
  dataBase64: Schema.String,
  pixelType: PixelTypeSchema,
  contrastDomain: ContrastWindowSchema,
  suggestedContrast: ContrastWindowSchema,
  appliedContrast: ContrastWindowSchema,
}).annotations({ identifier: "FramePayload" });

export type AppId = typeof AppIdSchema.Type;
export type WorkspaceScan = typeof WorkspaceScanSchema.Type;
export type AlignerSource = typeof AlignerSourceSchema.Type;
export type ImageSource = AlignerSource;
export type FolderSource = Extract<AlignerSource, { kind: "folder" }>;
export type Nd2Source = Extract<AlignerSource, { kind: "nd2" }>;
export type CziSource = Extract<AlignerSource, { kind: "czi" }>;
export type FrameRequest = typeof FrameRequestSchema.Type;
export type ContrastWindow = typeof ContrastWindowSchema.Type;
export type FramePayload = typeof FramePayloadSchema.Type;
export type PixelType = typeof PixelTypeSchema.Type;

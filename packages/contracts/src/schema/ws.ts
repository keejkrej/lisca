import * as Schema from "effect/Schema";

import { CropRoiProgressMessageSchema } from "./align";
import { AppIdSchema } from "./shared";
import { AnalysisProgressMessageSchema } from "./studio";

export const HelloMessageSchema = Schema.Struct({
  app: AppIdSchema,
  version: Schema.String,
}).annotations({ identifier: "Hello" });

export const ServerWsMessageSchema = Schema.Union(
  HelloMessageSchema,
  CropRoiProgressMessageSchema,
  AnalysisProgressMessageSchema,
).annotations({ identifier: "ServerWsMessage" });

export type HelloMessage = typeof HelloMessageSchema.Type;
export type ServerWsMessage = typeof ServerWsMessageSchema.Type;

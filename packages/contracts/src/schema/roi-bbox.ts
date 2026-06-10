import * as Schema from "effect/Schema";

import { U32 } from "./primitives.ts";

export const RoiBboxSchema = Schema.Struct({
  roi: U32,
  x: U32,
  y: U32,
  w: U32,
  h: U32,
}).annotations({ identifier: "RoiBbox" });

export type RoiBbox = typeof RoiBboxSchema.Type;

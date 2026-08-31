import * as Schema from "effect/Schema";

import { U32 } from "./primitives";

/** Required `bbox/PosN.csv` columns. Writers use `roi`; parsers accept `crop` as an alias. */
export const BBOX_CSV_COLUMNS = ["roi", "x", "y", "w", "h"] as const;

export const RoiBboxSchema = Schema.Struct({
  roi: U32,
  x: U32,
  y: U32,
  w: U32,
  h: U32,
}).annotate({ identifier: "RoiBbox" });

export type RoiBbox = typeof RoiBboxSchema.Type;

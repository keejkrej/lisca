import type { RoiWorkspaceScan } from "@lisca/contracts";

import type { AnnotatorDataPort } from "../../ports/types";
import { createAnnotateQueryAtoms, type AnnotateQueryAtoms } from "../annotate-queries";
import type { AppRuntime } from "../runtime";

export type AnnotatorQueryAtoms = AnnotateQueryAtoms;

export function createAnnotatorQueryAtoms(
  runtime: AppRuntime,
  port: AnnotatorDataPort,
): AnnotatorQueryAtoms {
  return createAnnotateQueryAtoms(runtime, port);
}

export type { RoiWorkspaceScan };

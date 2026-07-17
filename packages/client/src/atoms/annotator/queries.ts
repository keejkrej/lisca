import type { RoiWorkspaceScan } from "@lisca/contracts";

import { createAnnotateQueryAtoms, type AnnotateQueryAtoms } from "../annotate-queries";
import { AnnotatorPortService } from "../ports";
import type { AppRuntime } from "../runtime";

export type AnnotatorQueryAtoms = AnnotateQueryAtoms;

export function createAnnotatorQueryAtoms(
  runtime: AppRuntime<AnnotatorPortService>,
): AnnotatorQueryAtoms {
  return createAnnotateQueryAtoms(runtime, AnnotatorPortService);
}

export type { RoiWorkspaceScan };

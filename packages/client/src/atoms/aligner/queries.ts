import type { AutoExcludePreviewResponse, WorkspaceScan } from "@lisca/contracts";

import { AlignerPortService } from "../ports";
import type { AppRuntime } from "../runtime";
import { createSourceQueryAtoms, type SourceQueryAtoms } from "../source-queries";

export type AlignerQueryAtoms = SourceQueryAtoms;

export function createAlignerQueryAtoms(
  runtime: AppRuntime<AlignerPortService>,
): AlignerQueryAtoms {
  return createSourceQueryAtoms(runtime, AlignerPortService);
}

export type ScanSourceAtom = AlignerQueryAtoms["scanSourceAtom"];

export type { WorkspaceScan, AutoExcludePreviewResponse };

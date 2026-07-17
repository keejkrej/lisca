import type { RoiWorkspaceScan, WorkspaceScan } from "@lisca/contracts";

import { createAnnotateQueryAtoms, type AnnotateQueryAtoms } from "../annotate-queries";
import { StudioPortService } from "../ports";
import type { AppRuntime } from "../runtime";
import { createSourceQueryAtoms, type SourceQueryAtoms } from "../source-queries";

export type StudioQueryAtoms = SourceQueryAtoms & AnnotateQueryAtoms;

export function createStudioQueryAtoms(runtime: AppRuntime<StudioPortService>): StudioQueryAtoms {
  return {
    ...createSourceQueryAtoms(runtime, StudioPortService),
    ...createAnnotateQueryAtoms(runtime, StudioPortService),
  };
}

export type { WorkspaceScan, RoiWorkspaceScan };

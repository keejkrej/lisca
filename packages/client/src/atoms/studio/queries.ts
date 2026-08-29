import type { RoiWorkspaceScan, WorkspaceScan } from "@lisca/contracts";

import type { StudioDataPort } from "../../ports/types";
import { createAnnotateQueryAtoms, type AnnotateQueryAtoms } from "../annotate-queries";
import type { AppRuntime } from "../runtime";
import { createSourceQueryAtoms, type SourceQueryAtoms } from "../source-queries";

export type StudioQueryAtoms = SourceQueryAtoms & AnnotateQueryAtoms;

export function createStudioQueryAtoms(
  runtime: AppRuntime,
  port: StudioDataPort,
): StudioQueryAtoms {
  return {
    ...createSourceQueryAtoms(runtime, port),
    ...createAnnotateQueryAtoms(runtime, port),
  };
}

export type { WorkspaceScan, RoiWorkspaceScan };

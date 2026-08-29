import type { AutoExcludePreviewResponse, WorkspaceScan } from "@lisca/contracts";

import type { AlignerDataPort } from "../../ports/types";
import type { AppRuntime } from "../runtime";
import { createSourceQueryAtoms, type SourceQueryAtoms } from "../source-queries";

export type AlignerQueryAtoms = SourceQueryAtoms;

export function createAlignerQueryAtoms(
  runtime: AppRuntime,
  port: AlignerDataPort,
): AlignerQueryAtoms {
  return createSourceQueryAtoms(runtime, port);
}

export type ScanSourceAtom = AlignerQueryAtoms["scanSourceAtom"];

export type { WorkspaceScan, AutoExcludePreviewResponse };

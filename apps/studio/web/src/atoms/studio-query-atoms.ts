import type { AnnotationLabel, RoiWorkspaceScan, WorkspaceScan } from "@lisca/contracts";
import { Atom, Result } from "@effect-atom/atom-solid";

import { createAppRuntime, createStudioQueryAtoms } from "@lisca/client/atoms";

import { studioClient } from "../api/studio-port";

export const studioRuntime = createAppRuntime();

export const studioQueryAtoms = createStudioQueryAtoms(studioRuntime, studioClient);

export const {
  scanSourceAtom,
  roiWorkspaceScanAtom,
  annotationLabelsAtom,
  saveAnnotationLabelsAtom,
  saveRoiFrameAnnotationAtom,
} = studioQueryAtoms;

export const scanIdleAtom = Atom.make(Result.initial<WorkspaceScan>());
export const roiScanIdleAtom = Atom.make(Result.initial<RoiWorkspaceScan>());
export const labelsIdleAtom = Atom.make(Result.initial<AnnotationLabel[]>());

export { Atom, Result };

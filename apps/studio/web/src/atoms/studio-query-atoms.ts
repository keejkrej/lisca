import type { AnnotationLabel, RoiWorkspaceScan, WorkspaceScan } from "@lisca/contracts";
import { Atom, Result } from "@effect-atom/atom-solid";

import { createStudioQueryAtoms, studioPortLayer } from "@lisca/client/atoms";
import { createLiscaAppBootstrap } from "@lisca/client/bootstrap";

import { studioClient } from "../api/studio-port";

const bootstrap = createLiscaAppBootstrap(studioPortLayer(studioClient));

export const studioRuntime = bootstrap.runtime;

export const studioQueryAtoms = createStudioQueryAtoms(bootstrap.runtime);

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

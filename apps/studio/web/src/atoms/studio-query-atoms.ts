import type { AnnotationLabel, RoiWorkspaceScan, WorkspaceScan } from "@lisca/contracts";
import {
  createAppRuntime,
  createStudioQueryAtoms,
  invalidateAfter,
  ReactivityKeys,
} from "@lisca/client/atoms";
import { Atom, AsyncResult as Result } from "effect/unstable/reactivity";
import { Effect } from "effect";

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

/** Drop the cached ROI scan so Annotate reloads after a crop. */
export const invalidateRoiWorkspaceAtom = studioRuntime.fn((workspacePath: string) =>
  invalidateAfter(Effect.void, [ReactivityKeys.roiWorkspace(workspacePath)]),
);

export const scanIdleAtom = Atom.make(Result.initial<WorkspaceScan>());
export const roiScanIdleAtom = Atom.make(Result.initial<RoiWorkspaceScan>());
export const labelsIdleAtom = Atom.make(Result.initial<AnnotationLabel[]>());

export { Atom, Result };

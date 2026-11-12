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

/** Drop cached ROI scan, labels, and analysis results so Studio reloads after crops or agent writes. */
export const invalidateRoiWorkspaceAtom = studioRuntime.fn((workspacePath: string) =>
  invalidateAfter(Effect.void, [
    ReactivityKeys.roiWorkspace(workspacePath),
    ReactivityKeys.annotationLabels(workspacePath),
    ReactivityKeys.analysisResults(workspacePath),
  ]),
);

export const scanIdleAtom = Atom.make(Result.initial<WorkspaceScan>());
export const roiScanIdleAtom = Atom.make(Result.initial<RoiWorkspaceScan>());
export const labelsIdleAtom = Atom.make(Result.initial<AnnotationLabel[]>());

export { Atom, Result };

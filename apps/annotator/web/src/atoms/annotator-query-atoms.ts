import type { AnnotationLabel, RoiWorkspaceScan } from "@lisca/contracts";
import { Atom, AsyncResult as Result } from "effect/unstable/reactivity";

import { createAnnotatorQueryAtoms, createAppRuntime } from "@lisca/client/atoms";

import { annotatorClient } from "../api/annotator-port";

export const annotatorRuntime = createAppRuntime();

export const annotatorQueryAtoms = createAnnotatorQueryAtoms(annotatorRuntime, annotatorClient);

export const {
  roiWorkspaceScanAtom,
  annotationLabelsAtom,
  saveAnnotationLabelsAtom,
  saveRoiFrameAnnotationAtom,
} = annotatorQueryAtoms;

export const roiScanIdleAtom = Atom.make(Result.initial<RoiWorkspaceScan>());
export const labelsIdleAtom = Atom.make(Result.initial<AnnotationLabel[]>());

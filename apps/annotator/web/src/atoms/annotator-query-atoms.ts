import type { AnnotationLabel, RoiWorkspaceScan } from "@lisca/contracts";
import { Atom, Result } from "@effect-atom/atom-react";

import {
  annotatorPortLayer,
  createAnnotatorQueryAtoms,
  createAppRuntime,
} from "@lisca/client/atoms";

import { ensureAnnotatorPort } from "../api/annotator-port";

export const annotatorRuntime = createAppRuntime(annotatorPortLayer(ensureAnnotatorPort()));

export const annotatorQueryAtoms = createAnnotatorQueryAtoms(annotatorRuntime);

export const {
  roiWorkspaceScanAtom,
  annotationLabelsAtom,
  saveAnnotationLabelsAtom,
  saveRoiFrameAnnotationAtom,
} = annotatorQueryAtoms;

export const roiScanIdleAtom = Atom.make(Result.initial<RoiWorkspaceScan>());
export const labelsIdleAtom = Atom.make(Result.initial<AnnotationLabel[]>());

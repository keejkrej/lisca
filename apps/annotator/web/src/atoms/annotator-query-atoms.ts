import type { AnnotationLabel, RoiWorkspaceScan } from "@lisca/contracts";
import { Atom, Result } from "@effect-atom/atom-solid";

import { annotatorPortLayer, createAnnotatorQueryAtoms } from "@lisca/client/atoms";
import { createLiscaAppBootstrap } from "@lisca/client/bootstrap";

import { annotatorClient } from "../api/annotator-port";

const bootstrap = createLiscaAppBootstrap(annotatorPortLayer(annotatorClient));

export const annotatorRuntime = bootstrap.runtime;

export const annotatorQueryAtoms = createAnnotatorQueryAtoms(bootstrap.runtime);

export const {
  roiWorkspaceScanAtom,
  annotationLabelsAtom,
  saveAnnotationLabelsAtom,
  saveRoiFrameAnnotationAtom,
} = annotatorQueryAtoms;

export const roiScanIdleAtom = Atom.make(Result.initial<RoiWorkspaceScan>());
export const labelsIdleAtom = Atom.make(Result.initial<AnnotationLabel[]>());

import type {
  AnnotationLabel,
  RoiFrameAnnotation,
  RoiFrameAnnotationPayload,
  RoiFrameRequest,
  RoiWorkspaceScan,
} from "@lisca/contracts";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { Effect } from "effect";

import type { ClientError } from "../infra/client-error";
import type { ClientEffect } from "../infra/runtime";
import { invalidateAfter, ReactivityKeys } from "./reactivity";
import { cacheSessionQuery, type AppRuntime } from "./runtime";

/** Port surface shared by the annotator and studio annotation query atoms. */
export type AnnotateQueryPort = {
  scanRoiWorkspace(workspacePath: string): ClientEffect<RoiWorkspaceScan>;
  loadLabels(workspacePath: string): ClientEffect<AnnotationLabel[]>;
  saveLabels(workspacePath: string, labels: AnnotationLabel[]): ClientEffect<AnnotationLabel[]>;
  saveRoiFrameAnnotation(
    workspacePath: string,
    request: RoiFrameRequest,
    annotation: RoiFrameAnnotationPayload,
  ): ClientEffect<RoiFrameAnnotation>;
};

export type SaveAnnotationLabelsInput = {
  workspacePath: string;
  labels: AnnotationLabel[];
};

export type SaveRoiFrameAnnotationInput = {
  workspacePath: string;
  request: RoiFrameRequest;
  annotation: RoiFrameAnnotationPayload;
};

export type AnnotateQueryAtoms = {
  roiWorkspaceScanAtom: (
    workspacePath: string,
  ) => Atom.Atom<AsyncResult.AsyncResult<RoiWorkspaceScan, ClientError>>;
  annotationLabelsAtom: (
    workspacePath: string,
  ) => Atom.Atom<AsyncResult.AsyncResult<AnnotationLabel[], ClientError>>;
  saveAnnotationLabelsAtom: Atom.AtomResultFn<
    SaveAnnotationLabelsInput,
    AnnotationLabel[],
    ClientError
  >;
  saveRoiFrameAnnotationAtom: Atom.AtomResultFn<
    SaveRoiFrameAnnotationInput,
    RoiFrameAnnotation,
    ClientError
  >;
};

export function createAnnotateQueryAtoms(
  runtime: AppRuntime,
  port: AnnotateQueryPort,
): AnnotateQueryAtoms {
  const roiWorkspaceScanAtom = Atom.family((workspacePath: string) =>
    runtime
      .atom(Effect.suspend(() => port.scanRoiWorkspace(workspacePath)))
      .pipe(Atom.withReactivity([ReactivityKeys.roiWorkspace(workspacePath)]), cacheSessionQuery),
  );

  const annotationLabelsAtom = Atom.family((workspacePath: string) =>
    runtime
      .atom(Effect.suspend(() => port.loadLabels(workspacePath)))
      .pipe(
        Atom.withReactivity([ReactivityKeys.annotationLabels(workspacePath)]),
        cacheSessionQuery,
      ),
  );

  const saveAnnotationLabelsAtom = runtime.fn(
    ({ workspacePath, labels }: SaveAnnotationLabelsInput) =>
      invalidateAfter(port.saveLabels(workspacePath, labels), [
        ReactivityKeys.annotationLabels(workspacePath),
      ]),
  );

  const saveRoiFrameAnnotationAtom = runtime.fn(
    ({ workspacePath, request, annotation }: SaveRoiFrameAnnotationInput) =>
      invalidateAfter(port.saveRoiFrameAnnotation(workspacePath, request, annotation), [
        ReactivityKeys.roiWorkspace(workspacePath),
      ]),
  );

  return {
    roiWorkspaceScanAtom,
    annotationLabelsAtom,
    saveAnnotationLabelsAtom,
    saveRoiFrameAnnotationAtom,
  };
}

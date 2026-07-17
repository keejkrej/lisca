import type {
  AnnotationLabel,
  RoiFrameAnnotation,
  RoiFrameAnnotationPayload,
  RoiFrameRequest,
  RoiWorkspaceScan,
} from "@lisca/contracts";
import { Atom, type Result } from "@effect-atom/atom-solid";
import { type Context, Effect } from "effect";

import type { ClientError } from "../infra/client-error";
import type { ClientEffect } from "../infra/runtime";
import { invalidateAfter, ReactivityKeys } from "./reactivity";
import type { AppRuntime } from "./runtime";

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
  ) => Atom.Atom<Result.Result<RoiWorkspaceScan, ClientError>>;
  annotationLabelsAtom: (
    workspacePath: string,
  ) => Atom.Atom<Result.Result<AnnotationLabel[], ClientError>>;
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

export function createAnnotateQueryAtoms<Id, Port extends AnnotateQueryPort>(
  runtime: AppRuntime<Id>,
  PortTag: Context.Tag<Id, Port>,
): AnnotateQueryAtoms {
  const roiWorkspaceScanAtom = Atom.family((workspacePath: string) =>
    runtime
      .atom(
        Effect.gen(function* () {
          const port = yield* PortTag;
          return yield* port.scanRoiWorkspace(workspacePath);
        }),
      )
      .pipe(Atom.keepAlive, Atom.withReactivity([ReactivityKeys.roiWorkspace(workspacePath)])),
  );

  const annotationLabelsAtom = Atom.family((workspacePath: string) =>
    runtime
      .atom(
        Effect.gen(function* () {
          const port = yield* PortTag;
          return yield* port.loadLabels(workspacePath);
        }),
      )
      .pipe(Atom.keepAlive, Atom.withReactivity([ReactivityKeys.annotationLabels(workspacePath)])),
  );

  const saveAnnotationLabelsAtom = runtime.fn(
    Effect.fnUntraced(function* ({ workspacePath, labels }: SaveAnnotationLabelsInput) {
      const port = yield* PortTag;
      return yield* invalidateAfter(port.saveLabels(workspacePath, labels), [
        ReactivityKeys.annotationLabels(workspacePath),
      ]);
    }),
  );

  const saveRoiFrameAnnotationAtom = runtime.fn(
    Effect.fnUntraced(function* ({
      workspacePath,
      request,
      annotation,
    }: SaveRoiFrameAnnotationInput) {
      const port = yield* PortTag;
      return yield* invalidateAfter(
        port.saveRoiFrameAnnotation(workspacePath, request, annotation),
        [ReactivityKeys.roiWorkspace(workspacePath)],
      );
    }),
  );

  return {
    roiWorkspaceScanAtom,
    annotationLabelsAtom,
    saveAnnotationLabelsAtom,
    saveRoiFrameAnnotationAtom,
  };
}

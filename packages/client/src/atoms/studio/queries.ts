import type {
  AnnotationLabel,
  RoiFrameAnnotation,
  RoiWorkspaceScan,
  WorkspaceScan,
} from "@lisca/contracts";
import { Atom, type Result } from "@effect-atom/atom-react";
import { Effect } from "effect";

import type { ClientError } from "../../infra/client-error";
import { StudioPortService } from "../ports";
import { invalidateAfter, ReactivityKeys } from "../reactivity";
import type { AppRuntime } from "../runtime";
import { createSourceQueryAtoms } from "../source-queries";
import type { SaveAnnotationLabelsInput, SaveRoiFrameAnnotationInput } from "../annotator/queries";

export type StudioQueryAtoms = {
  scanSourceAtom: (sourceKey: string) => Atom.Atom<Result.Result<WorkspaceScan, ClientError>>;
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

export function createStudioQueryAtoms(runtime: AppRuntime<StudioPortService>): StudioQueryAtoms {
  const { scanSourceAtom } = createSourceQueryAtoms(runtime, StudioPortService);

  const roiWorkspaceScanAtom = Atom.family((workspacePath: string) =>
    runtime
      .atom(
        Effect.gen(function* () {
          const port = yield* StudioPortService;
          return yield* port.scanRoiWorkspace(workspacePath);
        }),
      )
      .pipe(Atom.keepAlive, Atom.withReactivity([ReactivityKeys.roiWorkspace(workspacePath)])),
  );

  const annotationLabelsAtom = Atom.family((workspacePath: string) =>
    runtime
      .atom(
        Effect.gen(function* () {
          const port = yield* StudioPortService;
          return yield* port.loadLabels(workspacePath);
        }),
      )
      .pipe(Atom.keepAlive, Atom.withReactivity([ReactivityKeys.annotationLabels(workspacePath)])),
  );

  const saveAnnotationLabelsAtom = runtime.fn(
    Effect.fnUntraced(function* ({ workspacePath, labels }: SaveAnnotationLabelsInput) {
      const port = yield* StudioPortService;
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
      const port = yield* StudioPortService;
      return yield* invalidateAfter(
        port.saveRoiFrameAnnotation(workspacePath, request, annotation),
        [ReactivityKeys.roiWorkspace(workspacePath)],
      );
    }),
  );

  return {
    scanSourceAtom,
    roiWorkspaceScanAtom,
    annotationLabelsAtom,
    saveAnnotationLabelsAtom,
    saveRoiFrameAnnotationAtom,
  };
}

export type { WorkspaceScan, RoiWorkspaceScan };
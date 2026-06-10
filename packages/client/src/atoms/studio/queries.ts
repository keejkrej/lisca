import type { AutoExcludePreviewRequest, AutoExcludePreviewResponse, RoiWorkspaceScan, WorkspaceScan } from "@lisca/contracts";
import { Atom, type Result } from "@effect-atom/atom-react";
import { Effect } from "effect";

import type { ClientError } from "../../infra/client-error";
import { StudioPortService } from "../ports";
import { ReactivityKeys } from "../reactivity";
import type { AppRuntime } from "../runtime";
import { createSourceQueryAtoms } from "../source-queries";

export type StudioQueryAtoms = {
  scanSourceAtom: (sourceKey: string) => Atom.Atom<Result.Result<WorkspaceScan, ClientError>>;
  roiWorkspaceScanAtom: (
    workspacePath: string,
  ) => Atom.Atom<Result.Result<RoiWorkspaceScan, ClientError>>;
  autoExcludePreviewAtom: Atom.AtomResultFn<
    AutoExcludePreviewRequest,
    AutoExcludePreviewResponse,
    ClientError
  >;
};

export function createStudioQueryAtoms(runtime: AppRuntime<StudioPortService>): StudioQueryAtoms {
  const { scanSourceAtom, autoExcludePreviewAtom } = createSourceQueryAtoms(
    runtime,
    StudioPortService,
  );

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

  return {
    scanSourceAtom,
    roiWorkspaceScanAtom,
    autoExcludePreviewAtom,
  };
}

export type { WorkspaceScan, RoiWorkspaceScan, AutoExcludePreviewResponse };

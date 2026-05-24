import type {
  AlignerSource,
  AutoExcludePreviewRequest,
  AutoExcludePreviewResponse,
  RoiWorkspaceScan,
  WorkspaceScan,
} from "@lisca/contracts";
import { Atom, type Result } from "@effect-atom/atom-react";
import { Effect } from "effect";

import type { ClientError } from "../../client-error.ts";
import { StudioPortService } from "../ports.ts";
import { ReactivityKeys } from "../reactivity.ts";
import type { AppRuntime } from "../runtime.ts";

export type StudioQueryAtoms = {
  scanSourceAtom: (sourceKey: string) => Atom.Atom<Result.Result<WorkspaceScan, ClientError>>;
  roiWorkspaceScanAtom: (workspacePath: string) => Atom.Atom<Result.Result<RoiWorkspaceScan, ClientError>>;
  autoExcludePreviewAtom: Atom.AtomResultFn<
    AutoExcludePreviewRequest,
    AutoExcludePreviewResponse,
    ClientError
  >;
};

export function createStudioQueryAtoms(runtime: AppRuntime<StudioPortService>): StudioQueryAtoms {
  const scanSourceAtom = Atom.family((sourceKey: string) =>
    runtime
      .atom(
        Effect.gen(function* () {
          const port = yield* StudioPortService;
          const source = JSON.parse(sourceKey) as AlignerSource;
          return yield* port.scanSource(source);
        }),
      )
      .pipe(
        Atom.keepAlive,
        Atom.withReactivity([ReactivityKeys.scanSource(sourceKey)]),
      ),
  );

  const roiWorkspaceScanAtom = Atom.family((workspacePath: string) =>
    runtime
      .atom(
        Effect.gen(function* () {
          const port = yield* StudioPortService;
          return yield* port.scanRoiWorkspace(workspacePath);
        }),
      )
      .pipe(
        Atom.keepAlive,
        Atom.withReactivity([ReactivityKeys.roiWorkspace(workspacePath)]),
      ),
  );

  const autoExcludePreviewAtom = runtime.fn(
    Effect.fnUntraced(function* (request: AutoExcludePreviewRequest) {
      const port = yield* StudioPortService;
      return yield* port.autoExcludePreview(request);
    }),
  );

  return {
    scanSourceAtom,
    roiWorkspaceScanAtom,
    autoExcludePreviewAtom,
  };
}

export type { WorkspaceScan, RoiWorkspaceScan, AutoExcludePreviewResponse };

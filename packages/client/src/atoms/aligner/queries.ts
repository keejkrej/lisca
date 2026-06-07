import type {
  AutoExcludePreviewRequest,
  AutoExcludePreviewResponse,
  WorkspaceScan,
} from "@lisca/contracts";
import { Atom, type Result } from "@effect-atom/atom-react";
import { Effect } from "effect";

import { AlignerPortService } from "../ports.ts";
import { ReactivityKeys } from "../reactivity.ts";
import type { AppRuntime } from "../runtime.ts";
import { createSourceQueryAtoms } from "../source-queries.ts";
import type { ClientError } from "../../client-error.ts";

export type AlignerQueryAtoms = {
  scanSourceAtom: (sourceKey: string) => Atom.Atom<Result.Result<WorkspaceScan, ClientError>>;
  savedBboxPositionsAtom: (workspacePath: string) => Atom.Atom<Result.Result<number[], ClientError>>;
  autoExcludePreviewAtom: Atom.AtomResultFn<
    AutoExcludePreviewRequest,
    AutoExcludePreviewResponse,
    ClientError
  >;
};

export function createAlignerQueryAtoms(runtime: AppRuntime<AlignerPortService>): AlignerQueryAtoms {
  const { scanSourceAtom, autoExcludePreviewAtom } = createSourceQueryAtoms(
    runtime,
    AlignerPortService,
  );

  const savedBboxPositionsAtom = Atom.family((workspacePath: string) =>
    runtime
      .atom(
        Effect.gen(function* () {
          const port = yield* AlignerPortService;
          return yield* port.listSavedBboxPositions(workspacePath);
        }),
      )
      .pipe(
        Atom.keepAlive,
        Atom.withReactivity([ReactivityKeys.savedBboxPositions(workspacePath)]),
      ),
  );

  return {
    scanSourceAtom,
    savedBboxPositionsAtom,
    autoExcludePreviewAtom,
  };
}

export type ScanSourceAtom = AlignerQueryAtoms["scanSourceAtom"];
export type SavedBboxPositionsAtom = AlignerQueryAtoms["savedBboxPositionsAtom"];

export type { WorkspaceScan, AutoExcludePreviewResponse };

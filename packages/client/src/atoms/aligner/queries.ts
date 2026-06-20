import type {
  AutoExcludePreviewRequest,
  AutoExcludePreviewResponse,
  SavedAlignState,
  SaveBboxResponse,
  WorkspaceScan,
} from "@lisca/contracts";
import { Atom, type Result } from "@effect-atom/atom-react";
import { Effect } from "effect";

import type { ClientError } from "../../infra/client-error";
import { AlignerPortService } from "../ports";
import { invalidateAfter, ReactivityKeys } from "../reactivity";
import type { AppRuntime } from "../runtime";
import { createSourceQueryAtoms } from "../source-queries";

export type SaveBboxInput = {
  workspacePath: string;
  pos: number;
  csv: string;
  alignState: SavedAlignState;
};

export type AlignerQueryAtoms = {
  scanSourceAtom: (sourceKey: string) => Atom.Atom<Result.Result<WorkspaceScan, ClientError>>;
  savedBboxPositionsAtom: (
    workspacePath: string,
  ) => Atom.Atom<Result.Result<number[], ClientError>>;
  autoExcludePreviewAtom: Atom.AtomResultFn<
    AutoExcludePreviewRequest,
    AutoExcludePreviewResponse,
    ClientError
  >;
  saveBboxAtom: Atom.AtomResultFn<SaveBboxInput, SaveBboxResponse, ClientError>;
};

export function createAlignerQueryAtoms(
  runtime: AppRuntime<AlignerPortService>,
): AlignerQueryAtoms {
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

  const saveBboxAtom = runtime.fn(
    Effect.fnUntraced(function* ({ workspacePath, pos, csv, alignState }: SaveBboxInput) {
      const port = yield* AlignerPortService;
      return yield* invalidateAfter(port.saveBbox(workspacePath, pos, csv, alignState), [
        ReactivityKeys.savedBboxPositions(workspacePath),
      ]);
    }),
  );

  return {
    scanSourceAtom,
    savedBboxPositionsAtom,
    autoExcludePreviewAtom,
    saveBboxAtom,
  };
}

export type ScanSourceAtom = AlignerQueryAtoms["scanSourceAtom"];
export type SavedBboxPositionsAtom = AlignerQueryAtoms["savedBboxPositionsAtom"];

export type { WorkspaceScan, AutoExcludePreviewResponse };

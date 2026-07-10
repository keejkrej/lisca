import type { AlignerSource, WorkspaceScan } from "@lisca/contracts";
import { Atom, type Result } from "@effect-atom/atom-solid";
import { type Context, Effect } from "effect";

import type { ClientError } from "../infra/client-error";
import type { ClientEffect } from "../infra/runtime";
import { ReactivityKeys } from "./reactivity";
import type { AppRuntime } from "./runtime";

/** Port surface shared by the aligner and studio source-scan query atoms. */
export type SourceQueryPort = {
  scanSource(source: AlignerSource): ClientEffect<WorkspaceScan>;
};

export type SourceQueryAtoms = {
  scanSourceAtom: (sourceKey: string) => Atom.Atom<Result.Result<WorkspaceScan, ClientError>>;
};

/**
 * Source-scan query atoms, parameterized by the port `Context.Tag`.
 * The aligner and studio runtimes share one definition.
 */
export function createSourceQueryAtoms<Id, Port extends SourceQueryPort>(
  runtime: AppRuntime<Id>,
  PortTag: Context.Tag<Id, Port>,
): SourceQueryAtoms {
  const scanSourceAtom = Atom.family((sourceKey: string) =>
    runtime
      .atom(
        Effect.gen(function* () {
          const port = yield* PortTag;
          const source = JSON.parse(sourceKey) as AlignerSource;
          return yield* port.scanSource(source);
        }),
      )
      .pipe(Atom.keepAlive, Atom.withReactivity([ReactivityKeys.scanSource(sourceKey)])),
  );

  return { scanSourceAtom };
}
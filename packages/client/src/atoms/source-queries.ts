import type { AlignerSource, WorkspaceScan } from "@lisca/contracts";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { Effect } from "effect";

import type { ClientError } from "../infra/client-error";
import type { ClientEffect } from "../infra/runtime";
import { ReactivityKeys } from "./reactivity";
import { cacheSessionQuery, type AppRuntime } from "./runtime";

/** Port surface shared by the aligner and studio source-scan query atoms. */
export type SourceQueryPort = {
  scanSource(source: AlignerSource): ClientEffect<WorkspaceScan>;
};

export type SourceQueryAtoms = {
  scanSourceAtom: (
    sourceKey: string,
  ) => Atom.Atom<AsyncResult.AsyncResult<WorkspaceScan, ClientError>>;
};

/** Source-scan query atoms shared by the aligner and studio runtimes. */
export function createSourceQueryAtoms(
  runtime: AppRuntime,
  port: SourceQueryPort,
): SourceQueryAtoms {
  const scanSourceAtom = Atom.family((sourceKey: string) =>
    runtime
      .atom(Effect.suspend(() => port.scanSource(JSON.parse(sourceKey) as AlignerSource)))
      .pipe(Atom.withReactivity([ReactivityKeys.scanSource(sourceKey)]), cacheSessionQuery),
  );

  return { scanSourceAtom };
}

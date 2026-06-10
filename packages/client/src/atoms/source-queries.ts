import type { AlignerSource, AutoExcludePreviewRequest, AutoExcludePreviewResponse, WorkspaceScan } from "@lisca/contracts";
import { Atom, type Result } from "@effect-atom/atom-react";
import { type Context, Effect } from "effect";

import type { ClientError } from "../infra/client-error";
import type { ClientEffect } from "../infra/runtime";
import { ReactivityKeys } from "./reactivity";
import type { AppRuntime } from "./runtime";

/** Port surface shared by the aligner and studio source-scan query atoms. */
export type SourceQueryPort = {
  scanSource(source: AlignerSource): ClientEffect<WorkspaceScan>;
  autoExcludePreview(request: AutoExcludePreviewRequest): ClientEffect<AutoExcludePreviewResponse>;
};

export type SourceQueryAtoms = {
  scanSourceAtom: (sourceKey: string) => Atom.Atom<Result.Result<WorkspaceScan, ClientError>>;
  autoExcludePreviewAtom: Atom.AtomResultFn<
    AutoExcludePreviewRequest,
    AutoExcludePreviewResponse,
    ClientError
  >;
};

/**
 * Source-scan and auto-exclude query atoms, parameterized by the port
 * `Context.Tag`. The aligner and studio runtimes share one definition.
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

  const autoExcludePreviewAtom = runtime.fn(
    Effect.fnUntraced(function* (request: AutoExcludePreviewRequest) {
      const port = yield* PortTag;
      return yield* port.autoExcludePreview(request);
    }),
  );

  return { scanSourceAtom, autoExcludePreviewAtom };
}

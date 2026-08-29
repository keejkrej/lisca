import type { AnalysisProgress } from "@lisca/contracts";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { Effect } from "effect";

import type { StudioDataPort } from "../../ports/types";
import type { ClientError } from "../../infra/client-error";
import { ReactivityKeys } from "../reactivity";
import { cacheSessionQuery, type AppRuntime } from "../runtime";

export type AnalysisCsvInput = {
  workspacePath: string;
  filePath: string;
  inlineCsv?: string | null;
};

export function analysisCsvInputKey(input: AnalysisCsvInput): string {
  return JSON.stringify(input);
}

export type StudioAnalysisAtoms = {
  analysisResultsAtom: (
    workspacePath: string,
  ) => Atom.Atom<AsyncResult.AsyncResult<AnalysisProgress | null, ClientError>>;
  analysisCsvAtom: (inputKey: string) => Atom.Atom<AsyncResult.AsyncResult<string, ClientError>>;
};

export function createStudioAnalysisAtoms(
  runtime: AppRuntime,
  port: StudioDataPort,
): StudioAnalysisAtoms {
  const analysisResultsAtom = Atom.family((workspacePath: string) =>
    runtime
      .atom(Effect.suspend(() => port.getAnalysisResults(workspacePath)))
      .pipe(
        Atom.withReactivity([ReactivityKeys.analysisResults(workspacePath)]),
        cacheSessionQuery,
      ),
  );

  const analysisCsvAtom = Atom.family((inputKey: string) => {
    const input = JSON.parse(inputKey) as AnalysisCsvInput;
    const inline = input.inlineCsv?.trim();
    return runtime
      .atom(
        inline ? Effect.succeed(inline) : Effect.suspend(() => port.readTextFile(input.filePath)),
      )
      .pipe(
        Atom.withReactivity([ReactivityKeys.analysisCsv(input.workspacePath, input.filePath)]),
        cacheSessionQuery,
      );
  });

  return {
    analysisResultsAtom,
    analysisCsvAtom,
  };
}

export type { AnalysisProgress };

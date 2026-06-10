import type { AnalysisProgress } from "@lisca/contracts";
import { Atom, type Result } from "@effect-atom/atom-react";
import { Effect } from "effect";

import type { ClientError } from "../../infra/client-error.ts";
import { StudioPortService } from "../ports.ts";
import { ReactivityKeys } from "../reactivity.ts";
import type { AppRuntime } from "../runtime.ts";

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
  ) => Atom.Atom<Result.Result<AnalysisProgress | null, ClientError>>;
  analysisCsvAtom: (inputKey: string) => Atom.Atom<Result.Result<string, ClientError>>;
};

export function createStudioAnalysisAtoms(
  runtime: AppRuntime<StudioPortService>,
): StudioAnalysisAtoms {
  const analysisResultsAtom = Atom.family((workspacePath: string) =>
    runtime
      .atom(
        Effect.gen(function* () {
          const port = yield* StudioPortService;
          return yield* port.getAnalysisResults(workspacePath);
        }),
      )
      .pipe(Atom.keepAlive, Atom.withReactivity([ReactivityKeys.analysisResults(workspacePath)])),
  );

  const analysisCsvAtom = Atom.family((inputKey: string) => {
    const input = JSON.parse(inputKey) as AnalysisCsvInput;
    return runtime
      .atom(
        Effect.gen(function* () {
          const inline = input.inlineCsv?.trim();
          if (inline) return inline;
          const port = yield* StudioPortService;
          return yield* port.readTextFile(input.filePath);
        }),
      )
      .pipe(
        Atom.keepAlive,
        Atom.withReactivity([ReactivityKeys.analysisCsv(input.workspacePath, input.filePath)]),
      );
  });

  return {
    analysisResultsAtom,
    analysisCsvAtom,
  };
}

export type { AnalysisProgress };

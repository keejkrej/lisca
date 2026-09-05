import type { AnalysisProgress, AnalysisStartRequest } from "@lisca/contracts";
import { Atom, AsyncResult as Result } from "effect/unstable/reactivity";

import { createStudioAnalysisAtoms, invalidateAfter, ReactivityKeys } from "@lisca/client/atoms";
import { studioClient } from "../api/studio-port";
import { studioRuntime } from "./studio-query-atoms";

export const studioAnalysisAtoms = createStudioAnalysisAtoms(studioRuntime, studioClient);

export const { analysisResultsAtom, analysisCsvAtom } = studioAnalysisAtoms;

export const analysisResultsIdleAtom = Atom.make(Result.initial<AnalysisProgress | null>());

export const startAnalysisMutationAtom = studioRuntime.fn((input: AnalysisStartRequest) =>
  invalidateAfter(studioClient.startAnalysis(input), [
    ReactivityKeys.analysisResults(input.workspacePath),
  ]),
);

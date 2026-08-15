import type { AnalysisProgress } from "@lisca/contracts";
import { Atom, Result } from "@effect-atom/atom-solid";

import { createStudioAnalysisAtoms } from "@lisca/client/atoms";
import { studioRuntime } from "./studio-query-atoms";

export const studioAnalysisAtoms = createStudioAnalysisAtoms(studioRuntime);

export const { analysisResultsAtom, analysisCsvAtom } = studioAnalysisAtoms;

export const analysisResultsIdleAtom = Atom.make(Result.initial<AnalysisProgress | null>());

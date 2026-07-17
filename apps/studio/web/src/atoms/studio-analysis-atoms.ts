import type { AnalysisProgress } from "@lisca/contracts";
import { Atom, Result } from "@effect-atom/atom-solid";
import { Effect } from "effect";

import {
  analysisPanelsParamsKey,
  parseCsvFile,
  parsePanelGroups,
  slideChannelLabelsCacheKey,
  type AnalysisPanelsParams,
  type ResultPanel,
} from "@lisca/analysis";
import { createStudioAnalysisAtoms, ReactivityKeys, StudioPortService } from "@lisca/client/atoms";
import { studioRuntime } from "./studio-query-atoms";

export const studioAnalysisAtoms = createStudioAnalysisAtoms(studioRuntime);

export const { analysisResultsAtom, analysisCsvAtom } = studioAnalysisAtoms;

export const analysisResultsIdleAtom = Atom.make(Result.initial<AnalysisProgress | null>());

function loadAnalysisPanelsEffect(params: AnalysisPanelsParams) {
  return Effect.gen(function* () {
    const inline = params.file.csv?.trim();
    let csv: string;
    if (inline) {
      csv = inline;
    } else {
      const port = yield* StudioPortService;
      csv = yield* port.readTextFile(params.file.path);
    }
    if (!csv.trim()) {
      return yield* Effect.fail(new Error(`CSV file is empty: ${params.file.fileName}`));
    }
    const parsed = parseCsvFile({ ...params.file, csv });
    if (!parsed) return [] as ResultPanel[];
    return parsePanelGroups(parsed, params.timeseriesXScale, params.slideChannelLabels);
  });
}

export const analysisPanelsAtom = Atom.family((paramsKey: string) => {
  const params = JSON.parse(paramsKey) as AnalysisPanelsParams;
  return studioRuntime
    .atom(loadAnalysisPanelsEffect(params))
    .pipe(
      Atom.keepAlive,
      Atom.withReactivity([
        ReactivityKeys.analysisPanels(
          params.workspacePath,
          params.file.path,
          params.timeseriesXScale,
          params.slideChannelLabelsKey,
        ),
      ]),
    );
});

export const loadAnalysisPanelsAtom = studioRuntime.fn((params: AnalysisPanelsParams) =>
  loadAnalysisPanelsEffect(params),
);

export { analysisPanelsParamsKey, slideChannelLabelsCacheKey };

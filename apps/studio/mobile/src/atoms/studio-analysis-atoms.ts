import type { AnalysisProgress, StudioAnalysisCsvFile } from "@lisca/contracts";
import { Atom, Result } from "@effect-atom/atom-react";
import { Effect } from "effect";

import {
  analysisCsvInputKey,
  createStudioAnalysisAtoms,
  ReactivityKeys,
  StudioPortService,
} from "@lisca/client/atoms";

import {
  parseCsvFile,
  parsePanelGroups,
  type ResultPanel,
  type SlideChannelLabels,
} from "@lisca/studio-result";
import { studioRuntime } from "./studio-query-atoms";

export const studioAnalysisAtoms = createStudioAnalysisAtoms(studioRuntime);

export const { analysisResultsAtom, analysisCsvAtom } = studioAnalysisAtoms;

export const analysisResultsIdleAtom = Atom.make(Result.initial<AnalysisProgress | null>());

export type AnalysisPanelsParams = {
  workspacePath: string;
  file: StudioAnalysisCsvFile;
  timeseriesXScale: number;
  slideChannelLabels: SlideChannelLabels;
  slideChannelLabelsKey: string;
};

export function analysisPanelsParamsKey(params: AnalysisPanelsParams): string {
  return JSON.stringify({
    workspacePath: params.workspacePath,
    filePath: params.file.path,
    inlineCsv: params.file.csv ?? null,
    timeseriesXScale: params.timeseriesXScale,
    slideChannelLabelsKey: params.slideChannelLabelsKey,
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

export const loadAnalysisPanelsAtom = studioRuntime.fn((params: AnalysisPanelsParams) =>
  loadAnalysisPanelsEffect(params),
);

export function slideChannelLabelsCacheKey(slideChannelLabels: SlideChannelLabels): string {
  return JSON.stringify(slideChannelLabels);
}

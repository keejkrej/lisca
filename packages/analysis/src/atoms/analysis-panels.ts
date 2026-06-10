import type { AnalysisProgress, StudioAnalysisCsvFile } from "@lisca/contracts";
import { Atom, Result } from "@effect-atom/atom-react";
import { Effect } from "effect";

import {
  createStudioAnalysisAtoms,
  ReactivityKeys,
  StudioPortService,
} from "@lisca/client/atoms";
import type { AppRuntime } from "@lisca/client/atoms/runtime";

import {
  parseCsvFile,
  parsePanelGroups,
  type ResultPanel,
  type SlideChannelLabels,
} from "../shared/panels";
import {
  analysisPanelsParamsKey,
  slideChannelLabelsCacheKey,
  type AnalysisPanelsParams,
} from "../shared/queries";

export function createAnalysisPanelAtoms(runtime: AppRuntime<StudioPortService>) {
  const studioAnalysisAtoms = createStudioAnalysisAtoms(runtime);

  const { analysisResultsAtom, analysisCsvAtom } = studioAnalysisAtoms;

  const analysisResultsIdleAtom = Atom.make(Result.initial<AnalysisProgress | null>());

  const analysisPanelsAtom = Atom.family((paramsKey: string) => {
    const params = JSON.parse(paramsKey) as AnalysisPanelsParams;
    return runtime
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

  const loadAnalysisPanelsAtom = runtime.fn((params: AnalysisPanelsParams) =>
    loadAnalysisPanelsEffect(params),
  );

  return {
    studioAnalysisAtoms,
    analysisResultsAtom,
    analysisCsvAtom,
    analysisResultsIdleAtom,
    analysisPanelsAtom,
    loadAnalysisPanelsAtom,
    analysisPanelsParamsKey,
    slideChannelLabelsCacheKey,
  };
}

export type { AnalysisPanelsParams, SlideChannelLabels, StudioAnalysisCsvFile };

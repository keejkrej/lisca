import { createAnalysisPanelAtoms } from "@lisca/analysis";
import { studioRuntime } from "./studio-query-atoms";

export const {
  studioAnalysisAtoms,
  analysisResultsAtom,
  analysisCsvAtom,
  analysisResultsIdleAtom,
  analysisPanelsAtom,
  loadAnalysisPanelsAtom,
  analysisPanelsParamsKey,
  slideChannelLabelsCacheKey,
} = createAnalysisPanelAtoms(studioRuntime);

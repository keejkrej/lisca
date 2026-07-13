import type { StudioAnalysisCsvFile } from "@lisca/contracts";

import {
  collectDisplayedParameterPanels,
  collectTimeseriesPanels,
  filterResultFilesBySection,
  type ResultPanel,
} from "../shared/panels";

export async function loadAllResultPlotPanels(
  analysisResultFiles: StudioAnalysisCsvFile[],
  loadPanelsForFile: (file: StudioAnalysisCsvFile) => Promise<ResultPanel[]>,
): Promise<{ timeseriesPanels: ResultPanel[]; parameterPanels: ResultPanel[] }> {
  const timeseriesFiles = filterResultFilesBySection(analysisResultFiles, "timeseries");
  const parameterFiles = filterResultFilesBySection(analysisResultFiles, "parameters");

  const [timeseriesByFile, parametersByFile] = await Promise.all([
    Promise.all(timeseriesFiles.map((file) => loadPanelsForFile(file))),
    Promise.all(parameterFiles.map((file) => loadPanelsForFile(file))),
  ]);

  return {
    timeseriesPanels: collectTimeseriesPanels(timeseriesByFile),
    parameterPanels: collectDisplayedParameterPanels(parametersByFile),
  };
}

import type { StudioAnalysisCsvFile } from "@lisca/contracts";

import {
  collectDisplayedParameterPanels,
  collectTimeseriesPanels,
  type ResultPanel,
  type TimeseriesPanel,
} from "../shared/panels";

export async function loadAllResultPlotPanels(
  analysisResultFiles: StudioAnalysisCsvFile[],
  loadPanelsForFile: (file: StudioAnalysisCsvFile) => Promise<ResultPanel[]>,
): Promise<{ timeseriesPanels: TimeseriesPanel[]; parameterPanels: ResultPanel[] }> {
  const timeseriesFiles = analysisResultFiles.filter((file) => file.kind === "timeseries");
  const parameterFiles = analysisResultFiles.filter((file) => file.kind !== "timeseries");

  const [timeseriesByFile, parametersByFile] = await Promise.all([
    Promise.all(timeseriesFiles.map((file) => loadPanelsForFile(file))),
    Promise.all(parameterFiles.map((file) => loadPanelsForFile(file))),
  ]);

  return {
    timeseriesPanels: collectTimeseriesPanels(timeseriesByFile),
    parameterPanels: collectDisplayedParameterPanels(parametersByFile),
  };
}

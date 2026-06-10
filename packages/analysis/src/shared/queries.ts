import type { SlideChannelLabels } from "./panels.ts";

export function slideChannelLabelsCacheKey(slideChannelLabels: SlideChannelLabels): string {
  return JSON.stringify(slideChannelLabels);
}

export type AnalysisPanelsParams = {
  workspacePath: string;
  file: import("@lisca/contracts").StudioAnalysisCsvFile;
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

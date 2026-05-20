import type { StudioAnalysisCsvFile } from "@lisca/contracts";
import { queryOptions, type QueryClient, useQuery } from "@tanstack/react-query";

import { ensureStudioPort } from "../api/studio-port";
import { parseCsvFile, parsePanelGroups, type ResultPanel, type SlideChannelLabels } from "./plots";

const ANALYSIS_QUERY_GC_TIME = 30 * 60 * 1000;

export function slideChannelLabelsCacheKey(slideChannelLabels: SlideChannelLabels) {
  return JSON.stringify(slideChannelLabels);
}

export function analysisResultsQueryKey(workspacePath: string | null) {
  return ["studio", "analysis-results", workspacePath] as const;
}

export function analysisCsvQueryKey(workspacePath: string | null, filePath: string) {
  return ["studio", "analysis-csv", workspacePath, filePath] as const;
}

export function analysisPanelsQueryKey(
  workspacePath: string | null,
  filePath: string,
  timeseriesXScale: number,
  slideChannelLabelsKey: string,
) {
  return [
    "studio",
    "analysis-panels",
    workspacePath,
    filePath,
    timeseriesXScale,
    slideChannelLabelsKey,
  ] as const;
}

export function analysisCsvQueryOptions(workspacePath: string | null, file: StudioAnalysisCsvFile) {
  return queryOptions({
    queryKey: analysisCsvQueryKey(workspacePath, file.path),
    queryFn: async ({ signal }) => {
      const inline = file.csv?.trim();
      if (inline) return inline;
      return ensureStudioPort().readTextFile(file.path, signal);
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: ANALYSIS_QUERY_GC_TIME,
  });
}

export function analysisPanelsQueryOptions(
  queryClient: QueryClient,
  workspacePath: string | null,
  file: StudioAnalysisCsvFile,
  timeseriesXScale: number,
  slideChannelLabels: SlideChannelLabels,
  slideChannelLabelsKey: string,
) {
  return queryOptions({
    queryKey: analysisPanelsQueryKey(
      workspacePath,
      file.path,
      timeseriesXScale,
      slideChannelLabelsKey,
    ),
    queryFn: async () => {
      const inline = file.csv?.trim();
      const csv = inline
        ? inline
        : await queryClient.fetchQuery(analysisCsvQueryOptions(workspacePath, file));

      if (!csv.trim()) {
        throw new Error(`CSV file is empty: ${file.fileName}`);
      }

      const parsed = parseCsvFile({ ...file, csv });
      if (!parsed) return [];

      return parsePanelGroups(parsed, timeseriesXScale, slideChannelLabels);
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: ANALYSIS_QUERY_GC_TIME,
  });
}

export function useAnalysisResultsQuery(workspacePath: string | null, enabled: boolean) {
  return useQuery({
    queryKey: analysisResultsQueryKey(workspacePath),
    queryFn: () => {
      if (!workspacePath) throw new Error("No workspace selected");
      return ensureStudioPort().getAnalysisResults(workspacePath);
    },
    enabled: enabled && workspacePath != null,
    retry: false,
  });
}

export async function fetchAnalysisPanels(
  queryClient: QueryClient,
  workspacePath: string | null,
  file: StudioAnalysisCsvFile,
  timeseriesXScale: number,
  slideChannelLabels: SlideChannelLabels,
  slideChannelLabelsKey: string,
) {
  return queryClient.fetchQuery(
    analysisPanelsQueryOptions(
      queryClient,
      workspacePath,
      file,
      timeseriesXScale,
      slideChannelLabels,
      slideChannelLabelsKey,
    ),
  );
}

export function getCachedAnalysisPanels(
  queryClient: QueryClient,
  workspacePath: string | null,
  file: StudioAnalysisCsvFile,
  timeseriesXScale: number,
  slideChannelLabelsKey: string,
): ResultPanel[] | undefined {
  return queryClient.getQueryData<ResultPanel[]>(
    analysisPanelsQueryKey(workspacePath, file.path, timeseriesXScale, slideChannelLabelsKey),
  );
}

export function prefetchAnalysisPanels(
  queryClient: QueryClient,
  workspacePath: string | null,
  file: StudioAnalysisCsvFile,
  timeseriesXScale: number,
  slideChannelLabels: SlideChannelLabels,
  slideChannelLabelsKey: string,
) {
  return queryClient.prefetchQuery(
    analysisPanelsQueryOptions(
      queryClient,
      workspacePath,
      file,
      timeseriesXScale,
      slideChannelLabels,
      slideChannelLabelsKey,
    ),
  );
}

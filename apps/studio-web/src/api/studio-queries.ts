import type { AlignerSource, AutoExcludePreviewRequest } from "@lisca/contracts";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";

import { ensureStudioPort } from "./studio-port";
import { sourceKey } from "../state/studio-align-store";

export const studioQueryKeys = {
  all: ["studio"] as const,
  scanSource: (source: AlignerSource | null) =>
    ["studio", "scan-source", sourceKey(source)] as const,
  roiWorkspaceScan: (workspacePath: string | null) =>
    ["studio", "roi-workspace-scan", workspacePath] as const,
};

export function studioScanSourceQueryOptions(source: AlignerSource | null) {
  return queryOptions({
    queryKey: studioQueryKeys.scanSource(source),
    queryFn: () => {
      if (!source) throw new Error("No source selected");
      return ensureStudioPort().scanSource(source);
    },
    enabled: source != null,
    retry: false,
  });
}

export function studioRoiWorkspaceScanQueryOptions(workspacePath: string | null) {
  return queryOptions({
    queryKey: studioQueryKeys.roiWorkspaceScan(workspacePath),
    queryFn: ({ signal }) => {
      if (!workspacePath) throw new Error("No workspace selected");
      return ensureStudioPort().scanRoiWorkspace(workspacePath, signal);
    },
    enabled: workspacePath != null,
    retry: false,
  });
}

export function studioAutoExcludePreviewMutationOptions() {
  return {
    mutationFn: (request: AutoExcludePreviewRequest) =>
      ensureStudioPort().autoExcludePreview(request),
  };
}

export function useScanSourceQuery(source: AlignerSource | null) {
  return useQuery(studioScanSourceQueryOptions(source));
}

export function useAutoExcludePreviewMutation() {
  return useMutation(studioAutoExcludePreviewMutationOptions());
}

export function useStudioRoiWorkspaceScanQuery(workspacePath: string | null) {
  return useQuery(studioRoiWorkspaceScanQueryOptions(workspacePath));
}

export { studioClient, ensureStudioPort } from "./studio-port";

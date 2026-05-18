import type { AlignerSource, AutoExcludePreviewRequest } from "@lisca/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";

import { studioClient } from "./studio-client";
import { sourceKey } from "../state/studio-align-store";

export function useScanSourceQuery(source: AlignerSource | null) {
  return useQuery({
    queryKey: ["studio", "scan-source", sourceKey(source)],
    queryFn: () => {
      if (!source) throw new Error("No source selected");
      return studioClient.scanSource(source);
    },
    enabled: source != null,
    retry: false,
  });
}

export function useAutoExcludePreviewMutation() {
  return useMutation({
    mutationFn: (request: AutoExcludePreviewRequest) => studioClient.autoExcludePreview(request),
  });
}

export function useStudioRoiWorkspaceScanQuery(workspacePath: string | null) {
  return useQuery({
    queryKey: ["studio", "roi-workspace-scan", workspacePath],
    queryFn: ({ signal }) => {
      if (!workspacePath) throw new Error("No workspace selected");
      return studioClient.scanRoiWorkspace(workspacePath, signal);
    },
    enabled: workspacePath != null,
    retry: false,
  });
}

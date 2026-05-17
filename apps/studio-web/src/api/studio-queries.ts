import type { AlignerSource, AutoExcludePreviewRequest, FrameRequest } from "@lisca/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";

import { studioClient } from "./studio-client";
import { savedAlignStateKey, sourceKey } from "../state/studio-align-store";

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

export function useLoadAlignStateQuery(
  workspacePath: string | null,
  selection: FrameRequest,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      "studio",
      "align-state",
      workspacePath ? savedAlignStateKey(workspacePath, selection.pos) : null,
    ],
    queryFn: () => {
      if (!workspacePath) throw new Error("No workspace selected");
      return studioClient.loadAlignState(workspacePath, selection.pos);
    },
    enabled: enabled && workspacePath != null,
    retry: false,
  });
}

export function useAutoExcludePreviewMutation() {
  return useMutation({
    mutationFn: (request: AutoExcludePreviewRequest) => studioClient.autoExcludePreview(request),
  });
}

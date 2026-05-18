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

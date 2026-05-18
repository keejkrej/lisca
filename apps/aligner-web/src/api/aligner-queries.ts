import type { AlignerSource, AutoExcludePreviewRequest } from "@lisca/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";

import { createAlignerHttpClient } from "./aligner-client";
import { sourceKey } from "../state/aligner-store";

export const alignerClient = createAlignerHttpClient("http://127.0.0.1:8765");

export function toErrorMessage(cause: unknown, fallback: string): string {
  const message = cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "";

  if (
    cause instanceof TypeError ||
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("fetch failed")
  ) {
    return `${fallback}: server unreachable at 127.0.0.1:8765`;
  }

  return message ? `${fallback}: ${message}` : fallback;
}

export function useScanSourceQuery(source: AlignerSource | null) {
  return useQuery({
    queryKey: ["aligner", "scan-source", sourceKey(source)],
    queryFn: () => {
      if (!source) throw new Error("No source selected");
      return alignerClient.scanSource(source);
    },
    enabled: source != null,
    retry: false,
  });
}

export function useSavedBboxPositionsQuery(workspacePath: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["aligner", "saved-bbox-positions", workspacePath],
    queryFn: () => {
      if (!workspacePath) throw new Error("No workspace selected");
      return alignerClient.listSavedBboxPositions(workspacePath);
    },
    enabled: enabled && workspacePath != null,
    retry: false,
  });
}

export function useAutoExcludePreviewMutation() {
  return useMutation({
    mutationFn: (request: AutoExcludePreviewRequest) => alignerClient.autoExcludePreview(request),
  });
}

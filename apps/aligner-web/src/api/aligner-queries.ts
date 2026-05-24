import type { AlignerSource, AutoExcludePreviewRequest } from "@lisca/contracts";
import { runClientEffect } from "@lisca/client/runtime";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";

import { ensureAlignerPort } from "./aligner-port";
import { sourceKey } from "../state/aligner-store";

export const alignerQueryKeys = {
  all: ["aligner"] as const,
  scanSource: (source: AlignerSource | null) =>
    ["aligner", "scan-source", sourceKey(source)] as const,
  savedBboxPositions: (workspacePath: string | null) =>
    ["aligner", "saved-bbox-positions", workspacePath] as const,
};

export function workspaceScanQueryOptions(source: AlignerSource | null) {
  return queryOptions({
    queryKey: alignerQueryKeys.scanSource(source),
    queryFn: () => {
      if (!source) throw new Error("No source selected");
      return runClientEffect(ensureAlignerPort().scanSource(source));
    },
    enabled: source != null,
    retry: false,
  });
}

export function savedBboxPositionsQueryOptions(workspacePath: string | null, enabled: boolean) {
  return queryOptions({
    queryKey: alignerQueryKeys.savedBboxPositions(workspacePath),
    queryFn: () => {
      if (!workspacePath) throw new Error("No workspace selected");
      return runClientEffect(ensureAlignerPort().listSavedBboxPositions(workspacePath));
    },
    enabled: enabled && workspacePath != null,
    retry: false,
  });
}

export function autoExcludePreviewMutationOptions() {
  return {
    mutationFn: (request: AutoExcludePreviewRequest) =>
      runClientEffect(ensureAlignerPort().autoExcludePreview(request)),
  };
}

export function useScanSourceQuery(source: AlignerSource | null) {
  return useQuery(workspaceScanQueryOptions(source));
}

export function useSavedBboxPositionsQuery(workspacePath: string | null, enabled: boolean) {
  return useQuery(savedBboxPositionsQueryOptions(workspacePath, enabled));
}

export function useAutoExcludePreviewMutation() {
  return useMutation(autoExcludePreviewMutationOptions());
}

export { alignerClient, ensureAlignerPort } from "./aligner-port";
export { toErrorMessage } from "./aligner-client";

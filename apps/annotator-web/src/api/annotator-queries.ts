import type { AnnotationLabel, RoiFrameAnnotationPayload, RoiFrameRequest } from "@lisca/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { annotatorBaseUrl, createAnnotatorApi } from "./annotator-client";

export const annotatorApi = createAnnotatorApi(annotatorBaseUrl);

export function annotationLabelsQueryKey(workspacePath: string | null) {
  return ["annotator", "annotation-labels", workspacePath] as const;
}

export function roiWorkspaceScanQueryKey(workspacePath: string | null) {
  return ["annotator", "roi-workspace-scan", workspacePath] as const;
}

export function toAnnotatorErrorMessage(cause: unknown, fallback: string): string {
  const message = cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "";

  if (
    cause instanceof TypeError ||
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("fetch failed")
  ) {
    return `${fallback}: server unreachable at ${annotatorBaseUrl()}`;
  }

  return message ? `${fallback}: ${message}` : fallback;
}

export function useRoiWorkspaceScanQuery(workspacePath: string | null) {
  return useQuery({
    queryKey: roiWorkspaceScanQueryKey(workspacePath),
    queryFn: ({ signal }) => {
      if (!workspacePath) throw new Error("No workspace selected");
      return annotatorApi.scanRoiWorkspace(workspacePath, signal);
    },
    enabled: workspacePath != null,
    retry: false,
  });
}

export function useAnnotationLabelsQuery(workspacePath: string | null) {
  return useQuery({
    queryKey: annotationLabelsQueryKey(workspacePath),
    queryFn: ({ signal }) => {
      if (!workspacePath) throw new Error("No workspace selected");
      return annotatorApi.loadLabels(workspacePath, signal);
    },
    enabled: workspacePath != null,
    retry: false,
  });
}

export function useSaveAnnotationLabelsMutation(workspacePath: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (labels: AnnotationLabel[]) => {
      if (!workspacePath) throw new Error("No workspace selected");
      return annotatorApi.saveLabels(workspacePath, labels);
    },
    onSuccess: (labels) => {
      queryClient.setQueryData(annotationLabelsQueryKey(workspacePath), labels);
    },
  });
}

export function useSaveRoiFrameAnnotationMutation(workspacePath: string | null) {
  return useMutation({
    mutationFn: (input: { request: RoiFrameRequest; annotation: RoiFrameAnnotationPayload }) => {
      if (!workspacePath) throw new Error("No workspace selected");
      return annotatorApi.saveRoiFrameAnnotation(workspacePath, input.request, input.annotation);
    },
  });
}

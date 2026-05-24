import type { AnnotationLabel, RoiFrameAnnotationPayload, RoiFrameRequest } from "@lisca/contracts";
import { runClientEffect } from "@lisca/client/runtime";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ensureAnnotatorPort } from "./annotator-port";

export const annotatorQueryKeys = {
  all: ["annotator"] as const,
  annotationLabels: (workspacePath: string | null) =>
    ["annotator", "annotation-labels", workspacePath] as const,
  roiWorkspaceScan: (workspacePath: string | null) =>
    ["annotator", "roi-workspace-scan", workspacePath] as const,
};

export function annotationLabelsQueryKey(workspacePath: string | null) {
  return annotatorQueryKeys.annotationLabels(workspacePath);
}

export function roiWorkspaceScanQueryKey(workspacePath: string | null) {
  return annotatorQueryKeys.roiWorkspaceScan(workspacePath);
}

export function roiWorkspaceScanQueryOptions(workspacePath: string | null) {
  return queryOptions({
    queryKey: annotatorQueryKeys.roiWorkspaceScan(workspacePath),
    queryFn: ({ signal }) => {
      if (!workspacePath) throw new Error("No workspace selected");
      return runClientEffect(ensureAnnotatorPort().scanRoiWorkspace(workspacePath, signal), {
        signal,
      });
    },
    enabled: workspacePath != null,
    retry: false,
  });
}

export function annotationLabelsQueryOptions(workspacePath: string | null) {
  return queryOptions({
    queryKey: annotatorQueryKeys.annotationLabels(workspacePath),
    queryFn: ({ signal }) => {
      if (!workspacePath) throw new Error("No workspace selected");
      return runClientEffect(ensureAnnotatorPort().loadLabels(workspacePath, signal), { signal });
    },
    enabled: workspacePath != null,
    retry: false,
  });
}

export function useRoiWorkspaceScanQuery(workspacePath: string | null) {
  return useQuery(roiWorkspaceScanQueryOptions(workspacePath));
}

export function useAnnotationLabelsQuery(workspacePath: string | null) {
  return useQuery(annotationLabelsQueryOptions(workspacePath));
}

export function useSaveAnnotationLabelsMutation(workspacePath: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (labels: AnnotationLabel[]) => {
      if (!workspacePath) throw new Error("No workspace selected");
      return runClientEffect(ensureAnnotatorPort().saveLabels(workspacePath, labels));
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
      return runClientEffect(
        ensureAnnotatorPort().saveRoiFrameAnnotation(
          workspacePath,
          input.request,
          input.annotation,
        ),
      );
    },
  });
}

export { annotatorClient, ensureAnnotatorPort } from "./annotator-port";
export { toErrorMessage } from "./annotator-client";

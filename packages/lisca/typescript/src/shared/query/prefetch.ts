import type { QueryClient } from "@tanstack/react-query";

import type { ViewerDataPort } from "lisca/shared/contracts";

import {
  annotationLabelsQueryOptions,
  rawAnnotationSourceQueryOptions,
  scanRoiWorkspaceQueryOptions,
} from "./queryOptions";

/** Warms the annotator shell: ROI workspace scan, labels, and bound raw source (if any). */
export function prefetchAnnotatorWorkspaceShell(
  queryClient: QueryClient,
  backend: ViewerDataPort,
  workspacePath: string,
) {
  void queryClient.prefetchQuery(scanRoiWorkspaceQueryOptions(backend, workspacePath));
  void queryClient.prefetchQuery(annotationLabelsQueryOptions(backend, workspacePath));
  void queryClient.prefetchQuery(rawAnnotationSourceQueryOptions(backend, workspacePath));
}

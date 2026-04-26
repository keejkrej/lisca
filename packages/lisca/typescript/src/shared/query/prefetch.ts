import type { QueryClient } from "@tanstack/react-query";

import type { ViewerDataPort } from "../../viewer/contracts";

import { queryKeys } from "./queryKeys";

/** Warms the annotator shell: ROI workspace scan, labels, and bound raw source (if any). */
export function prefetchAnnotatorWorkspaceShell(
  queryClient: QueryClient,
  backend: ViewerDataPort,
  workspacePath: string,
) {
  void queryClient.prefetchQuery({
    queryKey: queryKeys.scanRoiWorkspace(workspacePath),
    queryFn: () => backend.scanRoiWorkspace(workspacePath),
  });
  void queryClient.prefetchQuery({
    queryKey: queryKeys.annotationLabels(workspacePath),
    queryFn: () => backend.loadAnnotationLabels(workspacePath),
  });
  void queryClient.prefetchQuery({
    queryKey: queryKeys.rawAnnotationSource(workspacePath),
    queryFn: ({ signal }) => {
      void signal;
      return backend.loadRawAnnotationSource(workspacePath);
    },
  });
}

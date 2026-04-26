import type { QueryClient } from "@tanstack/react-query";

import type {
  AutoExcludePreviewRequest,
  AutoExcludePreviewResponse,
  ViewerDataPort,
} from "../../viewer/contracts";

import { queryKeys } from "./queryKeys";

/** Imperative read sharing the same cache entry as {@link useSavedBboxPositionsQuery}. */
export function fetchSavedBboxPositions(
  queryClient: QueryClient,
  backend: ViewerDataPort,
  workspacePath: string,
): Promise<number[]> {
  return queryClient.fetchQuery({
    queryKey: queryKeys.savedBboxPositions(workspacePath),
    queryFn: ({ signal }) => {
      void signal;
      return backend.listSavedBboxPositions(workspacePath);
    },
  });
}

/** Imperative read sharing the same cache entry as {@link useAutoExcludePreviewQuery}. */
export function fetchAutoExcludePreview(
  queryClient: QueryClient,
  backend: ViewerDataPort,
  request: AutoExcludePreviewRequest,
): Promise<AutoExcludePreviewResponse> {
  return queryClient.fetchQuery({
    queryKey: queryKeys.autoExcludePreview(request),
    queryFn: ({ signal }) => {
      void signal;
      return backend.autoExcludePreview(request);
    },
    staleTime: 0,
  });
}

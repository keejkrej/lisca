import type { QueryClient } from "@tanstack/react-query";

import type {
  AutoExcludePreviewRequest,
  AutoExcludePreviewResponse,
  ViewerDataPort,
} from "lisca/shared/contracts";

import {
  autoExcludePreviewQueryOptions,
  savedBboxPositionsQueryOptions,
} from "./queryOptions";

/** Imperative read sharing the same cache entry as {@link useSavedBboxPositionsQuery}. */
export function fetchSavedBboxPositions(
  queryClient: QueryClient,
  backend: ViewerDataPort,
  workspacePath: string,
): Promise<number[]> {
  return queryClient.fetchQuery(savedBboxPositionsQueryOptions(backend, workspacePath));
}

/** Imperative read sharing the same cache entry as {@link useAutoExcludePreviewQuery}. */
export function fetchAutoExcludePreview(
  queryClient: QueryClient,
  backend: ViewerDataPort,
  request: AutoExcludePreviewRequest,
): Promise<AutoExcludePreviewResponse> {
  return queryClient.fetchQuery(autoExcludePreviewQueryOptions(backend, request));
}

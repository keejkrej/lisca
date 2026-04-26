import type { UseQueryOptions } from "@tanstack/react-query";

import type {
  AutoExcludePreviewRequest,
  RawFrameRequest,
  RoiFrameRequest,
  ViewerDataPort,
  ViewerSource,
} from "lisca/shared/contracts";

import { fetchRawFrameAnnotationMeta, fetchRoiFrameAnnotationMeta } from "./annotationMeta";
import { queryKeys } from "./queryKeys";

type LiscaQueryOptions<T> = UseQueryOptions<T, Error, T, readonly unknown[]>;

export const QUERY_STALE_TIME = {
  workspaceScan: 60_000,
  preview: 0,
  metadata: 30_000,
} as const;

export function scanSourceQueryOptions(backend: ViewerDataPort, source: ViewerSource) {
  return {
    queryKey: queryKeys.scanSource(source),
    queryFn: ({ signal }) => {
      void signal;
      return backend.scanSource(source);
    },
    staleTime: QUERY_STALE_TIME.workspaceScan,
  } satisfies LiscaQueryOptions<import("lisca/shared/contracts").WorkspaceScan>;
}

export function scanRoiWorkspaceQueryOptions(backend: ViewerDataPort, workspacePath: string) {
  return {
    queryKey: queryKeys.scanRoiWorkspace(workspacePath),
    queryFn: ({ signal }) => {
      void signal;
      return backend.scanRoiWorkspace(workspacePath);
    },
    staleTime: QUERY_STALE_TIME.workspaceScan,
  } satisfies LiscaQueryOptions<import("lisca/shared/contracts").RoiWorkspaceScan>;
}

export function savedBboxPositionsQueryOptions(backend: ViewerDataPort, workspacePath: string) {
  return {
    queryKey: queryKeys.savedBboxPositions(workspacePath),
    queryFn: ({ signal }) => {
      void signal;
      return backend.listSavedBboxPositions(workspacePath);
    },
    staleTime: QUERY_STALE_TIME.metadata,
  } satisfies LiscaQueryOptions<number[]>;
}

export function alignStateQueryOptions(backend: ViewerDataPort, workspacePath: string, pos: number) {
  return {
    queryKey: queryKeys.alignState(workspacePath, pos),
    queryFn: ({ signal }) => {
      void signal;
      return backend.loadAlignState(workspacePath, pos);
    },
    staleTime: QUERY_STALE_TIME.metadata,
  } satisfies LiscaQueryOptions<import("lisca/shared/contracts").SavedAlignState | null>;
}

export function annotationLabelsQueryOptions(backend: ViewerDataPort, workspacePath: string) {
  return {
    queryKey: queryKeys.annotationLabels(workspacePath),
    queryFn: ({ signal }) => {
      void signal;
      return backend.loadAnnotationLabels(workspacePath);
    },
    staleTime: QUERY_STALE_TIME.metadata,
  } satisfies LiscaQueryOptions<import("lisca/shared/contracts").AnnotationLabel[]>;
}

export function rawAnnotationSourceQueryOptions(backend: ViewerDataPort, workspacePath: string) {
  return {
    queryKey: queryKeys.rawAnnotationSource(workspacePath),
    queryFn: ({ signal }) => {
      void signal;
      return backend.loadRawAnnotationSource(workspacePath);
    },
    staleTime: QUERY_STALE_TIME.metadata,
  } satisfies LiscaQueryOptions<ViewerSource | null>;
}

export function autoExcludePreviewQueryOptions(backend: ViewerDataPort, request: AutoExcludePreviewRequest) {
  return {
    queryKey: queryKeys.autoExcludePreview(request),
    queryFn: ({ signal }) => {
      void signal;
      return backend.autoExcludePreview(request);
    },
    staleTime: QUERY_STALE_TIME.preview,
  } satisfies LiscaQueryOptions<import("lisca/shared/contracts").AutoExcludePreviewResponse>;
}

export function roiFrameAnnotationMetaQueryOptions(
  backend: ViewerDataPort,
  workspacePath: string,
  request: RoiFrameRequest,
) {
  return {
    queryKey: queryKeys.roiFrameAnnotationMeta(workspacePath, request),
    queryFn: ({ signal }) => {
      void signal;
      return fetchRoiFrameAnnotationMeta(backend, workspacePath, request);
    },
    staleTime: QUERY_STALE_TIME.metadata,
  } satisfies LiscaQueryOptions<import("lisca/shared/contracts").RoiFrameAnnotation>;
}

export function rawFrameAnnotationMetaQueryOptions(
  backend: ViewerDataPort,
  workspacePath: string,
  source: ViewerSource,
  request: RawFrameRequest,
) {
  return {
    queryKey: queryKeys.rawFrameAnnotationMeta(workspacePath, source, request),
    queryFn: ({ signal }) => {
      void signal;
      return fetchRawFrameAnnotationMeta(backend, workspacePath, source, request);
    },
    staleTime: QUERY_STALE_TIME.metadata,
  } satisfies LiscaQueryOptions<import("lisca/shared/contracts").RawFrameAnnotation>;
}

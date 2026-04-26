import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

import type {
  AnnotationLabel,
  AutoExcludePreviewRequest,
  AutoExcludePreviewResponse,
  CropOutputFormat,
  CropRoiResponse,
  RawFrameAnnotation,
  RawFrameAnnotationPayload,
  RawFrameRequest,
  RoiFrameAnnotation,
  RoiFrameAnnotationPayload,
  RoiFrameRequest,
  RoiWorkspaceScan,
  SavedAlignState,
  SaveBboxResponse,
  ViewerDataPort,
  ViewerSource,
  WorkspaceScan,
} from "../../viewer/contracts";

import { fetchRawFrameAnnotationMeta, fetchRoiFrameAnnotationMeta } from "./annotationMeta";
import { queryKeys } from "./queryKeys";

// --- Reads ---

export function useScanSourceQuery(
  backend: ViewerDataPort,
  source: ViewerSource | null | undefined,
  options?: Omit<UseQueryOptions<WorkspaceScan, Error, WorkspaceScan>, "queryKey" | "queryFn">,
) {
  return useQuery({
    ...options,
    queryKey: source ? queryKeys.scanSource(source) : queryKeys.all,
    queryFn: ({ signal }) => {
      if (!source) throw new Error("scanSource: missing source");
      void signal;
      return backend.scanSource(source);
    },
    enabled: Boolean(source) && (options?.enabled ?? true),
  });
}

export function useScanRoiWorkspaceQuery(
  backend: ViewerDataPort,
  workspacePath: string | null | undefined,
  options?: Omit<UseQueryOptions<RoiWorkspaceScan, Error, RoiWorkspaceScan>, "queryKey" | "queryFn">,
) {
  return useQuery({
    ...options,
    queryKey: workspacePath
      ? queryKeys.scanRoiWorkspace(workspacePath)
      : queryKeys.all,
    queryFn: ({ signal }) => {
      if (!workspacePath) throw new Error("scanRoiWorkspace: missing path");
      void signal;
      return backend.scanRoiWorkspace(workspacePath);
    },
    enabled: Boolean(workspacePath) && (options?.enabled ?? true),
  });
}

export function useSavedBboxPositionsQuery(
  backend: ViewerDataPort,
  workspacePath: string | null | undefined,
  options?: Omit<UseQueryOptions<number[], Error, number[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    ...options,
    queryKey: workspacePath
      ? queryKeys.savedBboxPositions(workspacePath)
      : queryKeys.all,
    queryFn: ({ signal }) => {
      if (!workspacePath) throw new Error("listSavedBboxPositions: missing path");
      void signal;
      return backend.listSavedBboxPositions(workspacePath);
    },
    enabled: Boolean(workspacePath) && (options?.enabled ?? true),
  });
}

export function useAlignStateQuery(
  backend: ViewerDataPort,
  workspacePath: string | null | undefined,
  pos: number | null | undefined,
  options?: Omit<
    UseQueryOptions<SavedAlignState | null, Error, SavedAlignState | null>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    ...options,
    queryKey:
      workspacePath != null && workspacePath !== "" && pos != null
        ? queryKeys.alignState(workspacePath, pos)
        : queryKeys.all,
    queryFn: ({ signal }) => {
      if (workspacePath == null || workspacePath === "" || pos == null) {
        throw new Error("loadAlignState: missing workspacePath or pos");
      }
      void signal;
      return backend.loadAlignState(workspacePath, pos);
    },
    enabled:
      Boolean(workspacePath) && pos != null && !Number.isNaN(pos) && (options?.enabled ?? true),
  });
}

export function useAnnotationLabelsQuery(
  backend: ViewerDataPort,
  workspacePath: string | null | undefined,
  options?: Omit<UseQueryOptions<AnnotationLabel[], Error, AnnotationLabel[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    ...options,
    queryKey: workspacePath
      ? queryKeys.annotationLabels(workspacePath)
      : queryKeys.all,
    queryFn: ({ signal }) => {
      if (!workspacePath) throw new Error("loadAnnotationLabels: missing path");
      void signal;
      return backend.loadAnnotationLabels(workspacePath);
    },
    enabled: Boolean(workspacePath) && (options?.enabled ?? true),
  });
}

export function useRawAnnotationSourceQuery(
  backend: ViewerDataPort,
  workspacePath: string | null | undefined,
  options?: Omit<
    UseQueryOptions<ViewerSource | null, Error, ViewerSource | null>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    ...options,
    queryKey: workspacePath
      ? queryKeys.rawAnnotationSource(workspacePath)
      : queryKeys.all,
    queryFn: ({ signal }) => {
      if (!workspacePath) throw new Error("loadRawAnnotationSource: missing path");
      void signal;
      return backend.loadRawAnnotationSource(workspacePath);
    },
    enabled: Boolean(workspacePath) && (options?.enabled ?? true),
  });
}

export function useAutoExcludePreviewQuery(
  backend: ViewerDataPort,
  request: AutoExcludePreviewRequest | null | undefined,
  options?: Omit<
    UseQueryOptions<AutoExcludePreviewResponse, Error, AutoExcludePreviewResponse>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    ...options,
    queryKey: request ? queryKeys.autoExcludePreview(request) : queryKeys.all,
    queryFn: ({ signal }) => {
      if (!request) throw new Error("autoExcludePreview: missing request");
      void signal;
      return backend.autoExcludePreview(request);
    },
    enabled: Boolean(request) && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 0,
  });
}

/** Tier A: metadata only; mask is not written to the query cache. */
export function useRoiFrameAnnotationMetaQuery(
  backend: ViewerDataPort,
  workspacePath: string | null | undefined,
  request: RoiFrameRequest | null | undefined,
  options?: Omit<UseQueryOptions<RoiFrameAnnotation, Error, RoiFrameAnnotation>, "queryKey" | "queryFn">,
) {
  return useQuery({
    ...options,
    queryKey:
      workspacePath && request
        ? queryKeys.roiFrameAnnotationMeta(workspacePath, request)
        : queryKeys.all,
    queryFn: ({ signal }) => {
      if (!workspacePath || !request) {
        throw new Error("roiFrameAnnotationMeta: missing workspacePath or request");
      }
      void signal;
      return fetchRoiFrameAnnotationMeta(backend, workspacePath, request);
    },
    enabled: Boolean(workspacePath && request) && (options?.enabled ?? true),
  });
}

/** Tier A: metadata only; mask is not written to the query cache. */
export function useRawFrameAnnotationMetaQuery(
  backend: ViewerDataPort,
  workspacePath: string | null | undefined,
  source: ViewerSource | null | undefined,
  request: RawFrameRequest | null | undefined,
  options?: Omit<UseQueryOptions<RawFrameAnnotation, Error, RawFrameAnnotation>, "queryKey" | "queryFn">,
) {
  return useQuery({
    ...options,
    queryKey:
      workspacePath && source && request
        ? queryKeys.rawFrameAnnotationMeta(workspacePath, source, request)
        : queryKeys.all,
    queryFn: ({ signal }) => {
      if (!workspacePath || !source || !request) {
        throw new Error("rawFrameAnnotationMeta: missing workspacePath, source, or request");
      }
      void signal;
      return fetchRawFrameAnnotationMeta(backend, workspacePath, source, request);
    },
    enabled:
      Boolean(workspacePath && source && request) && (options?.enabled ?? true),
  });
}

// --- Mutations ---

export function useSaveAnnotationLabelsMutation(
  backend: ViewerDataPort,
  options?: UseMutationOptions<
    AnnotationLabel[],
    Error,
    { workspacePath: string; labels: AnnotationLabel[] }
  >,
) {
  const qc = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: ({ workspacePath, labels }) =>
      backend.saveAnnotationLabels(workspacePath, labels),
    onSuccess: (data, variables, onMutateResult, context) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.annotationLabels(variables.workspacePath),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useSaveRoiFrameAnnotationMutation(
  backend: ViewerDataPort,
  options?: UseMutationOptions<
    RoiFrameAnnotation,
    Error,
    {
      workspacePath: string;
      request: RoiFrameRequest;
      annotation: RoiFrameAnnotationPayload;
    }
  >,
) {
  const qc = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: ({ workspacePath, request, annotation }) =>
      backend.saveRoiFrameAnnotation(workspacePath, request, annotation),
    onSuccess: (data, variables, onMutateResult, context) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.roiFrameAnnotationMeta(variables.workspacePath, variables.request),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useSaveRawFrameAnnotationMutation(
  backend: ViewerDataPort,
  options?: UseMutationOptions<
    RawFrameAnnotation,
    Error,
    {
      workspacePath: string;
      source: ViewerSource;
      request: RawFrameRequest;
      annotation: RawFrameAnnotationPayload;
    }
  >,
) {
  const qc = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: ({ workspacePath, source, request, annotation }) =>
      backend.saveRawFrameAnnotation(workspacePath, source, request, annotation),
    onSuccess: (data, variables, onMutateResult, context) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.rawFrameAnnotationMeta(
          variables.workspacePath,
          variables.source,
          variables.request,
        ),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useSaveBboxMutation(
  backend: ViewerDataPort,
  options?: UseMutationOptions<
    SaveBboxResponse,
    Error,
    {
      workspacePath: string;
      source: ViewerSource;
      pos: number;
      csv: string;
      alignState: SavedAlignState;
    }
  >,
) {
  const qc = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: ({ workspacePath, source, pos, csv, alignState }) =>
      backend.saveBbox(workspacePath, source, pos, csv, alignState),
    onSuccess: (data, variables, onMutateResult, context) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.savedBboxPositions(variables.workspacePath),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.alignState(variables.workspacePath, variables.pos),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.scanSource(variables.source),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useCropRoiMutation(
  backend: ViewerDataPort,
  options?: UseMutationOptions<
    CropRoiResponse,
    Error,
    {
      workspacePath: string;
      source: ViewerSource;
      pos: number;
      format: CropOutputFormat;
      requestId?: string;
      batch?: number;
    }
  >,
) {
  const qc = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: ({ workspacePath, source, pos, format, requestId, batch }) =>
      backend.cropRoi(workspacePath, source, pos, format, requestId, batch),
    onSuccess: (data, variables, onMutateResult, context) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.scanRoiWorkspace(variables.workspacePath),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useCancelCropRoiMutation(
  backend: ViewerDataPort,
  options?: UseMutationOptions<void, Error, { requestId: string }>,
) {
  return useMutation({
    ...options,
    mutationFn: ({ requestId }) => backend.cancelCropRoi(requestId),
  });
}

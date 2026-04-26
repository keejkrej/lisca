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
} from "lisca/shared/contracts";

import { queryKeys } from "./queryKeys";
import {
  alignStateQueryOptions,
  annotationLabelsQueryOptions,
  autoExcludePreviewQueryOptions,
  rawAnnotationSourceQueryOptions,
  rawFrameAnnotationMetaQueryOptions,
  roiFrameAnnotationMetaQueryOptions,
  savedBboxPositionsQueryOptions,
  scanRoiWorkspaceQueryOptions,
  scanSourceQueryOptions,
} from "./queryOptions";

// --- Reads ---

export function useScanSourceQuery(
  backend: ViewerDataPort,
  source: ViewerSource | null | undefined,
  options?: Omit<UseQueryOptions<WorkspaceScan, Error, WorkspaceScan>, "queryKey" | "queryFn">,
) {
  return useQuery({
    ...(source ? scanSourceQueryOptions(backend, source) : { queryKey: queryKeys.all, queryFn: () => Promise.reject(new Error("scanSource: missing source")) }),
    ...options,
    enabled: Boolean(source) && (options?.enabled ?? true),
  });
}

export function useScanRoiWorkspaceQuery(
  backend: ViewerDataPort,
  workspacePath: string | null | undefined,
  options?: Omit<UseQueryOptions<RoiWorkspaceScan, Error, RoiWorkspaceScan>, "queryKey" | "queryFn">,
) {
  return useQuery({
    ...(workspacePath ? scanRoiWorkspaceQueryOptions(backend, workspacePath) : { queryKey: queryKeys.all, queryFn: () => Promise.reject(new Error("scanRoiWorkspace: missing path")) }),
    ...options,
    enabled: Boolean(workspacePath) && (options?.enabled ?? true),
  });
}

export function useSavedBboxPositionsQuery(
  backend: ViewerDataPort,
  workspacePath: string | null | undefined,
  options?: Omit<UseQueryOptions<number[], Error, number[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    ...(workspacePath ? savedBboxPositionsQueryOptions(backend, workspacePath) : { queryKey: queryKeys.all, queryFn: () => Promise.reject(new Error("listSavedBboxPositions: missing path")) }),
    ...options,
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
  const hasKey = workspacePath != null && workspacePath !== "" && pos != null;
  return useQuery({
    ...(hasKey ? alignStateQueryOptions(backend, workspacePath, pos) : { queryKey: queryKeys.all, queryFn: () => Promise.reject(new Error("loadAlignState: missing workspacePath or pos")) }),
    ...options,
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
    ...(workspacePath ? annotationLabelsQueryOptions(backend, workspacePath) : { queryKey: queryKeys.all, queryFn: () => Promise.reject(new Error("loadAnnotationLabels: missing path")) }),
    ...options,
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
    ...(workspacePath ? rawAnnotationSourceQueryOptions(backend, workspacePath) : { queryKey: queryKeys.all, queryFn: () => Promise.reject(new Error("loadRawAnnotationSource: missing path")) }),
    ...options,
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
    ...(request ? autoExcludePreviewQueryOptions(backend, request) : { queryKey: queryKeys.all, queryFn: () => Promise.reject(new Error("autoExcludePreview: missing request")) }),
    ...options,
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
  const hasKey = Boolean(workspacePath && request);
  return useQuery({
    ...(hasKey ? roiFrameAnnotationMetaQueryOptions(backend, workspacePath as string, request as RoiFrameRequest) : { queryKey: queryKeys.all, queryFn: () => Promise.reject(new Error("roiFrameAnnotationMeta: missing workspacePath or request")) }),
    ...options,
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
  const hasKey = Boolean(workspacePath && source && request);
  return useQuery({
    ...(hasKey ? rawFrameAnnotationMetaQueryOptions(backend, workspacePath as string, source as ViewerSource, request as RawFrameRequest) : { queryKey: queryKeys.all, queryFn: () => Promise.reject(new Error("rawFrameAnnotationMeta: missing workspacePath, source, or request")) }),
    ...options,
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
      qc.setQueryData(queryKeys.annotationLabels(variables.workspacePath), data);
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
      qc.setQueryData(
        queryKeys.roiFrameAnnotationMeta(variables.workspacePath, variables.request),
        data,
      );
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
      qc.setQueryData(
        queryKeys.rawFrameAnnotationMeta(
          variables.workspacePath,
          variables.source,
          variables.request,
        ),
        data,
      );
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
      if (data.ok) {
        qc.setQueryData<number[]>(
          queryKeys.savedBboxPositions(variables.workspacePath),
          (current) => {
            const positions = new Set(current ?? []);
            positions.add(variables.pos);
            return [...positions].sort((a, b) => a - b);
          },
        );
        qc.setQueryData(
          queryKeys.alignState(variables.workspacePath, variables.pos),
          variables.alignState,
        );
      }
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

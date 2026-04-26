import {
  useMutation,
  useQuery,
  useQueryClient,
  skipToken,
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

type LiscaHookQueryOptions<T> = Omit<
  UseQueryOptions<T, Error, T, readonly unknown[]>,
  "queryKey" | "queryFn" | "initialData"
>;

type LiscaQueryFactory<T> = Pick<
  UseQueryOptions<T, Error, T, readonly unknown[]>,
  "queryKey" | "queryFn" | "staleTime" | "gcTime"
>;

// --- Reads ---

function disabledQueryOptions<T>(): Pick<
  UseQueryOptions<T, Error, T, readonly unknown[]>,
  "queryKey" | "queryFn"
> {
  return {
    queryKey: queryKeys.all,
    queryFn: skipToken as UseQueryOptions<T, Error, T, readonly unknown[]>["queryFn"],
  };
}

function enabledQueryOptions<T>(
  queryOptions: LiscaQueryFactory<T> | null,
  options?: LiscaHookQueryOptions<T>,
) {
  return {
    ...(queryOptions ?? disabledQueryOptions<T>()),
    ...options,
    enabled: queryOptions !== null && (options?.enabled ?? true),
  };
}

export function useScanSourceQuery(
  backend: ViewerDataPort | null | undefined,
  source: ViewerSource | null | undefined,
  options?: LiscaHookQueryOptions<WorkspaceScan>,
) {
  return useQuery(
    enabledQueryOptions(
      backend && source ? scanSourceQueryOptions(backend, source) : null,
      options,
    ),
  );
}

export function useScanRoiWorkspaceQuery(
  backend: ViewerDataPort | null | undefined,
  workspacePath: string | null | undefined,
  options?: LiscaHookQueryOptions<RoiWorkspaceScan>,
) {
  return useQuery(
    enabledQueryOptions(
      backend && workspacePath
        ? scanRoiWorkspaceQueryOptions(backend, workspacePath)
        : null,
      options,
    ),
  );
}

export function useSavedBboxPositionsQuery(
  backend: ViewerDataPort | null | undefined,
  workspacePath: string | null | undefined,
  options?: LiscaHookQueryOptions<number[]>,
) {
  return useQuery(
    enabledQueryOptions(
      backend && workspacePath
        ? savedBboxPositionsQueryOptions(backend, workspacePath)
        : null,
      options,
    ),
  );
}

export function useAlignStateQuery(
  backend: ViewerDataPort | null | undefined,
  workspacePath: string | null | undefined,
  pos: number | null | undefined,
  options?: Omit<
    UseQueryOptions<SavedAlignState | null, Error, SavedAlignState | null, readonly unknown[]>,
    "queryKey" | "queryFn" | "initialData"
  >,
) {
  const canQuery =
    !!backend && !!workspacePath && pos != null && !Number.isNaN(pos);
  return useQuery(
    enabledQueryOptions(
      canQuery ? alignStateQueryOptions(backend, workspacePath, pos) : null,
      options,
    ),
  );
}

export function useAnnotationLabelsQuery(
  backend: ViewerDataPort | null | undefined,
  workspacePath: string | null | undefined,
  options?: LiscaHookQueryOptions<AnnotationLabel[]>,
) {
  return useQuery(
    enabledQueryOptions(
      backend && workspacePath
        ? annotationLabelsQueryOptions(backend, workspacePath)
        : null,
      options,
    ),
  );
}

export function useRawAnnotationSourceQuery(
  backend: ViewerDataPort | null | undefined,
  workspacePath: string | null | undefined,
  options?: Omit<
    UseQueryOptions<ViewerSource | null, Error, ViewerSource | null, readonly unknown[]>,
    "queryKey" | "queryFn" | "initialData"
  >,
) {
  return useQuery(
    enabledQueryOptions(
      backend && workspacePath
        ? rawAnnotationSourceQueryOptions(backend, workspacePath)
        : null,
      options,
    ),
  );
}

export function useAutoExcludePreviewQuery(
  backend: ViewerDataPort | null | undefined,
  request: AutoExcludePreviewRequest | null | undefined,
  options?: Omit<
    UseQueryOptions<AutoExcludePreviewResponse, Error, AutoExcludePreviewResponse, readonly unknown[]>,
    "queryKey" | "queryFn" | "initialData"
  >,
) {
  return useQuery({
    ...enabledQueryOptions(
      backend && request ? autoExcludePreviewQueryOptions(backend, request) : null,
      options,
    ),
    staleTime: options?.staleTime ?? 0,
  });
}

/** Tier A: metadata only; mask is not written to the query cache. */
export function useRoiFrameAnnotationMetaQuery(
  backend: ViewerDataPort | null | undefined,
  workspacePath: string | null | undefined,
  request: RoiFrameRequest | null | undefined,
  options?: LiscaHookQueryOptions<RoiFrameAnnotation>,
) {
  return useQuery(
    enabledQueryOptions(
      backend && workspacePath && request
        ? roiFrameAnnotationMetaQueryOptions(backend, workspacePath, request)
        : null,
      options,
    ),
  );
}

/** Tier A: metadata only; mask is not written to the query cache. */
export function useRawFrameAnnotationMetaQuery(
  backend: ViewerDataPort | null | undefined,
  workspacePath: string | null | undefined,
  source: ViewerSource | null | undefined,
  request: RawFrameRequest | null | undefined,
  options?: LiscaHookQueryOptions<RawFrameAnnotation>,
) {
  return useQuery(
    enabledQueryOptions(
      backend && workspacePath && source && request
        ? rawFrameAnnotationMetaQueryOptions(backend, workspacePath, source, request)
        : null,
      options,
    ),
  );
}

// --- Mutations ---

function requireBackend(backend: ViewerDataPort | null | undefined): ViewerDataPort {
  if (!backend) {
    throw new Error("Viewer data backend is not available");
  }
  return backend;
}

export function useSaveAnnotationLabelsMutation(
  backend: ViewerDataPort | null | undefined,
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
      requireBackend(backend).saveAnnotationLabels(workspacePath, labels),
    onSuccess: (data, variables, onMutateResult, context) => {
      qc.setQueryData(queryKeys.annotationLabels(variables.workspacePath), data);
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useSaveRoiFrameAnnotationMutation(
  backend: ViewerDataPort | null | undefined,
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
      requireBackend(backend).saveRoiFrameAnnotation(workspacePath, request, annotation),
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
  backend: ViewerDataPort | null | undefined,
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
      requireBackend(backend).saveRawFrameAnnotation(workspacePath, source, request, annotation),
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
  backend: ViewerDataPort | null | undefined,
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
      requireBackend(backend).saveBbox(workspacePath, source, pos, csv, alignState),
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
  backend: ViewerDataPort | null | undefined,
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
      requireBackend(backend).cropRoi(workspacePath, source, pos, format, requestId, batch),
    onSuccess: (data, variables, onMutateResult, context) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.scanRoiWorkspace(variables.workspacePath),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useCancelCropRoiMutation(
  backend: ViewerDataPort | null | undefined,
  options?: UseMutationOptions<void, Error, { requestId: string }>,
) {
  return useMutation({
    ...options,
    mutationFn: ({ requestId }) => requireBackend(backend).cancelCropRoi(requestId),
  });
}

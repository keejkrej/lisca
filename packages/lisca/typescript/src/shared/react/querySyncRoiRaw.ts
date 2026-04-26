import type { UseQueryResult } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { MutableRefObject } from "react";
import { useEffect } from "react";

import type {
  RawFrameRequest,
  RoiFrameRequest,
  RoiWorkspaceScan,
  ViewerDataPort,
  ViewerSource,
  WorkspaceScan,
} from "lisca/shared/contracts";
import {
  rawFrameAnnotationMetaQueryOptions,
  roiFrameAnnotationMetaQueryOptions,
} from "lisca/shared/query";
import {
  patchRawState,
  patchRoiState,
  setBoundRawSource,
  setRawScan,
  setRawSource,
  setRoiScan,
} from "lisca/shared/state";

import { toErrorMessage } from "./errors";

/** Bridges `useScanRoiWorkspaceQuery` into {@link roiStore} (Annotator ROI mode, Roi workspace). */
export function useSyncRoiWorkspaceQueryToRoiStore(
  workspacePath: string | null | undefined,
  query: UseQueryResult<RoiWorkspaceScan, Error>,
) {
  useEffect(() => {
    if (!workspacePath) {
      return;
    }

    if (query.isPending) {
      patchRoiState({ loading: true, error: null });
      return;
    }

    if (query.isError) {
      patchRoiState({
        loading: false,
        scan: null,
        selection: null,
        pageIndex: 0,
        selectedRoi: null,
        error: toErrorMessage(query.error),
      });
      return;
    }

    if (query.data) {
      setRoiScan(query.data);
      patchRoiState({ loading: false, error: null });
    }
  }, [workspacePath, query.data, query.error, query.isError, query.isPending]);
}

/** Bridges `useRawAnnotationSourceQuery` into bound/raw source (deduped by `lastSyncKeyRef`). */
export function useSyncRawAnnotationSourceQueryToRawStores(
  workspacePath: string | null | undefined,
  query: UseQueryResult<ViewerSource | null, Error>,
  lastSyncKeyRef: MutableRefObject<string | null>,
) {
  useEffect(() => {
    if (!workspacePath) return;

    if (query.isPending) {
      return;
    }

    if (query.isError) {
      setBoundRawSource(null);
      patchRawState({ error: toErrorMessage(query.error) });
      return;
    }

    const src = query.data ?? null;
    const key = `${workspacePath}:${src ? `${src.kind}:${src.path}` : ""}`;
    if (lastSyncKeyRef.current === key) {
      return;
    }
    lastSyncKeyRef.current = key;
    setBoundRawSource(src);
    setRawSource(src);
  }, [workspacePath, query.data, query.error, query.isError, query.isPending, lastSyncKeyRef]);
}

/** Bridges `useScanSourceQuery` (raw mode) into {@link rawStore}. */
export function useSyncRawScanQueryToRawStore(
  dataMode: "roi" | "raw",
  workspacePath: string | null | undefined,
  rawSource: ViewerSource | null,
  query: UseQueryResult<WorkspaceScan, Error>,
) {
  useEffect(() => {
    if (dataMode !== "raw") {
      patchRawState({
        scan: null,
        selection: null,
        loading: false,
      });
      return;
    }
    if (!workspacePath || !rawSource) {
      patchRawState({
        scan: null,
        selection: null,
        loading: false,
      });
      return;
    }

    if (query.isPending) {
      patchRawState({ loading: true, error: null });
      return;
    }

    if (query.isError) {
      patchRawState({
        scan: null,
        selection: null,
        loading: false,
        error: toErrorMessage(query.error),
      });
      return;
    }

    if (query.data) {
      setRawScan(query.data);
      patchRawState({ loading: false, error: null });
    }
  }, [
    dataMode,
    query.data,
    query.error,
    query.isError,
    query.isPending,
    rawSource,
    workspacePath,
  ]);
}

/** After a successful editor frame load, warm Tier A annotation metadata in the React Query cache. */
export function prefetchAnnotationMetaForEditor(
  queryClient: QueryClient,
  backend: ViewerDataPort,
  workspacePath: string,
  kind: "roi" | "raw",
  roiRequest: RoiFrameRequest | null,
  rawSource: ViewerSource | null,
  rawRequest: RawFrameRequest | null,
) {
  if (kind === "roi" && roiRequest) {
    void queryClient.prefetchQuery(roiFrameAnnotationMetaQueryOptions(backend, workspacePath, roiRequest));
    return;
  }
  if (kind === "raw" && rawSource && rawRequest) {
    void queryClient.prefetchQuery(rawFrameAnnotationMetaQueryOptions(backend, workspacePath, rawSource, rawRequest));
  }
}

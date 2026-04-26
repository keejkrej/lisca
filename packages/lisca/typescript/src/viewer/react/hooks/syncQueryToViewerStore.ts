import type { UseQueryResult } from "@tanstack/react-query";
import { useEffect } from "react";

import type { SavedAlignState, ViewerSource, WorkspaceScan } from "lisca/shared/contracts";
import { coerceSelection, createSelection } from "lisca/shared/core";
import { initialAlignSelection, showErrorToast } from "lisca/shared/react";

import { applySavedAlignState, patchViewState, setGrid, setSource, setTimeSliderIndex, setWorkspacePath } from "../app/viewerStore";
import { toErrorMessage } from "../app/viewerEffects";

/** Bridges `useScanSourceQuery` into the viewer store (align workspace). */
export function useSyncScanSourceQueryToViewerStore(
  source: ViewerSource | null,
  query: UseQueryResult<WorkspaceScan, Error>,
) {
  useEffect(() => {
    if (!source) return;

    if (query.isPending) {
      patchViewState({
        loading: true,
        error: null,
        frame: null,
        scan: null,
        selection: null,
        contrastMode: "manual",
      });
      return;
    }

    if (query.isError) {
      patchViewState({ loading: false, error: toErrorMessage(query.error) });
      return;
    }

    if (query.data) {
      const scanData = query.data;
      const nextSelection = coerceSelection(scanData, createSelection(scanData));
      patchViewState({
        scan: scanData,
        selection: nextSelection,
        loading: false,
        error: null,
      });
    }
  }, [source, query.data, query.error, query.isError, query.isPending]);
}

/** Bridges `useAlignStateQuery` into `applySavedAlignState`; optional `onAfterApply` (e.g. Studio enables grid). */
export function useSyncAlignStateQueryToViewerStore(
  selectedPos: number | null,
  workspacePath: string | null | undefined,
  query: UseQueryResult<SavedAlignState | null, Error>,
  onAfterApply?: () => void,
) {
  useEffect(() => {
    if (selectedPos == null) return;

    if (!workspacePath) {
      applySavedAlignState(selectedPos, null);
      return;
    }

    if (query.isError) {
      showErrorToast(toErrorMessage(query.error));
      return;
    }

    if (query.isSuccess) {
      applySavedAlignState(selectedPos, query.data);
      onAfterApply?.();
    }
  }, [onAfterApply, query.data, query.error, query.isError, query.isSuccess, selectedPos, workspacePath]);
}

/** Embeddable align flow (e.g. Studio wizard): scan query plus workspace/source wiring and time slider. */
export function useSyncScanSourceQueryToViewerAlignStore(
  backendReady: boolean,
  workspaceTrim: string,
  sourceInferred: ViewerSource | null,
  query: UseQueryResult<WorkspaceScan, Error>,
) {
  useEffect(() => {
    if (!backendReady || !workspaceTrim || !sourceInferred) return;

    setWorkspacePath(workspaceTrim);
    setSource(sourceInferred);

    if (query.isPending) {
      patchViewState({
        loading: true,
        error: null,
        frame: null,
        scan: null,
        selection: null,
        contrastMode: "manual",
      });
      return;
    }

    if (query.isError) {
      patchViewState({ loading: false, error: toErrorMessage(query.error) });
      return;
    }

    if (query.data) {
      const scanned = query.data;
      const sel = coerceSelection(scanned, initialAlignSelection(scanned));
      patchViewState({ scan: scanned, selection: sel, loading: false, error: null });
      setGrid((g) => ({ ...g, enabled: true }));
      const ti = scanned.times.indexOf(sel.time);
      setTimeSliderIndex(ti >= 0 ? ti : 0);
    }
  }, [
    backendReady,
    workspaceTrim,
    sourceInferred,
    query.data,
    query.error,
    query.isError,
    query.isPending,
  ]);
}

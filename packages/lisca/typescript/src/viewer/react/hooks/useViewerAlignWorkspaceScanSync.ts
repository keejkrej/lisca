import { useStore } from "zustand";

import type { ViewerDataPort, ViewerSource } from "lisca/shared/contracts";
import { useAlignStateQuery, useScanSourceQuery } from "lisca/shared/query";

import { viewerStore } from "../app/viewerStore";
import { useSyncAlignStateQueryToViewerStore, useSyncScanSourceQueryToViewerStore } from "./syncQueryToViewerStore";

/** Owns scan + align TanStack queries and bridges them into {@link viewerStore}. */
export function useViewerAlignWorkspaceScanSync(
  backend: ViewerDataPort,
  workspacePath: string | null,
  source: ViewerSource | null,
) {
  const selectedPos = useStore(viewerStore, (s) => s.selection?.pos ?? null);

  const scanSourceQuery = useScanSourceQuery(backend, source, {
    enabled: Boolean(source),
  });
  const alignQuery = useAlignStateQuery(backend, workspacePath, selectedPos, {
    enabled: selectedPos != null && Boolean(workspacePath),
  });

  useSyncScanSourceQueryToViewerStore(source, scanSourceQuery);
  useSyncAlignStateQueryToViewerStore(selectedPos, workspacePath, alignQuery);
}

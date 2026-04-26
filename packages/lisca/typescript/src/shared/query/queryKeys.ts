import type {
  AutoExcludePreviewRequest,
  RawFrameRequest,
  RoiFrameRequest,
  ViewerSource,
} from "lisca/shared/contracts";

/**
 * Stable query keys for ViewerDataPort-backed queries.
 *
 * Policy: never key or cache {@link import("lisca/shared/contracts").FrameResult}
 * (pixel buffers). Large mask payloads use Tier A metadata keys only; see
 * `fetchRoiFrameAnnotationMeta` / `fetchRawFrameAnnotationMeta` in hooks.
 *
 * Tier B (full Loaded* in cache) is intentionally not implemented here; if added
 * later, use a dedicated key root, aggressive `gcTime`, and strict per-frame keys.
 *
 * ROI workspace **thumbnail tiles** stay off this key tree: they load pixels via
 * `loadRoiFrameEffect` inside `useRoiVisibleTileFrames` (in-memory tile cache only),
 * not TanStack Query, to avoid holding many `FrameResult` buffers in the query cache.
 *
 * **Annotator editor (Tier B deferred):** full `loadRoiFrameAnnotation` /
 * `loadRawFrameAnnotation` payloads (metadata plus base64 mask) are loaded in
 * `useLoadFrameAnnotationForEditor`, not under these keys, so decoded masks never enter
 * the query cache. A future Tier B option could add a dedicated per-frame key family with
 * `gcTime: 0` / `staleTime: 0` if cache-level deduplication is worth the complexity.
 */
export const queryKeys = {
  all: ["lisca"] as const,

  scanSource: (source: ViewerSource) =>
    [...queryKeys.all, "scanSource", source.kind, source.path] as const,

  scanRoiWorkspace: (workspacePath: string) =>
    [...queryKeys.all, "scanRoiWorkspace", workspacePath] as const,

  savedBboxPositions: (workspacePath: string) =>
    [...queryKeys.all, "savedBboxPositions", workspacePath] as const,

  alignState: (workspacePath: string, pos: number) =>
    [...queryKeys.all, "alignState", workspacePath, pos] as const,

  annotationLabels: (workspacePath: string) =>
    [...queryKeys.all, "annotationLabels", workspacePath] as const,

  rawAnnotationSource: (workspacePath: string) =>
    [...queryKeys.all, "rawAnnotationSource", workspacePath] as const,

  autoExcludePreview: (request: AutoExcludePreviewRequest) =>
    [
      ...queryKeys.all,
      "autoExcludePreview",
      request.source.kind,
      request.source.path,
      request.selection.pos,
      request.selection.channel,
      request.selection.time,
      request.selection.z,
      stablePreviewCellsKey(request.cells),
    ] as const,

  roiFrameAnnotationMeta: (workspacePath: string, request: RoiFrameRequest) =>
    [
      ...queryKeys.all,
      "roiFrameAnnotationMeta",
      workspacePath,
      request.pos,
      request.roi,
      request.channel,
      request.time,
      request.z,
    ] as const,

  rawFrameAnnotationMeta: (
    workspacePath: string,
    source: ViewerSource,
    request: RawFrameRequest,
  ) =>
    [
      ...queryKeys.all,
      "rawFrameAnnotationMeta",
      workspacePath,
      source.kind,
      source.path,
      request.pos,
      request.channel,
      request.time,
      request.z,
    ] as const,
};

function stablePreviewCellsKey(
  cells: AutoExcludePreviewRequest["cells"],
): string {
  if (cells.length === 0) return "cells:[]";
  const sorted = [...cells].sort((a, b) => a.i - b.i || a.j - b.j);
  return JSON.stringify(sorted);
}

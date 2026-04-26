/**
 * Shared TanStack Query integration for `ViewerDataPort` IPC.
 *
 * **Cache policy:** queryFns in this module never persist {@link import("../../viewer/contracts").FrameResult}
 * (pixel buffers) or full annotation mask payloads. ROI/raw annotation hooks use Tier A metadata only.
 * For masks, call `ViewerDataPort.loadRoiFrameAnnotation` / `loadRawFrameAnnotation` imperatively outside Query.
 */

export { createLiscaQueryClient } from "./createLiscaQueryClient";
export { LiscaQueryProvider } from "./LiscaQueryProvider";
export { queryKeys } from "./queryKeys";
export { prefetchAnnotatorWorkspaceShell } from "./prefetch";
export { fetchAutoExcludePreview, fetchSavedBboxPositions } from "./imperativeFetch";
export { fetchRawFrameAnnotationMeta, fetchRoiFrameAnnotationMeta } from "./annotationMeta";
export {
  useAlignStateQuery,
  useAnnotationLabelsQuery,
  useAutoExcludePreviewQuery,
  useCancelCropRoiMutation,
  useCropRoiMutation,
  useRawAnnotationSourceQuery,
  useRawFrameAnnotationMetaQuery,
  useRoiFrameAnnotationMetaQuery,
  useSaveAnnotationLabelsMutation,
  useSaveBboxMutation,
  useSaveRawFrameAnnotationMutation,
  useSaveRoiFrameAnnotationMutation,
  useSavedBboxPositionsQuery,
  useScanRoiWorkspaceQuery,
  useScanSourceQuery,
} from "./hooks";

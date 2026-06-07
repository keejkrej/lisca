import type { AlignCanvasProps } from "./align-canvas";
import type { AnnotationCanvasProps } from "./annotation-canvas";

export function areAlignCanvasPropsEqual(
  prev: AlignCanvasProps,
  next: AlignCanvasProps,
): boolean {
  return (
    prev.frame === next.frame &&
    prev.grid === next.grid &&
    prev.previewGrid === next.previewGrid &&
    prev.excludedCells === next.excludedCells &&
    prev.loading === next.loading &&
    prev.emptyText === next.emptyText &&
    prev.className === next.className &&
    prev.cursor === next.cursor &&
    prev.messages === next.messages &&
    prev.toasts === next.toasts &&
    prev.onVirtualPointerDown === next.onVirtualPointerDown &&
    prev.onVirtualPointerMove === next.onVirtualPointerMove &&
    prev.onVirtualPointerUp === next.onVirtualPointerUp &&
    prev.onVirtualPointerCancel === next.onVirtualPointerCancel &&
    prev.onVirtualWheel === next.onVirtualWheel
  );
}

export function areAnnotationCanvasPropsEqual(
  prev: AnnotationCanvasProps,
  next: AnnotationCanvasProps,
): boolean {
  return (
    prev.frame === next.frame &&
    prev.labels === next.labels &&
    prev.mask === next.mask &&
    prev.activeLabelId === next.activeLabelId &&
    prev.tool === next.tool &&
    prev.brushSize === next.brushSize &&
    prev.overlayOpacity === next.overlayOpacity &&
    prev.disabled === next.disabled &&
    prev.className === next.className &&
    prev.emptyText === next.emptyText &&
    prev.messages === next.messages &&
    prev.toasts === next.toasts &&
    prev.onMaskCommit === next.onMaskCommit
  );
}

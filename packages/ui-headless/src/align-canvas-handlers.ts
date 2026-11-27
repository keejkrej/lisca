import type { AlignGridState } from "@lisca/contracts";
import {
  applyAlignGridPointerGesture,
  beginAlignGridPointerGesture,
  type AlignGridPointerGestureSession,
  type AlignGridPointerIntent,
  type AlignGridToolMode,
  type AlignGridWheelViewport,
} from "@lisca/utils";

export type AlignCanvasFramePoint = {
  x: number;
  y: number;
};

export type AlignCanvasPointerEvent = {
  pointerId: number;
  pointerType: string;
  button: number;
  buttons: number;
  altKey?: boolean | undefined;
  clientX: number;
  clientY: number;
  framePoint: AlignCanvasFramePoint | null;
  viewport: AlignGridWheelViewport | null;
  preventDefault: () => void;
  capturePointer: () => void;
  releasePointer: () => void;
};

export type AlignCanvasGridHandlersOptions = {
  grid: AlignGridState;
  onCommit: (
    preview: AlignGridState,
    intent: AlignGridPointerIntent,
    startGrid: AlignGridState,
  ) => void;
  toolMode: AlignGridToolMode;
  spacingZoomLocked?: boolean | undefined;
  patternZoomLocked?: boolean | undefined;
  disabled?: boolean | undefined;
  /** Called when the in-flight preview grid changes; canvas should redraw locally. */
  onPreviewGridChange?: (() => void) | undefined;
  /** Called when the dragging state changes. */
  onDraggingChange?: ((dragging: boolean) => void) | undefined;
};

export type UseAlignCanvasGridHandlersOptions = AlignCanvasGridHandlersOptions;

export type AlignCanvasGridHandlers = {
  previewGridRef: { current: AlignGridState | null };
  dragging: () => boolean;
  handlePointerDown: (event: AlignCanvasPointerEvent) => void;
  handlePointerMove: (event: AlignCanvasPointerEvent) => void;
  handlePointerEnd: (event: AlignCanvasPointerEvent) => void;
  handlePointerCancel: (event: AlignCanvasPointerEvent) => void;
};

export function createAlignCanvasGridHandlers(
  options: () => AlignCanvasGridHandlersOptions,
): AlignCanvasGridHandlers {
  const gestureRef = { current: null as AlignGridPointerGestureSession | null };
  const previewGridRef = { current: null as AlignGridState | null };
  let isDragging = false;

  const setDragging = (next: boolean) => {
    if (isDragging === next) return;
    isDragging = next;
    options().onDraggingChange?.(next);
  };

  const notifyPreviewChange = () => {
    options().onPreviewGridChange?.();
  };

  const handlePointerDown = (event: AlignCanvasPointerEvent) => {
    const {
      disabled = false,
      grid,
      spacingZoomLocked = false,
      patternZoomLocked = false,
      toolMode,
    } = options();
    if (disabled || !event.viewport || !grid.enabled) return;
    if (toolMode === "magnifier") return;
    if (spacingZoomLocked && toolMode === "zoom-spacing") return;
    if (patternZoomLocked && toolMode === "zoom-pattern") return;
    if (event.pointerType === "mouse" && event.button !== 0) {
      event.preventDefault();
      return;
    }
    const session = beginAlignGridPointerGesture(grid, event, toolMode);
    if (!session) return;
    event.preventDefault();
    event.capturePointer();
    gestureRef.current = session;
    previewGridRef.current = null;
    setDragging(true);
  };

  const handlePointerMove = (event: AlignCanvasPointerEvent) => {
    const gesture = gestureRef.current;
    if (!gesture || !event.viewport || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    previewGridRef.current = applyAlignGridPointerGesture(gesture, event, event.viewport);
    notifyPreviewChange();
  };

  const handlePointerEnd = (event: AlignCanvasPointerEvent) => {
    const gesture = gestureRef.current;
    if (gesture?.pointerId !== event.pointerId) return;
    // The session is cleared below. Intent and the gesture's start grid have to be copied first.
    const { intent, startGrid } = gesture;
    const { onCommit } = options();
    gestureRef.current = null;
    const committedPreviewGrid = previewGridRef.current;
    if (committedPreviewGrid) onCommit(committedPreviewGrid, intent, startGrid);
    previewGridRef.current = null;
    setDragging(false);
    notifyPreviewChange();
    event.releasePointer();
  };

  const handlePointerCancel = (event: AlignCanvasPointerEvent) => {
    if (gestureRef.current?.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    previewGridRef.current = null;
    setDragging(false);
    notifyPreviewChange();
    event.releasePointer();
  };

  return {
    previewGridRef,
    dragging: () => isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
    handlePointerCancel,
  };
}

export const useAlignCanvasGridHandlers = createAlignCanvasGridHandlers;

export function cursorForAlignTool(
  toolMode: AlignGridToolMode,
  gridEnabled: boolean,
  dragging: boolean,
) {
  if (toolMode === "magnifier") return "zoom-in";
  if (!gridEnabled) return "default";
  if (dragging) return "grabbing";
  if (toolMode === "pan") return "grab";
  if (toolMode === "rotate") return "crosshair";
  return "zoom-in";
}

import type { AnnotationLabel } from "@lisca/contracts";
import {
  clamp,
  clientToFramePoint,
  computeFrameLayout,
  fillPolygon,
  isMagnifierAnnotationTool,
  isSmartAnnotationTool,
  strokeMask,
  type AnnotationTool,
  type FrameResult,
} from "@lisca/utils";

export type AnnotationCanvasFramePoint = {
  x: number;
  y: number;
};

export type AnnotationCanvasPointerEvent = {
  pointerId: number;
  pointerType: string;
  button: number;
  clientX: number;
  clientY: number;
  preventDefault: () => void;
  capturePointer: () => void;
  releasePointer: () => void;
};

export type AnnotationCanvasHandlersOptions = {
  frame: FrameResult | null;
  viewportWidth: number;
  viewportHeight: number;
  viewportX?: number | undefined;
  viewportY?: number | undefined;
  mask: Uint8Array;
  labels: AnnotationLabel[];
  activeLabelId: string | null;
  tool: AnnotationTool;
  brushSize: number;
  disabled?: boolean | undefined;
  onMaskCommit: (mask: Uint8Array) => void;
  onSmartSegmentClick?: ((click: { x: number; y: number; negative: boolean }) => void) | undefined;
  onSmartEraseClick?: ((click: { x: number; y: number }) => void) | undefined;
  onStateChange?: (() => void) | undefined;
};

export type UseAnnotationCanvasHandlersOptions = AnnotationCanvasHandlersOptions;

export type AnnotationCanvasHandlers = {
  activeLabelValue: () => number;
  brushMode: () => boolean;
  cursor: () => string;
  drawing: () => boolean;
  eraseMode: () => boolean;
  handlePointerCancel: (event: AnnotationCanvasPointerEvent) => boolean;
  handlePointerDown: (event: AnnotationCanvasPointerEvent) => boolean;
  handlePointerEnd: (event: AnnotationCanvasPointerEvent) => boolean;
  handlePointerMove: (event: AnnotationCanvasPointerEvent) => boolean;
  lassoPoints: () => AnnotationCanvasFramePoint[];
  smartEraseMode: () => boolean;
  smartToolMode: () => boolean;
};

type LassoSession = {
  pointerId: number;
  points: AnnotationCanvasFramePoint[];
};

export function activeLabelValueForId(
  labels: AnnotationLabel[],
  activeLabelId: string | null,
): number {
  if (!activeLabelId) return 0;
  const index = labels.findIndex((label) => label.id === activeLabelId);
  return index >= 0 ? index + 1 : 0;
}

export function framePointFromViewport(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
  boundsX: number,
  boundsY: number,
  frameWidth: number,
  frameHeight: number,
): AnnotationCanvasFramePoint | null {
  const layout = computeFrameLayout(viewportWidth, viewportHeight, frameWidth, frameHeight);
  const point = clientToFramePoint(clientX, clientY, layout, boundsX, boundsY);
  if (!point) return null;
  return {
    x: clamp(Math.floor(point.x), 0, frameWidth - 1),
    y: clamp(Math.floor(point.y), 0, frameHeight - 1),
  };
}

export function createAnnotationCanvasHandlers(
  options: () => AnnotationCanvasHandlersOptions,
): AnnotationCanvasHandlers {
  const lassoRef = { current: null as LassoSession | null };
  let currentLassoPoints: AnnotationCanvasFramePoint[] = [];
  let isDrawing = false;

  const notifyStateChange = () => {
    options().onStateChange?.();
  };

  const framePointFromEvent = (event: AnnotationCanvasPointerEvent) => {
    const { frame, viewportWidth, viewportHeight, viewportX = 0, viewportY = 0 } = options();
    if (!frame) return null;
    return framePointFromViewport(
      event.clientX,
      event.clientY,
      viewportWidth,
      viewportHeight,
      viewportX,
      viewportY,
      frame.width,
      frame.height,
    );
  };

  const finishLasso = (event: AnnotationCanvasPointerEvent) => {
    const active = lassoRef.current;
    const { frame, mask, labels, activeLabelId, tool, brushSize, onMaskCommit } = options();
    if (!active || active.pointerId !== event.pointerId || !frame) return;
    lassoRef.current = null;
    currentLassoPoints = [];
    isDrawing = false;
    notifyStateChange();
    event.releasePointer();

    const eraseMode = tool === "brush-erase" || tool === "lasso-erase";
    const brushMode = tool === "brush" || tool === "brush-erase";
    const activeLabelValue = activeLabelValueForId(labels, activeLabelId);
    const value = eraseMode ? 0 : activeLabelValue;
    if (value <= 0 && !eraseMode) return;
    if (brushMode) {
      onMaskCommit(strokeMask(mask, frame.width, frame.height, active.points, value, brushSize));
    } else if (active.points.length >= 3) {
      onMaskCommit(fillPolygon(mask, frame.width, frame.height, active.points, value));
    }
  };

  const handlePointerDown = (event: AnnotationCanvasPointerEvent): boolean => {
    const {
      disabled = false,
      frame,
      labels,
      activeLabelId,
      tool,
      onSmartSegmentClick,
      onSmartEraseClick,
    } = options();
    if (disabled || !frame) return false;
    if (isMagnifierAnnotationTool(tool)) return false;
    const point = framePointFromEvent(event);
    if (!point) return false;

    const smartToolMode = isSmartAnnotationTool(tool);
    const smartEraseMode = tool === "smart-erase";
    const eraseMode = tool === "brush-erase" || tool === "lasso-erase";
    const activeLabelValue = activeLabelValueForId(labels, activeLabelId);

    if (smartToolMode) {
      if (event.button !== 0 && event.button !== 2) return false;
      if (activeLabelValue <= 0) return false;
      event.preventDefault();
      if (smartEraseMode) {
        if (event.button !== 0) return false;
        onSmartEraseClick?.({ x: point.x, y: point.y });
        return true;
      }
      onSmartSegmentClick?.({
        x: point.x,
        y: point.y,
        negative: event.button === 2,
      });
      return true;
    }

    if (event.button !== 0) return false;
    if (!eraseMode && activeLabelValue <= 0) return false;
    event.preventDefault();
    event.capturePointer();
    lassoRef.current = {
      pointerId: event.pointerId,
      points: [point],
    };
    currentLassoPoints = [point];
    isDrawing = true;
    notifyStateChange();
    return true;
  };

  const handlePointerMove = (event: AnnotationCanvasPointerEvent): boolean => {
    const { tool } = options();
    if (isMagnifierAnnotationTool(tool)) return false;
    if (isSmartAnnotationTool(tool)) return false;
    const active = lassoRef.current;
    if (!active || active.pointerId !== event.pointerId) return false;
    const point = framePointFromEvent(event);
    if (!point) return false;
    const last = active.points[active.points.length - 1];
    if (last && Math.abs(last.x - point.x) + Math.abs(last.y - point.y) < 2) return true;
    active.points.push(point);
    currentLassoPoints = active.points.slice();
    notifyStateChange();
    return true;
  };

  const handlePointerEnd = (event: AnnotationCanvasPointerEvent): boolean => {
    const { tool } = options();
    if (isMagnifierAnnotationTool(tool)) return false;
    if (isSmartAnnotationTool(tool)) return false;
    if (!lassoRef.current || lassoRef.current.pointerId !== event.pointerId) return false;
    finishLasso(event);
    return true;
  };

  const handlePointerCancel = (event: AnnotationCanvasPointerEvent): boolean => {
    if (!lassoRef.current || lassoRef.current.pointerId !== event.pointerId) return false;
    lassoRef.current = null;
    currentLassoPoints = [];
    isDrawing = false;
    notifyStateChange();
    event.releasePointer();
    return true;
  };

  const activeLabelValue = (): number =>
    activeLabelValueForId(options().labels, options().activeLabelId);
  const brushMode = (): boolean => {
    const tool = options().tool;
    return tool === "brush" || tool === "brush-erase";
  };
  const eraseMode = (): boolean => {
    const tool = options().tool;
    return tool === "brush-erase" || tool === "lasso-erase";
  };
  const smartToolMode = (): boolean => isSmartAnnotationTool(options().tool);
  const smartEraseMode = (): boolean => options().tool === "smart-erase";
  const cursor = (): string => {
    const { disabled = false, frame, tool } = options();
    if (!frame) return "default";
    if (isMagnifierAnnotationTool(tool)) return "zoom-in";
    return disabled ? "default" : "crosshair";
  };

  return {
    activeLabelValue,
    brushMode,
    cursor,
    drawing: () => isDrawing,
    eraseMode,
    handlePointerCancel,
    handlePointerDown,
    handlePointerEnd,
    handlePointerMove,
    lassoPoints: () => currentLassoPoints,
    smartEraseMode,
    smartToolMode,
  };
}

export const useAnnotationCanvasHandlers = createAnnotationCanvasHandlers;

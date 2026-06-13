import type { AnnotationLabel } from "@lisca/contracts";
import {
  clamp,
  clientToFramePoint,
  computeFrameLayout,
  fillPolygon,
  strokeMask,
  type FrameResult,
} from "@lisca/utils";
import { useRef, useState } from "react";

import { isSmartAnnotationTool, type AnnotationTool } from "./annotation-tools";

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

export type UseAnnotationCanvasHandlersOptions = {
  frame: FrameResult | null;
  viewportWidth: number;
  viewportHeight: number;
  viewportX?: number;
  viewportY?: number;
  mask: Uint8Array;
  labels: AnnotationLabel[];
  activeLabelId: string | null;
  tool: AnnotationTool;
  brushSize: number;
  disabled?: boolean;
  onMaskCommit: (mask: Uint8Array) => void;
  onSmartSegmentClick?: (click: { x: number; y: number; negative: boolean }) => void;
  onSmartEraseClick?: (click: { x: number; y: number }) => void;
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

export function useAnnotationCanvasHandlers({
  frame,
  viewportWidth,
  viewportHeight,
  viewportX = 0,
  viewportY = 0,
  mask,
  labels,
  activeLabelId,
  tool,
  brushSize,
  disabled = false,
  onMaskCommit,
  onSmartSegmentClick,
  onSmartEraseClick,
}: UseAnnotationCanvasHandlersOptions) {
  const lassoRef = useRef<LassoSession | null>(null);
  const [lassoPoints, setLassoPoints] = useState<AnnotationCanvasFramePoint[]>([]);
  const [drawing, setDrawing] = useState(false);

  const activeLabelValue = activeLabelValueForId(labels, activeLabelId);
  const eraseMode = tool === "brush-erase" || tool === "lasso-erase";
  const brushMode = tool === "brush" || tool === "brush-erase";
  const smartToolMode = isSmartAnnotationTool(tool);
  const smartEraseMode = tool === "smart-erase";

  const framePointFromEvent = (event: AnnotationCanvasPointerEvent) => {
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
    if (!active || active.pointerId !== event.pointerId || !frame) return;
    lassoRef.current = null;
    setLassoPoints([]);
    setDrawing(false);
    event.releasePointer();

    const value = eraseMode ? 0 : activeLabelValue;
    if (value <= 0 && !eraseMode) return;
    if (brushMode) {
      onMaskCommit(
        strokeMask(mask, frame.width, frame.height, active.points, value, brushSize),
      );
    } else if (active.points.length >= 3) {
      onMaskCommit(fillPolygon(mask, frame.width, frame.height, active.points, value));
    }
  };

  const handlePointerDown = (event: AnnotationCanvasPointerEvent) => {
    if (disabled || !frame) return false;
    const point = framePointFromEvent(event);
    if (!point) return false;

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
    setLassoPoints([point]);
    setDrawing(true);
    return true;
  };

  const handlePointerMove = (event: AnnotationCanvasPointerEvent) => {
    if (smartToolMode) return false;
    const active = lassoRef.current;
    if (!active || active.pointerId !== event.pointerId) return false;
    const point = framePointFromEvent(event);
    if (!point) return false;
    const last = active.points[active.points.length - 1];
    if (last && Math.abs(last.x - point.x) + Math.abs(last.y - point.y) < 2) return true;
    active.points.push(point);
    setLassoPoints(active.points.slice());
    return true;
  };

  const handlePointerEnd = (event: AnnotationCanvasPointerEvent) => {
    if (smartToolMode) return false;
    if (!lassoRef.current || lassoRef.current.pointerId !== event.pointerId) return false;
    finishLasso(event);
    return true;
  };

  const handlePointerCancel = (event: AnnotationCanvasPointerEvent) => {
    if (!lassoRef.current || lassoRef.current.pointerId !== event.pointerId) return false;
    lassoRef.current = null;
    setLassoPoints([]);
    setDrawing(false);
    event.releasePointer();
    return true;
  };

  const cursor =
    disabled || !frame ? "default" : smartToolMode || drawing ? "crosshair" : "crosshair";

  return {
    activeLabelValue,
    brushMode,
    cursor,
    drawing,
    eraseMode,
    handlePointerCancel,
    handlePointerDown,
    handlePointerEnd,
    handlePointerMove,
    lassoPoints,
    smartEraseMode,
    smartToolMode,
  };
}

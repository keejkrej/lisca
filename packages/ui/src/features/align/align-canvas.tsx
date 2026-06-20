"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import type { CanvasStatusMessage } from "@lisca/ui-headless";
import {
  alignGridOverlayColors,
  buildAlignFrameHaloRect,
  buildAlignGridOverlayScene,
  computeFrameLayout,
  type AlignGridWheelViewport,
} from "@lisca/utils";
import { cn } from "../../lib/utils";
import { useLatest } from "../../hooks/use-latest";
import { CanvasStatusMessageStack, CanvasToastStack } from "../canvas/canvas-status";
import { resolvedCanvasBackground, useCanvasThemeRerender } from "../canvas/canvas-theme";
import { usePreparedFrameBitmap } from "../canvas/prepared-frame-bitmap";
export type { AlignCanvasFramePoint, AlignCanvasPointerEvent } from "./align-canvas-handlers";
import type { AlignCanvasFramePoint, AlignCanvasPointerEvent } from "./align-canvas-handlers";
export type AlignCanvasWheelEvent = {
  deltaMode: number;
  deltaX: number;
  deltaY: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  clientX: number;
  clientY: number;
  framePoint: AlignCanvasFramePoint | null;
  viewport: AlignGridWheelViewport | null;
  preventDefault: () => void;
};
export type AlignCanvasProps = {
  frame: FrameResult | null;
  grid: AlignGridState;
  previewGridRef?: RefObject<AlignGridState | null>;
  previewRedrawRef?: RefObject<(() => void) | null>;
  excludedCells?: Iterable<AlignGridCellCoord>;
  emptyText?: string;
  messages?: CanvasStatusMessage[];
  toasts?: CanvasStatusMessage[];
  className?: string;
  cursor?: string;
  onVirtualPointerDown?: (event: AlignCanvasPointerEvent) => void;
  onVirtualPointerMove?: (event: AlignCanvasPointerEvent) => void;
  onVirtualPointerUp?: (event: AlignCanvasPointerEvent) => void;
  onVirtualPointerCancel?: (event: AlignCanvasPointerEvent) => void;
  onVirtualWheel?: (event: AlignCanvasWheelEvent) => void;
};

function drawFrameHalo(
  ctx: CanvasRenderingContext2D,
  frameLayout: ReturnType<typeof computeFrameLayout>,
) {
  const haloRect = buildAlignFrameHaloRect(frameLayout);
  ctx.fillStyle = alignGridOverlayColors.frameHaloFill;
  ctx.fillRect(haloRect.x, haloRect.y, haloRect.w, haloRect.h);
  ctx.strokeStyle = alignGridOverlayColors.frameHaloStroke;
  ctx.strokeRect(haloRect.x - 0.5, haloRect.y - 0.5, haloRect.w + 1, haloRect.h + 1);
}

function drawGridOverlayFromScene(
  ctx: CanvasRenderingContext2D,
  scene: NonNullable<ReturnType<typeof buildAlignGridOverlayScene>>,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(scene.clipRect.x, scene.clipRect.y, scene.clipRect.w, scene.clipRect.h);
  ctx.clip();
  for (const cell of scene.cells) {
    const rgb = cell.excluded
      ? alignGridOverlayColors.excludedRgb
      : alignGridOverlayColors.includedRgb;
    ctx.fillStyle = `rgba(${rgb}, ${scene.fillOpacity})`;
    ctx.strokeStyle = `rgba(${rgb}, ${scene.strokeOpacity})`;
    ctx.lineWidth = 1;
    ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
    ctx.strokeRect(cell.x + 0.5, cell.y + 0.5, Math.max(0, cell.w - 1), Math.max(0, cell.h - 1));
  }
  ctx.restore();
  ctx.strokeStyle = alignGridOverlayColors.origin;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(scene.origin.x, scene.origin.y, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = alignGridOverlayColors.vectorA;
  ctx.beginPath();
  ctx.moveTo(scene.vectorA.start.x, scene.vectorA.start.y);
  ctx.lineTo(scene.vectorA.end.x, scene.vectorA.end.y);
  ctx.stroke();
  ctx.strokeStyle = alignGridOverlayColors.vectorB;
  ctx.beginPath();
  ctx.moveTo(scene.vectorB.start.x, scene.vectorB.start.y);
  ctx.lineTo(scene.vectorB.end.x, scene.vectorB.end.y);
  ctx.stroke();
}

export function AlignCanvas({
  frame,
  grid,
  previewGridRef,
  previewRedrawRef,
  excludedCells,
  messages,
  toasts,
  className,
  cursor,
  onVirtualPointerDown,
  onVirtualPointerMove,
  onVirtualPointerUp,
  onVirtualPointerCancel,
  onVirtualWheel,
}: AlignCanvasProps) {
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const frameRafRef = useRef<number | null>(null);
  const overlayRafRef = useRef<number | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const dprRef = useRef(1);
  const preparedBitmap = usePreparedFrameBitmap(frame);
  const excludedCellKeysRef = useRef(new Set<string>());
  excludedCellKeysRef.current = new Set(
    Array.from(excludedCells ?? [], (cell: AlignGridCellCoord) => `${cell.i}:${cell.j}`),
  );

  const renderFrameLayer = () => {
    frameRafRef.current = null;
    const canvas = frameCanvasRef.current;
    const view = viewportRef.current;
    const currentFrame = frameRef.current;
    const bitmap = preparedBitmap;
    if (!canvas || !view) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cssWidth = view.clientWidth;
    const cssHeight = view.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dprRef.current, dprRef.current);
    ctx.fillStyle = resolvedCanvasBackground(view);
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    if (currentFrame && bitmap) {
      const frameLayout = computeFrameLayout(
        cssWidth,
        cssHeight,
        currentFrame.width,
        currentFrame.height,
      );
      drawFrameHalo(ctx, frameLayout);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        bitmap,
        frameLayout.drawX,
        frameLayout.drawY,
        frameLayout.drawWidth,
        frameLayout.drawHeight,
      );
    }
    ctx.restore();
  };

  const renderOverlayLayer = () => {
    overlayRafRef.current = null;
    const canvas = overlayCanvasRef.current;
    const view = viewportRef.current;
    const currentFrame = frameRef.current;
    if (!canvas || !view) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cssWidth = view.clientWidth;
    const cssHeight = view.clientHeight;
    const activeGrid = previewGridRef?.current ?? gridRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!currentFrame) return;
    ctx.save();
    ctx.scale(dprRef.current, dprRef.current);
    const scene = buildAlignGridOverlayScene(
      currentFrame,
      activeGrid,
      cssWidth,
      cssHeight,
      excludedCellKeysRef.current,
    );
    if (scene) {
      drawGridOverlayFromScene(ctx, scene);
    }
    ctx.restore();
  };

  const scheduleFrameRender = () => {
    if (frameRafRef.current != null) return;
    frameRafRef.current = window.requestAnimationFrame(renderFrameLayer);
  };

  const scheduleOverlayRender = () => {
    if (overlayRafRef.current != null) return;
    overlayRafRef.current = window.requestAnimationFrame(renderOverlayLayer);
  };

  const scheduleAllRender = () => {
    scheduleFrameRender();
    scheduleOverlayRender();
  };

  const scheduleFrameRenderLatest = useLatest(scheduleFrameRender);
  const scheduleOverlayRenderLatest = useLatest(scheduleOverlayRender);
  const scheduleAllRenderLatest = useLatest(scheduleAllRender);

  useEffect(() => {
    scheduleFrameRenderLatest.current();
    scheduleOverlayRenderLatest.current();
  }, [frame, preparedBitmap, scheduleFrameRenderLatest, scheduleOverlayRenderLatest]);

  useEffect(() => {
    scheduleOverlayRenderLatest.current();
  }, [grid, excludedCells, scheduleOverlayRenderLatest]);

  useEffect(() => {
    if (!previewRedrawRef) return;
    previewRedrawRef.current = () => scheduleOverlayRenderLatest.current();
    return () => {
      previewRedrawRef.current = null;
    };
  }, [previewRedrawRef, scheduleOverlayRenderLatest]);

  useCanvasThemeRerender(() => scheduleFrameRenderLatest.current());

  useLayoutEffect(() => {
    const view = viewportRef.current;
    const frameCanvas = frameCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!view || !frameCanvas || !overlayCanvas) return;

    const resizeCanvases = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(view.clientWidth * dpr));
      const height = Math.max(1, Math.floor(view.clientHeight * dpr));
      dprRef.current = dpr;
      for (const canvas of [frameCanvas, overlayCanvas]) {
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        const cssWidth = `${view.clientWidth}px`;
        const cssHeight = `${view.clientHeight}px`;
        if (canvas.style.width !== cssWidth) canvas.style.width = cssWidth;
        if (canvas.style.height !== cssHeight) canvas.style.height = cssHeight;
      }
      scheduleAllRenderLatest.current();
    };

    const resize = () => {
      if (resizeRafRef.current != null) {
        window.cancelAnimationFrame(resizeRafRef.current);
      }
      resizeRafRef.current = window.requestAnimationFrame(() => {
        resizeRafRef.current = null;
        resizeCanvases();
      });
    };

    const observer = new ResizeObserver(() => resize());
    observer.observe(view);
    resize();
    return () => {
      if (resizeRafRef.current != null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
      if (frameRafRef.current != null) {
        window.cancelAnimationFrame(frameRafRef.current);
        frameRafRef.current = null;
      }
      if (overlayRafRef.current != null) {
        window.cancelAnimationFrame(overlayRafRef.current);
        overlayRafRef.current = null;
      }
      observer.disconnect();
    };
  }, [scheduleAllRenderLatest]);

  const getFramePointFromClient = (
    clientX: number,
    clientY: number,
  ): AlignCanvasFramePoint | null => {
    const currentFrame = frameRef.current;
    const view = viewportRef.current;
    if (!currentFrame || !view) return null;
    const bounds = view.getBoundingClientRect();
    const frameLayout = computeFrameLayout(
      bounds.width,
      bounds.height,
      currentFrame.width,
      currentFrame.height,
    );
    const pointerX = clientX - bounds.left;
    const pointerY = clientY - bounds.top;
    if (
      pointerX < frameLayout.drawX ||
      pointerX > frameLayout.drawX + frameLayout.drawWidth ||
      pointerY < frameLayout.drawY ||
      pointerY > frameLayout.drawY + frameLayout.drawHeight
    ) {
      return null;
    }
    return {
      x: (pointerX - frameLayout.drawX) / frameLayout.scale,
      y: (pointerY - frameLayout.drawY) / frameLayout.scale,
    };
  };

  const getViewport = (): AlignGridWheelViewport | null => {
    const view = viewportRef.current;
    const currentFrame = frameRef.current;
    if (!view || !currentFrame) return null;
    return {
      displayWidth: view.clientWidth,
      displayHeight: view.clientHeight,
      modelWidth: currentFrame.width,
      modelHeight: currentFrame.height,
    };
  };

  const toVirtualPointerEvent = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): AlignCanvasPointerEvent => ({
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    button: event.button,
    buttons: event.buttons,
    clientX: event.clientX,
    clientY: event.clientY,
    framePoint: getFramePointFromClient(event.clientX, event.clientY),
    viewport: getViewport(),
    preventDefault: () => event.preventDefault(),
    capturePointer: () => event.currentTarget.setPointerCapture(event.pointerId),
    releasePointer: () => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
  });

  const toVirtualWheelEvent = (event: ReactWheelEvent<HTMLDivElement>): AlignCanvasWheelEvent => ({
    deltaMode: event.deltaMode,
    deltaX: event.deltaX,
    deltaY: event.deltaY,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    clientX: event.clientX,
    clientY: event.clientY,
    framePoint: getFramePointFromClient(event.clientX, event.clientY),
    viewport: getViewport(),
    preventDefault: () => event.preventDefault(),
  });

  return (
    <div
      ref={viewportRef}
      className={cn(
        "relative h-full min-h-0 w-full flex-1 overflow-hidden bg-background",
        className,
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          cursor: cursor ?? "default",
          touchAction: "none",
        }}
        onContextMenu={(event) => event.preventDefault()}
        onPointerCancel={(event) => onVirtualPointerCancel?.(toVirtualPointerEvent(event))}
        onPointerDown={(event) => onVirtualPointerDown?.(toVirtualPointerEvent(event))}
        onPointerMove={(event) => onVirtualPointerMove?.(toVirtualPointerEvent(event))}
        onPointerUp={(event) => onVirtualPointerUp?.(toVirtualPointerEvent(event))}
        onWheel={(event) => onVirtualWheel?.(toVirtualWheelEvent(event))}
      >
        <canvas ref={frameCanvasRef} className="absolute inset-0 block h-full w-full select-none" />
        <canvas
          ref={overlayCanvasRef}
          className="pointer-events-none absolute inset-0 block h-full w-full select-none"
        />
      </div>

      <CanvasStatusMessageStack messages={messages} />
      <CanvasToastStack messages={toasts} />
    </div>
  );
}

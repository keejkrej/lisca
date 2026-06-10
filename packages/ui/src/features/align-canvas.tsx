"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import type {
  AlignGridCellCoord,
  AlignGridState,
  CanvasStatusMessage,
  FrameResult,
} from "@lisca/contracts";
import {
  alignGridBasis,
  clamp,
  enumerateVisibleAlignGridCells,
  type AlignGridWheelViewport,
} from "@lisca/utils";
import { cn } from "../lib/utils";
import { CanvasStatusMessageStack, CanvasToastStack } from "./canvas-status";
import { resolvedCanvasBackground, useCanvasThemeRerender } from "./canvas-theme";
export type AlignCanvasFramePoint = {
  x: number;
  y: number;
};
export type AlignCanvasPointerEvent = {
  pointerId: number;
  pointerType: string;
  button: number;
  buttons: number;
  clientX: number;
  clientY: number;
  framePoint: AlignCanvasFramePoint | null;
  viewport: AlignGridWheelViewport | null;
  preventDefault: () => void;
  capturePointer: () => void;
  releasePointer: () => void;
};
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
  previewGrid?: AlignGridState | null;
  excludedCells?: Iterable<AlignGridCellCoord>;
  loading?: boolean;
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
type PreparedFrame = {
  frame: FrameResult;
  prepared: HTMLCanvasElement;
};
function pixelToDisplayValue(frame: FrameResult, index: number) {
  const raw = Number(frame.pixels[index] ?? 0);
  const contrast = frame.appliedContrast ?? frame.suggestedContrast ?? frame.contrastDomain;
  if (!contrast || frame.pixelType === "uint8" || frame.pixelType === "uint8clamped") {
    return clamp(Math.round(raw), 0, 255);
  }
  const span = Math.max(1, contrast.max - contrast.min);
  return clamp(Math.round(((raw - contrast.min) / span) * 255), 0, 255);
}
function prepareFrameCanvas(frame: FrameResult): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const rgba = new Uint8ClampedArray(frame.width * frame.height * 4);
  for (let index = 0; index < frame.width * frame.height; index += 1) {
    const value = pixelToDisplayValue(frame, index);
    const offset = index * 4;
    rgba[offset] = value;
    rgba[offset + 1] = value;
    rgba[offset + 2] = value;
    rgba[offset + 3] = 255;
  }
  ctx.putImageData(new ImageData(rgba, frame.width, frame.height), 0, 0);
  return canvas;
}
function drawGridOverlay(
  ctx: CanvasRenderingContext2D,
  viewportWidth: number,
  viewportHeight: number,
  frame: FrameResult,
  grid: AlignGridState,
  excludedCellKeys: ReadonlySet<string>,
) {
  if (!grid.enabled) return;
  const scale = Math.min(viewportWidth / frame.width, viewportHeight / frame.height);
  const drawWidth = frame.width * scale;
  const drawHeight = frame.height * scale;
  const drawX = (viewportWidth - drawWidth) / 2;
  const drawY = (viewportHeight - drawHeight) / 2;
  const originX = drawX + (frame.width / 2 + grid.tx) * scale;
  const originY = drawY + (frame.height / 2 + grid.ty) * scale;
  const basis = alignGridBasis(grid.shape, grid.rotation, grid.spacingA, grid.spacingB);
  const scaledA = {
    x: basis.a.x * scale,
    y: basis.a.y * scale,
  };
  const scaledB = {
    x: basis.b.x * scale,
    y: basis.b.y * scale,
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(drawX, drawY, drawWidth, drawHeight);
  ctx.clip();
  for (const cell of enumerateVisibleAlignGridCells(frame, grid)) {
    const color = excludedCellKeys.has(`${cell.i}:${cell.j}`) ? "244, 63, 94" : "68, 151, 255";
    ctx.fillStyle = `rgba(${color}, ${grid.opacity * 0.55})`;
    ctx.strokeStyle = `rgba(${color}, ${Math.max(0.45, grid.opacity * 0.9)})`;
    ctx.lineWidth = 1;
    const scaledX = drawX + cell.x * scale;
    const scaledY = drawY + cell.y * scale;
    const scaledWidth = cell.w * scale;
    const scaledHeight = cell.h * scale;
    ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
    ctx.strokeRect(
      scaledX + 0.5,
      scaledY + 0.5,
      Math.max(0, scaledWidth - 1),
      Math.max(0, scaledHeight - 1),
    );
  }
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(originX, originY, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(249,115,22,0.95)";
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(originX + scaledA.x, originY + scaledA.y);
  ctx.stroke();
  ctx.strokeStyle = "rgba(34,197,94,0.95)";
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(originX + scaledB.x, originY + scaledB.y);
  ctx.stroke();
  ctx.restore();
}
export function AlignCanvas({
  frame,
  grid,
  previewGrid,
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const renderRafRef = useRef<number | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const latestFrameRef = useRef<PreparedFrame | null>(null);
  const dprRef = useRef(1);
  const preparedFrame = frame ? prepareFrameCanvas(frame) : null;
  const activeExcludedCellKeys = new Set(
    Array.from(excludedCells ?? [], (cell: AlignGridCellCoord) => `${cell.i}:${cell.j}`),
  );
  const renderNow = () => {
    renderRafRef.current = null;
    const canvas = canvasRef.current;
    const view = viewportRef.current;
    const cached = latestFrameRef.current;
    if (!canvas || !view) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cssWidth = view.clientWidth;
    const cssHeight = view.clientHeight;
    const activeGrid = previewGrid ?? grid;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dprRef.current, dprRef.current);
    ctx.fillStyle = resolvedCanvasBackground(view);
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    if (cached) {
      const scale = Math.min(cssWidth / cached.frame.width, cssHeight / cached.frame.height);
      const drawWidth = cached.frame.width * scale;
      const drawHeight = cached.frame.height * scale;
      const drawX = (cssWidth - drawWidth) / 2;
      const drawY = (cssHeight - drawHeight) / 2;
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(drawX - 8, drawY - 8, drawWidth + 16, drawHeight + 16);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.strokeRect(drawX - 8.5, drawY - 8.5, drawWidth + 17, drawHeight + 17);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cached.prepared, drawX, drawY, drawWidth, drawHeight);
      drawGridOverlay(ctx, cssWidth, cssHeight, cached.frame, activeGrid, activeExcludedCellKeys);
    }
    ctx.restore();
  };
  useEffect(() => {
    latestFrameRef.current =
      frame && preparedFrame
        ? {
            frame,
            prepared: preparedFrame,
          }
        : null;
    renderNow();
  }, [frame, preparedFrame, renderNow]);
  useEffect(() => {
    renderNow();
  }, [grid, previewGrid, renderNow]);
  useEffect(() => {
    renderNow();
  }, [activeExcludedCellKeys, renderNow]);
  useCanvasThemeRerender(renderNow);
  useLayoutEffect(() => {
    const view = viewportRef.current;
    const canvas = canvasRef.current;
    if (!view || !canvas) return;
    const resize = () => {
      if (resizeRafRef.current != null) {
        window.cancelAnimationFrame(resizeRafRef.current);
      }
      resizeRafRef.current = window.requestAnimationFrame(() => {
        resizeRafRef.current = null;
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(1, Math.floor(view.clientWidth * dpr));
        const height = Math.max(1, Math.floor(view.clientHeight * dpr));
        dprRef.current = dpr;
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        const cssWidth = `${view.clientWidth}px`;
        const cssHeight = `${view.clientHeight}px`;
        if (canvas.style.width !== cssWidth) canvas.style.width = cssWidth;
        if (canvas.style.height !== cssHeight) canvas.style.height = cssHeight;
        renderNow();
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
      if (renderRafRef.current != null) {
        window.cancelAnimationFrame(renderRafRef.current);
        renderRafRef.current = null;
      }
      observer.disconnect();
    };
  }, [renderNow]);
  const getFramePointFromClient = (
    clientX: number,
    clientY: number,
  ): AlignCanvasFramePoint | null => {
    const cached = latestFrameRef.current;
    const view = viewportRef.current;
    if (!cached || !view) return null;
    const bounds = view.getBoundingClientRect();
    const scale = Math.min(bounds.width / cached.frame.width, bounds.height / cached.frame.height);
    const drawWidth = cached.frame.width * scale;
    const drawHeight = cached.frame.height * scale;
    const drawX = (bounds.width - drawWidth) / 2;
    const drawY = (bounds.height - drawHeight) / 2;
    const pointerX = clientX - bounds.left;
    const pointerY = clientY - bounds.top;
    if (
      pointerX < drawX ||
      pointerX > drawX + drawWidth ||
      pointerY < drawY ||
      pointerY > drawY + drawHeight
    ) {
      return null;
    }
    return {
      x: (pointerX - drawX) / scale,
      y: (pointerY - drawY) / scale,
    };
  };
  const getViewport = (): AlignGridWheelViewport | null => {
    const view = viewportRef.current;
    if (!view || !frame) return null;
    return {
      displayWidth: view.clientWidth,
      displayHeight: view.clientHeight,
      modelWidth: frame.width,
      modelHeight: frame.height,
    };
  };
  const toVirtualPointerEvent = (
    event: ReactPointerEvent<HTMLCanvasElement>,
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
  const toVirtualWheelEvent = (
    event: ReactWheelEvent<HTMLCanvasElement>,
  ): AlignCanvasWheelEvent => ({
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
      <canvas
        ref={canvasRef}
        className="block h-full w-full select-none"
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
      />

      <CanvasStatusMessageStack messages={messages} />
      <CanvasToastStack messages={toasts} />
    </div>
  );
}

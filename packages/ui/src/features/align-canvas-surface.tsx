"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import type {
  AlignCanvasStatusMessage,
  AlignCanvasStatusTone,
  AlignGridCellCoord,
  AlignGridState,
  FrameResult,
} from "@lisca/contracts";
import {
  alignGridBasis,
  clamp,
  enumerateVisibleAlignGridCells,
  type AlignGridWheelViewport,
} from "@lisca/utils";

import { cn } from "../lib/utils";

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

export type AlignCanvasSurfaceProps = {
  frame: FrameResult | null;
  grid: AlignGridState;
  previewGrid?: AlignGridState | null;
  excludedCells?: Iterable<AlignGridCellCoord>;
  loading?: boolean;
  emptyText?: string;
  messages?: AlignCanvasStatusMessage[];
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

function drawFramePixels(
  ctx: CanvasRenderingContext2D,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
  frame: FrameResult,
) {
  const scale = Math.min(cssWidth / frame.width, cssHeight / frame.height);
  const drawWidth = frame.width * scale;
  const drawHeight = frame.height * scale;
  const drawX = (cssWidth - drawWidth) / 2;
  const drawY = (cssHeight - drawHeight) / 2;
  const outputWidth = Math.max(1, Math.round(drawWidth * dpr));
  const outputHeight = Math.max(1, Math.round(drawHeight * dpr));
  const image = ctx.createImageData(outputWidth, outputHeight);

  for (let outY = 0; outY < outputHeight; outY += 1) {
    const sourceY = Math.min(frame.height - 1, Math.floor((outY / outputHeight) * frame.height));
    for (let outX = 0; outX < outputWidth; outX += 1) {
      const sourceX = Math.min(frame.width - 1, Math.floor((outX / outputWidth) * frame.width));
      const value = pixelToDisplayValue(frame, sourceY * frame.width + sourceX);
      const offset = (outY * outputWidth + outX) * 4;
      image.data[offset] = value;
      image.data[offset + 1] = value;
      image.data[offset + 2] = value;
      image.data[offset + 3] = 255;
    }
  }

  ctx.putImageData(image, Math.round(drawX * dpr), Math.round(drawY * dpr));
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
  const scaledA = { x: basis.a.x * scale, y: basis.a.y * scale };
  const scaledB = { x: basis.b.x * scale, y: basis.b.y * scale };

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

function messageToneClassName(tone: AlignCanvasStatusTone | undefined) {
  if (tone === "error") return "border-red-500/35 text-red-200";
  if (tone === "success") return "border-emerald-500/35 text-emerald-200";
  return "border-white/15 text-white/75";
}

export function AlignCanvasSurface({
  frame,
  grid,
  previewGrid,
  excludedCells,
  loading = false,
  emptyText = "No frame loaded.",
  messages,
  className,
  cursor,
  onVirtualPointerDown,
  onVirtualPointerMove,
  onVirtualPointerUp,
  onVirtualPointerCancel,
  onVirtualWheel,
}: AlignCanvasSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const renderRafRef = useRef<number | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const latestFrameRef = useRef<PreparedFrame | null>(null);
  const dprRef = useRef(1);

  const activeExcludedCellKeys = useMemo(
    () =>
      new Set(Array.from(excludedCells ?? [], (cell: AlignGridCellCoord) => `${cell.i}:${cell.j}`)),
    [excludedCells],
  );

  const queueRender = useCallback(() => {
    if (renderRafRef.current != null) return;
    renderRafRef.current = window.requestAnimationFrame(() => {
      renderRafRef.current = null;
      const canvas = canvasRef.current;
      const view = viewportRef.current;
      if (!canvas || !view) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cssWidth = view.clientWidth;
      const cssHeight = view.clientHeight;
      const dpr = dprRef.current;
      const activeGrid = previewGrid ?? grid;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (frame) {
        const scale = Math.min(cssWidth / frame.width, cssHeight / frame.height);
        const drawWidth = frame.width * scale;
        const drawHeight = frame.height * scale;
        const drawX = (cssWidth - drawWidth) / 2;
        const drawY = (cssHeight - drawHeight) / 2;
        drawFramePixels(ctx, cssWidth, cssHeight, dpr, frame);
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.fillRect(drawX - 8, drawY - 8, drawWidth + 16, drawHeight + 16);
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.strokeRect(drawX - 8.5, drawY - 8.5, drawWidth + 17, drawHeight + 17);
        drawGridOverlay(ctx, cssWidth, cssHeight, frame, activeGrid, activeExcludedCellKeys);
        ctx.restore();
      }
    });
  }, [activeExcludedCellKeys, frame, grid, previewGrid]);

  useEffect(() => {
    latestFrameRef.current = frame ? { frame } : null;
    queueRender();
  }, [frame, queueRender]);

  useEffect(() => {
    queueRender();
  }, [activeExcludedCellKeys, grid, previewGrid, queueRender]);

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
        queueRender();
      });
    };

    const observer = new ResizeObserver(() => resize());
    observer.observe(view);
    resize();

    return () => {
      if (resizeRafRef.current != null) {
        window.cancelAnimationFrame(resizeRafRef.current);
      }
      if (renderRafRef.current != null) {
        window.cancelAnimationFrame(renderRafRef.current);
      }
      observer.disconnect();
    };
  }, [queueRender]);

  const getFramePointFromClient = useCallback(
    (clientX: number, clientY: number): AlignCanvasFramePoint | null => {
      const cached = latestFrameRef.current;
      const view = viewportRef.current;
      if (!cached || !view) return null;

      const bounds = view.getBoundingClientRect();
      const scale = Math.min(
        bounds.width / cached.frame.width,
        bounds.height / cached.frame.height,
      );
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
    },
    [],
  );

  const getViewport = useCallback((): AlignGridWheelViewport | null => {
    const view = viewportRef.current;
    if (!view || !frame) return null;
    return {
      displayWidth: view.clientWidth,
      displayHeight: view.clientHeight,
      modelWidth: frame.width,
      modelHeight: frame.height,
    };
  }, [frame]);

  const toVirtualPointerEvent = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): AlignCanvasPointerEvent => ({
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
    }),
    [getFramePointFromClient, getViewport],
  );

  const toVirtualWheelEvent = useCallback(
    (event: ReactWheelEvent<HTMLCanvasElement>): AlignCanvasWheelEvent => ({
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
    }),
    [getFramePointFromClient, getViewport],
  );

  return (
    <div
      ref={viewportRef}
      className={cn("relative h-full min-h-0 w-full flex-1 overflow-hidden bg-zinc-950", className)}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full select-none"
        style={{ cursor: cursor ?? "default", touchAction: "none" }}
        onContextMenu={(event) => event.preventDefault()}
        onPointerCancel={(event) => onVirtualPointerCancel?.(toVirtualPointerEvent(event))}
        onPointerDown={(event) => onVirtualPointerDown?.(toVirtualPointerEvent(event))}
        onPointerMove={(event) => onVirtualPointerMove?.(toVirtualPointerEvent(event))}
        onPointerUp={(event) => onVirtualPointerUp?.(toVirtualPointerEvent(event))}
        onWheel={(event) => onVirtualWheel?.(toVirtualWheelEvent(event))}
      />

      {loading || !frame ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-950/45">
          <div className="rounded-md border border-white/15 bg-zinc-950/90 px-3 py-2 text-sm text-white/75 shadow-lg">
            {loading ? "Loading frame..." : emptyText}
          </div>
        </div>
      ) : null}

      {messages?.length ? (
        <div className="pointer-events-none absolute left-3 top-3 flex max-w-[78%] flex-wrap gap-1.5">
          {messages.map((message, index) => (
            <div
              key={`${message.tone ?? "default"}:${message.text}:${index}`}
              className={cn(
                "rounded-md border bg-zinc-950/90 px-3 py-2 text-sm leading-snug shadow-lg",
                messageToneClassName(message.tone),
              )}
            >
              {message.text}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

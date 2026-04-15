import {
  clamp,
  enumerateVisibleGridCells,
  gridBasis,
  type GridCellCoord,
  type GridState,
  type GridWheelViewport,
} from "lisca/shared/core";
import type { FrameResult, ViewerCanvasStatusTone } from "lisca/shared/contracts";
import {
  type WheelEvent as ReactWheelEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import type {
  ViewerCanvasFramePoint,
  ViewerCanvasPointerEvent,
  ViewerCanvasSurfaceProps,
  ViewerCanvasWheelEvent,
} from "./types";

interface PreparedFrame {
  frame: FrameResult;
  prepared: HTMLCanvasElement;
}

function prepareFrameCanvas(frame: FrameResult) {
  const canvas = document.createElement("canvas");
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const rgba = new Uint8ClampedArray(frame.width * frame.height * 4);
  for (let i = 0; i < frame.pixels.length; i += 1) {
    const value = clamp(Math.round(Number(frame.pixels[i] ?? 0)), 0, 255);
    const offset = i * 4;
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
  grid: GridState,
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
  const basis = gridBasis(grid.shape, grid.rotation, grid.spacingA, grid.spacingB);
  const scaledA = { x: basis.a.x * scale, y: basis.a.y * scale };
  const scaledB = { x: basis.b.x * scale, y: basis.b.y * scale };

  ctx.save();
  ctx.beginPath();
  ctx.rect(drawX, drawY, drawWidth, drawHeight);
  ctx.clip();

  for (const cell of enumerateVisibleGridCells(frame, grid)) {
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

function messageToneClasses(tone: ViewerCanvasStatusTone | undefined) {
  if (tone === "error") {
    return {
      borderColor: "rgba(239, 68, 68, 0.35)",
      color: "#fca5a5",
    };
  }
  if (tone === "success") {
    return {
      borderColor: "rgba(16, 185, 129, 0.35)",
      color: "#6ee7b7",
    };
  }
  return {
    borderColor: "rgba(255, 255, 255, 0.12)",
    color: "rgba(255, 255, 255, 0.72)",
  };
}

export default function ViewerCanvasSurface({
  frame,
  grid,
  previewGrid,
  excludedCells,
  loading = false,
  emptyText,
  messages,
  className,
  cursor,
  onVirtualPointerDown,
  onVirtualPointerMove,
  onVirtualPointerUp,
  onVirtualPointerCancel,
  onVirtualWheel,
}: ViewerCanvasSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const renderRafRef = useRef<number | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const latestFrameRef = useRef<PreparedFrame | null>(null);
  const dprRef = useRef(1);

  const preparedFrame = useMemo(() => (frame ? prepareFrameCanvas(frame) : null), [frame]);
  const activeExcludedCellKeys = useMemo(
    () => new Set(Array.from(excludedCells ?? [], (cell: GridCellCoord) => `${cell.i}:${cell.j}`)),
    [excludedCells],
  );

  const queueRender = useCallback(() => {
    if (renderRafRef.current != null) return;
    renderRafRef.current = window.requestAnimationFrame(() => {
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
      ctx.fillStyle = "#09090b";
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
    });
  }, [activeExcludedCellKeys, emptyText, grid, loading, previewGrid]);

  useEffect(() => {
    latestFrameRef.current =
      frame && preparedFrame
        ? {
            frame,
            prepared: preparedFrame,
          }
        : null;
    queueRender();
  }, [frame, preparedFrame, queueRender]);

  useEffect(() => {
    queueRender();
  }, [grid, previewGrid, queueRender]);

  useEffect(() => {
    queueRender();
  }, [activeExcludedCellKeys, loading, messages, emptyText, queueRender]);

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
        if (canvas.width !== width) {
          canvas.width = width;
        }
        if (canvas.height !== height) {
          canvas.height = height;
        }
        const cssWidth = `${view.clientWidth}px`;
        const cssHeight = `${view.clientHeight}px`;
        if (canvas.style.width !== cssWidth) {
          canvas.style.width = cssWidth;
        }
        if (canvas.style.height !== cssHeight) {
          canvas.style.height = cssHeight;
        }
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
      observer.disconnect();
    };
  }, [queueRender]);

  const getFramePointFromClient = useCallback((clientX: number, clientY: number): ViewerCanvasFramePoint | null => {
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
  }, []);

  const getViewport = useCallback((): GridWheelViewport | null => {
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
    (event: ReactPointerEvent<HTMLCanvasElement>): ViewerCanvasPointerEvent => ({
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
    (event: ReactWheelEvent<HTMLCanvasElement>): ViewerCanvasWheelEvent => ({
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
      className={className}
      ref={viewportRef}
      style={{
        position: "relative",
        minHeight: 0,
        height: "100%",
        width: "100%",
        flex: "1 1 auto",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          height: "100%",
          width: "100%",
          cursor: cursor ?? "default",
          touchAction: "none",
          userSelect: "none",
        }}
        onPointerDown={(event) => onVirtualPointerDown?.(toVirtualPointerEvent(event))}
        onPointerMove={(event) => onVirtualPointerMove?.(toVirtualPointerEvent(event))}
        onPointerUp={(event) => onVirtualPointerUp?.(toVirtualPointerEvent(event))}
        onPointerCancel={(event) => onVirtualPointerCancel?.(toVirtualPointerEvent(event))}
        onWheel={(event) => onVirtualWheel?.(toVirtualWheelEvent(event))}
        onContextMenu={(event) => event.preventDefault()}
      />

      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          left: 12,
          top: 12,
          display: "flex",
          maxWidth: "78%",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        {messages?.map((message, index) => (
          <div
            key={`${message.tone ?? "default"}:${message.text}:${index}`}
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderRadius: 10,
              background: "rgba(17, 24, 39, 0.92)",
              padding: "8px 12px",
              fontSize: 14,
              lineHeight: 1.4,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
              ...messageToneClasses(message.tone),
            }}
          >
            {message.text}
          </div>
        ))}
      </div>

    </div>
  );
}

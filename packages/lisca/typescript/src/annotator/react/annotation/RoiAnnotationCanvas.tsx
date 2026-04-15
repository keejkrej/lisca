import type { AnnotationLabel, FrameResult } from "lisca/viewer/contracts";
import { clamp } from "lisca/viewer/core";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import { hexToRgb } from "./annotationUtils";
import type { RoiAnnotationCanvasProps } from "./types";

interface DrawRect {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

interface FramePointerPoint {
  x: number;
  y: number;
  scale: number;
}

function getDrawRect(width: number, height: number, frame: FrameResult): DrawRect {
  const scale = Math.min(width / frame.width, height / frame.height);
  const drawWidth = frame.width * scale;
  const drawHeight = frame.height * scale;
  return {
    x: (width - drawWidth) / 2,
    y: (height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
    scale,
  };
}

function prepareFrameCanvas(frame: FrameResult) {
  const canvas = document.createElement("canvas");
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const rgba = new Uint8ClampedArray(frame.width * frame.height * 4);
  for (let index = 0; index < frame.pixels.length; index += 1) {
    const value = clamp(Math.round(Number(frame.pixels[index] ?? 0)), 0, 255);
    const offset = index * 4;
    rgba[offset] = value;
    rgba[offset + 1] = value;
    rgba[offset + 2] = value;
    rgba[offset + 3] = 255;
  }

  ctx.putImageData(new ImageData(rgba, frame.width, frame.height), 0, 0);
  return canvas;
}

function prepareMaskCanvas(width: number, height: number, labels: AnnotationLabel[], mask: Uint8Array) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < mask.length; index += 1) {
    const classValue = mask[index] ?? 0;
    if (classValue <= 0) continue;
    const label = labels[classValue - 1];
    const rgb = label ? hexToRgb(label.color) : null;
    const offset = index * 4;
    rgba[offset] = rgb?.r ?? 59;
    rgba[offset + 1] = rgb?.g ?? 130;
    rgba[offset + 2] = rgb?.b ?? 246;
    rgba[offset + 3] = 255;
  }

  ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas;
}

function isMousePointerEvent(event: ReactPointerEvent<HTMLCanvasElement>): boolean {
  return event.pointerType === "mouse";
}

function paintCircle(
  mask: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
  value: number,
) {
  const left = Math.max(0, Math.floor(x - radius));
  const right = Math.min(width - 1, Math.ceil(x + radius));
  const top = Math.max(0, Math.floor(y - radius));
  const bottom = Math.min(height - 1, Math.ceil(y + radius));
  const radiusSquared = radius * radius;
  for (let py = top; py <= bottom; py += 1) {
    for (let px = left; px <= right; px += 1) {
      const dx = px - x;
      const dy = py - y;
      if (dx * dx + dy * dy > radiusSquared) continue;
      mask[py * width + px] = value;
    }
  }
}

function paintStroke(
  mask: Uint8Array,
  frame: FrameResult,
  from: { x: number; y: number },
  to: { x: number; y: number },
  radius: number,
  value: number,
) {
  const distance = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  const steps = Math.max(1, Math.ceil(distance));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    paintCircle(mask, frame.width, frame.height, x, y, radius, value);
  }
}

export default function RoiAnnotationCanvas({
  frame,
  labels,
  mask,
  activeLabelId,
  tool,
  brushSize,
  overlayOpacity,
  disabled = false,
  className,
  onStrokeStart,
  onPreviewMaskChange,
  onStrokeCommit,
}: RoiAnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const renderRafRef = useRef<number | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const dprRef = useRef(1);
  const displayMaskRef = useRef<Uint8Array>(mask);
  const preparedFrame = useMemo(() => prepareFrameCanvas(frame), [frame]);
  const labelIndexMap = useMemo(
    () => new Map(labels.map((label, index) => [label.id, index + 1])),
    [labels],
  );
  const strokeRef = useRef<
    | null
    | {
        pointerId: number;
        draftMask: Uint8Array;
        lastPoint: { x: number; y: number };
      }
  >(null);

  const queueRender = useCallback(() => {
    if (renderRafRef.current != null) return;
    renderRafRef.current = window.requestAnimationFrame(() => {
      renderRafRef.current = null;
      const canvas = canvasRef.current;
      const viewport = viewportRef.current;
      if (!canvas || !viewport) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      if (width <= 0 || height <= 0) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dprRef.current, dprRef.current);
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, width, height);

      const drawRect = getDrawRect(width, height, frame);
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(drawRect.x - 8, drawRect.y - 8, drawRect.width + 16, drawRect.height + 16);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.strokeRect(drawRect.x - 8.5, drawRect.y - 8.5, drawRect.width + 17, drawRect.height + 17);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(preparedFrame, drawRect.x, drawRect.y, drawRect.width, drawRect.height);

      const overlayCanvas = prepareMaskCanvas(
        frame.width,
        frame.height,
        labels,
        displayMaskRef.current,
      );
      ctx.save();
      ctx.globalAlpha = clamp(overlayOpacity, 0, 1);
      ctx.drawImage(overlayCanvas, drawRect.x, drawRect.y, drawRect.width, drawRect.height);
      ctx.restore();
      ctx.restore();
    });
  }, [frame, labels, overlayOpacity, preparedFrame]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    const resize = () => {
      if (resizeRafRef.current != null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
      resizeRafRef.current = window.requestAnimationFrame(() => {
        resizeRafRef.current = null;
        const dpr = window.devicePixelRatio || 1;
        const pixelWidth = Math.max(1, Math.floor(viewport.clientWidth * dpr));
        const pixelHeight = Math.max(1, Math.floor(viewport.clientHeight * dpr));
        dprRef.current = dpr;
        if (canvas.width !== pixelWidth) {
          canvas.width = pixelWidth;
        }
        if (canvas.height !== pixelHeight) {
          canvas.height = pixelHeight;
        }
        const cssWidth = `${viewport.clientWidth}px`;
        const cssHeight = `${viewport.clientHeight}px`;
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
    observer.observe(viewport);
    resize();

    return () => {
      if (resizeRafRef.current != null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        // Reset RAF handles after cancellation so Strict Mode remounts can schedule fresh work.
        resizeRafRef.current = null;
      }
      observer.disconnect();
    };
  }, [queueRender]);

  useEffect(() => {
    displayMaskRef.current = mask;
    queueRender();
  }, [mask, queueRender]);

  useEffect(() => {
    queueRender();
  }, [queueRender]);

  useEffect(
    () => () => {
      if (renderRafRef.current != null) {
        window.cancelAnimationFrame(renderRafRef.current);
        renderRafRef.current = null;
      }
      if (resizeRafRef.current != null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
    },
    [],
  );

  const resolveFramePoint = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): FramePointerPoint | null => {
      const viewport = viewportRef.current;
      if (!viewport) return null;

      const bounds = viewport.getBoundingClientRect();
      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;
      const drawRect = getDrawRect(bounds.width, bounds.height, frame);
      if (
        pointerX < drawRect.x ||
        pointerY < drawRect.y ||
        pointerX > drawRect.x + drawRect.width ||
        pointerY > drawRect.y + drawRect.height
      ) {
        return null;
      }

      return {
        x: clamp(Math.floor((pointerX - drawRect.x) / drawRect.scale), 0, frame.width - 1),
        y: clamp(Math.floor((pointerY - drawRect.y) / drawRect.scale), 0, frame.height - 1),
        scale: drawRect.scale,
      };
    },
    [frame],
  );

  const finishStroke = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const active = strokeRef.current;
      if (!active || active.pointerId !== event.pointerId) return;
      strokeRef.current = null;
      onStrokeCommit(active.draftMask.slice());
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [onStrokeCommit],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (disabled || !isMousePointerEvent(event) || event.button !== 0) return;
      const point = resolveFramePoint(event);
      if (!point) return;

      const nextValue =
        tool === "erase" ? 0 : (activeLabelId ? labelIndexMap.get(activeLabelId) ?? 0 : 0);
      if (tool === "brush" && nextValue === 0) return;

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const radius = Math.max(0.5, brushSize / (2 * Math.max(point.scale, 0.0001)));
      const draftMask = mask.slice();
      paintStroke(draftMask, frame, point, point, radius, nextValue);
      displayMaskRef.current = draftMask;
      strokeRef.current = {
        pointerId: event.pointerId,
        draftMask,
        lastPoint: point,
      };
      onStrokeStart?.();
      queueRender();
      onPreviewMaskChange(draftMask.slice());
    },
    [
      activeLabelId,
      brushSize,
      disabled,
      frame,
      labelIndexMap,
      mask,
      onPreviewMaskChange,
      onStrokeStart,
      queueRender,
      resolveFramePoint,
      tool,
    ],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const active = strokeRef.current;
      if (!active || active.pointerId !== event.pointerId) return;

      const point = resolveFramePoint(event);
      if (!point) return;

      const nextValue =
        tool === "erase" ? 0 : (activeLabelId ? labelIndexMap.get(activeLabelId) ?? 0 : 0);
      const radius = Math.max(0.5, brushSize / (2 * Math.max(point.scale, 0.0001)));
      paintStroke(active.draftMask, frame, active.lastPoint, point, radius, nextValue);
      active.lastPoint = point;
      displayMaskRef.current = active.draftMask;
      queueRender();
      onPreviewMaskChange(active.draftMask.slice());
    },
    [
      activeLabelId,
      brushSize,
      frame,
      labelIndexMap,
      onPreviewMaskChange,
      queueRender,
      resolveFramePoint,
      tool,
    ],
  );

  return (
    <div
      ref={viewportRef}
      className={`relative overflow-hidden rounded-2xl border border-border/70 bg-black/95 ${className ?? ""}`}
      style={{
        minHeight: "28rem",
        height: "100%",
        width: "100%",
        flex: "1 1 auto",
      }}
    >
      <canvas
        ref={canvasRef}
        className="touch-none cursor-crosshair"
        style={{
          display: "block",
          height: "100%",
          width: "100%",
          userSelect: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        onLostPointerCapture={finishStroke}
        onContextMenu={(event) => event.preventDefault()}
      />
    </div>
  );
}

import type {
  AlignCanvasStatusMessage,
  AlignCanvasStatusTone,
  AnnotationLabel,
  FrameResult,
} from "@lisca/contracts";
import { cn } from "@lisca/ui";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { fillPolygon, hexToRgb, strokeMask } from "./annotation-utils";

type FramePoint = { x: number; y: number };

type DrawRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
};

export type AnnotationTool = "brush" | "brush-erase" | "lasso" | "lasso-erase";

export type AnnotationCanvasProps = {
  frame: FrameResult | null;
  labels: AnnotationLabel[];
  mask: Uint8Array;
  activeLabelId: string | null;
  tool: AnnotationTool;
  brushSize: number;
  overlayOpacity: number;
  messages?: AlignCanvasStatusMessage[];
  disabled?: boolean;
  className?: string;
  onMaskCommit: (mask: Uint8Array) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function drawRectFor(width: number, height: number, frame: FrameResult): DrawRect {
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

function prepareMaskCanvas(
  width: number,
  height: number,
  labels: AnnotationLabel[],
  mask: Uint8Array,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < mask.length; index += 1) {
    const value = mask[index] ?? 0;
    if (value <= 0) continue;
    const rgb = hexToRgb(labels[value - 1]?.color ?? "") ?? { r: 59, g: 130, b: 246 };
    const offset = index * 4;
    rgba[offset] = rgb.r;
    rgba[offset + 1] = rgb.g;
    rgba[offset + 2] = rgb.b;
    rgba[offset + 3] = 255;
  }
  ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas;
}

function messageToneClassName(tone: AlignCanvasStatusTone | undefined) {
  if (tone === "error")
    return "border-destructive/35 bg-destructive/10 text-destructive-foreground";
  if (tone === "success") {
    return "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300";
  }
  return "border-border text-muted-foreground";
}

export function AnnotationCanvas({
  frame,
  labels,
  mask,
  activeLabelId,
  tool,
  brushSize,
  overlayOpacity,
  messages,
  disabled = false,
  className,
  onMaskCommit,
}: AnnotationCanvasProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dprRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const [lassoPoints, setLassoPoints] = useState<FramePoint[]>([]);
  const lassoRef = useRef<{
    pointerId: number;
    points: FramePoint[];
  } | null>(null);
  const preparedFrame = useMemo(() => (frame ? prepareFrameCanvas(frame) : null), [frame]);
  const activeLabelValue = useMemo(() => {
    if (!activeLabelId) return 0;
    const index = labels.findIndex((label) => label.id === activeLabelId);
    return index >= 0 ? index + 1 : 0;
  }, [activeLabelId, labels]);
  const eraseMode = tool === "brush-erase" || tool === "lasso-erase";
  const brushMode = tool === "brush" || tool === "brush-erase";

  const render = useCallback(() => {
    rafRef.current = null;
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dprRef.current, dprRef.current);
    ctx.fillStyle =
      getComputedStyle(viewport).getPropertyValue("--color-background").trim() || "#09090b";
    ctx.fillRect(0, 0, width, height);

    if (frame && preparedFrame) {
      const rect = drawRectFor(width, height, frame);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(preparedFrame, rect.x, rect.y, rect.width, rect.height);
      const maskCanvas = prepareMaskCanvas(frame.width, frame.height, labels, mask);
      ctx.globalAlpha = clamp(overlayOpacity, 0, 1);
      ctx.drawImage(maskCanvas, rect.x, rect.y, rect.width, rect.height);
      ctx.globalAlpha = 1;

      if (lassoPoints.length > 1) {
        ctx.strokeStyle = eraseMode ? "rgba(248,113,113,0.95)" : "rgba(250,204,21,0.95)";
        ctx.lineWidth = brushMode ? brushSize * rect.scale : 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        const first = lassoPoints[0]!;
        ctx.moveTo(rect.x + first.x * rect.scale, rect.y + first.y * rect.scale);
        for (const point of lassoPoints.slice(1)) {
          ctx.lineTo(rect.x + point.x * rect.scale, rect.y + point.y * rect.scale);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }, [
    brushMode,
    brushSize,
    eraseMode,
    frame,
    labels,
    lassoPoints,
    mask,
    overlayOpacity,
    preparedFrame,
  ]);

  const queueRender = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(render);
  }, [render]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      const width = Math.max(1, Math.floor(viewport.clientWidth * dpr));
      const height = Math.max(1, Math.floor(viewport.clientHeight * dpr));
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${viewport.clientWidth}px`;
      canvas.style.height = `${viewport.clientHeight}px`;
      queueRender();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    resize();
    return () => observer.disconnect();
  }, [queueRender]);

  useEffect(() => {
    queueRender();
    return () => {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [queueRender]);

  const framePointFromEvent = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): FramePoint | null => {
      const viewport = viewportRef.current;
      if (!viewport || !frame) return null;
      const bounds = viewport.getBoundingClientRect();
      const rect = drawRectFor(bounds.width, bounds.height, frame);
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      if (x < rect.x || y < rect.y || x > rect.x + rect.width || y > rect.y + rect.height) {
        return null;
      }
      return {
        x: clamp(Math.floor((x - rect.x) / rect.scale), 0, frame.width - 1),
        y: clamp(Math.floor((y - rect.y) / rect.scale), 0, frame.height - 1),
      };
    },
    [frame],
  );

  const finishLasso = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const active = lassoRef.current;
      if (!active || active.pointerId !== event.pointerId || !frame) return;
      lassoRef.current = null;
      setLassoPoints([]);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const value = eraseMode ? 0 : activeLabelValue;
      if (value <= 0 && !eraseMode) return;
      if (brushMode) {
        onMaskCommit(strokeMask(mask, frame.width, frame.height, active.points, value, brushSize));
      } else if (active.points.length >= 3) {
        onMaskCommit(fillPolygon(mask, frame.width, frame.height, active.points, value));
      }
    },
    [activeLabelValue, brushMode, brushSize, eraseMode, frame, mask, onMaskCommit],
  );

  return (
    <div
      ref={viewportRef}
      className={cn("relative h-full min-h-0 w-full overflow-hidden bg-background", className)}
    >
      {!frame ? (
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
          No ROI frame loaded.
        </div>
      ) : null}
      <canvas
        ref={canvasRef}
        className="block touch-none"
        style={{ cursor: disabled || !frame ? "default" : "crosshair" }}
        onPointerDown={(event) => {
          if (disabled || !frame || event.pointerType !== "mouse" || event.button !== 0) return;
          const point = framePointFromEvent(event);
          if (!point) return;
          if (!eraseMode && activeLabelValue <= 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          lassoRef.current = { pointerId: event.pointerId, points: [point] };
          setLassoPoints([point]);
        }}
        onPointerMove={(event) => {
          const active = lassoRef.current;
          if (!active || active.pointerId !== event.pointerId) return;
          const point = framePointFromEvent(event);
          if (!point) return;
          const last = active.points[active.points.length - 1];
          if (last && Math.abs(last.x - point.x) + Math.abs(last.y - point.y) < 2) return;
          active.points.push(point);
          setLassoPoints(active.points.slice());
        }}
        onPointerUp={finishLasso}
        onPointerCancel={finishLasso}
        onLostPointerCapture={finishLasso}
        onContextMenu={(event) => event.preventDefault()}
      />
      {messages?.length ? (
        <div className="pointer-events-none absolute left-3 top-3 flex max-w-[78%] flex-wrap gap-1.5">
          {messages.map((message, index) => (
            <div
              key={`${message.tone ?? "default"}:${message.text}:${index}`}
              className={cn(
                "rounded-md border bg-card/95 px-3 py-2 text-sm leading-snug shadow-lg backdrop-blur-sm",
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

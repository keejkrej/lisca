import type { AnnotationLabel } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import type { CanvasStatusMessage } from "@lisca/ui-headless";
import type { AnnotationTool } from "@lisca/utils";
import { isSmartAnnotationTool } from "@lisca/utils";
import { clamp, fillPolygon, hexToRgb, smartSegmentPromptRadius, strokeMask } from "@lisca/utils";
import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { cn } from "../../lib/utils";
import { resolvedCanvasBackground, useCanvasThemeRerender } from "../canvas/canvas-theme";
import { CanvasStatusMessageStack, CanvasToastStack } from "../canvas/canvas-status";

type FramePoint = {
  x: number;
  y: number;
};
type DrawRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
};
type PreparedFrame = {
  frame: FrameResult;
  prepared: HTMLCanvasElement;
};

export type { AnnotationTool } from "@lisca/utils";

export type SmartSegmentPrompt = {
  x: number;
  y: number;
  label: 0 | 1;
};

export type AnnotationCanvasProps = {
  frame: FrameResult | null;
  labels: AnnotationLabel[];
  mask: Uint8Array;
  activeLabelId: string | null;
  tool: AnnotationTool;
  brushSize: number;
  overlayOpacity: number;
  messages?: CanvasStatusMessage[];
  toasts?: CanvasStatusMessage[];
  disabled?: boolean;
  class?: string;
  emptyText?: string;
  smartSegmentPrompts?: SmartSegmentPrompt[];
  onMaskCommit: (mask: Uint8Array) => void;
  onSmartSegmentClick?: (click: { x: number; y: number; negative: boolean }) => void;
  onSmartEraseClick?: (click: { x: number; y: number }) => void;
};

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
    const rgb = hexToRgb(labels[value - 1]?.color ?? "") ?? {
      r: 59,
      g: 130,
      b: 246,
    };
    const offset = index * 4;
    rgba[offset] = rgb.r;
    rgba[offset + 1] = rgb.g;
    rgba[offset + 2] = rgb.b;
    rgba[offset + 3] = 255;
  }
  ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas;
}

export function AnnotationCanvas(props: AnnotationCanvasProps) {
  let viewportEl: HTMLDivElement | undefined;
  let canvasEl: HTMLCanvasElement | undefined;

  const dprRef = { current: 1 };
  const latestFrameRef = { current: null as PreparedFrame | null };
  const renderRafRef = { current: null as number | null };
  const resizeRafRef = { current: null as number | null };
  const [lassoPoints, setLassoPoints] = createSignal<FramePoint[]>([]);
  const lassoRef = { current: null as { pointerId: number; points: FramePoint[] } | null };

  const activeLabelValue = () => {
    if (!props.activeLabelId) return 0;
    const index = props.labels.findIndex((label) => label.id === props.activeLabelId);
    return index >= 0 ? index + 1 : 0;
  };
  const eraseMode = () => props.tool === "brush-erase" || props.tool === "lasso-erase";
  const brushMode = () => props.tool === "brush" || props.tool === "brush-erase";
  const smartToolMode = () => isSmartAnnotationTool(props.tool);
  const smartEraseMode = () => props.tool === "smart-erase";

  const renderNow = () => {
    renderRafRef.current = null;
    const canvas = canvasEl;
    const viewport = viewportEl;
    const cached = latestFrameRef.current;
    if (!canvas || !viewport) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dprRef.current, dprRef.current);
    ctx.fillStyle = resolvedCanvasBackground(viewport ?? undefined);
    ctx.fillRect(0, 0, width, height);
    if (cached) {
      const rect = drawRectFor(width, height, cached.frame);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cached.prepared, rect.x, rect.y, rect.width, rect.height);
      const maskCanvas = prepareMaskCanvas(
        cached.frame.width,
        cached.frame.height,
        props.labels,
        props.mask,
      );
      ctx.globalAlpha = clamp(props.overlayOpacity, 0, 1);
      ctx.drawImage(maskCanvas, rect.x, rect.y, rect.width, rect.height);
      ctx.globalAlpha = 1;
      const points = lassoPoints();
      if (points.length > 1) {
        ctx.strokeStyle = eraseMode() ? "rgba(248,113,113,0.95)" : "rgba(250,204,21,0.95)";
        ctx.lineWidth = brushMode() ? props.brushSize * rect.scale : 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        const first = points[0]!;
        ctx.moveTo(rect.x + first.x * rect.scale, rect.y + first.y * rect.scale);
        for (const point of points.slice(1)) {
          ctx.lineTo(rect.x + point.x * rect.scale, rect.y + point.y * rect.scale);
        }
        ctx.stroke();
      }
      const prompts = props.smartSegmentPrompts ?? [];
      if (prompts.length > 0) {
        const promptAlpha = smartToolMode() ? 1 : 0.65;
        for (const prompt of prompts) {
          const centerX = rect.x + prompt.x * rect.scale;
          const centerY = rect.y + prompt.y * rect.scale;
          const radius = smartSegmentPromptRadius(
            cached.frame.width,
            cached.frame.height,
            rect.scale,
          );
          ctx.beginPath();
          ctx.globalAlpha = promptAlpha;
          ctx.fillStyle = prompt.label === 1 ? "rgba(34,197,94,0.95)" : "rgba(248,113,113,0.95)";
          ctx.strokeStyle = "rgba(255,255,255,0.95)";
          ctx.lineWidth = Math.max(1, radius * 0.25);
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.restore();
  };

  createEffect(() => {
    const frame = props.frame;
    if (frame) {
      latestFrameRef.current = {
        frame,
        prepared: prepareFrameCanvas(frame),
      };
    } else {
      latestFrameRef.current = null;
    }
    renderNow();
  });

  createEffect(() => {
    props.labels;
    props.mask;
    props.overlayOpacity;
    props.smartSegmentPrompts;
    props.tool;
    lassoPoints();
    renderNow();
  });

  useCanvasThemeRerender(renderNow);

  onMount(() => {
    const canvas = canvasEl;
    const viewport = viewportEl;
    if (!canvas || !viewport) return;

    const resize = () => {
      if (resizeRafRef.current != null) {
        window.cancelAnimationFrame(resizeRafRef.current);
      }
      resizeRafRef.current = window.requestAnimationFrame(() => {
        resizeRafRef.current = null;
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(1, Math.floor(viewport.clientWidth * dpr));
        const height = Math.max(1, Math.floor(viewport.clientHeight * dpr));
        dprRef.current = dpr;
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        const cssWidth = `${viewport.clientWidth}px`;
        const cssHeight = `${viewport.clientHeight}px`;
        if (canvas.style.width !== cssWidth) canvas.style.width = cssWidth;
        if (canvas.style.height !== cssHeight) canvas.style.height = cssHeight;
        renderNow();
      });
    };

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(viewport);
    resize();

    onCleanup(() => {
      if (resizeRafRef.current != null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
      if (renderRafRef.current != null) {
        window.cancelAnimationFrame(renderRafRef.current);
        renderRafRef.current = null;
      }
      resizeObserver.disconnect();
    });
  });

  const framePointFromEvent = (event: PointerEvent): FramePoint | null => {
    const viewport = viewportEl;
    const cached = latestFrameRef.current;
    if (!viewport || !cached) return null;
    const bounds = viewport.getBoundingClientRect();
    const rect = drawRectFor(bounds.width, bounds.height, cached.frame);
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    if (x < rect.x || y < rect.y || x > rect.x + rect.width || y > rect.y + rect.height) {
      return null;
    }
    return {
      x: clamp(Math.floor((x - rect.x) / rect.scale), 0, cached.frame.width - 1),
      y: clamp(Math.floor((y - rect.y) / rect.scale), 0, cached.frame.height - 1),
    };
  };

  const finishLasso = (event: PointerEvent) => {
    const active = lassoRef.current;
    const cached = latestFrameRef.current;
    if (!active || active.pointerId !== event.pointerId || !cached) return;
    lassoRef.current = null;
    setLassoPoints([]);
    const target = event.currentTarget as HTMLCanvasElement;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    const value = eraseMode() ? 0 : activeLabelValue();
    if (value <= 0 && !eraseMode()) return;
    if (brushMode()) {
      props.onMaskCommit(
        strokeMask(
          props.mask,
          cached.frame.width,
          cached.frame.height,
          active.points,
          value,
          props.brushSize,
        ),
      );
    } else if (active.points.length >= 3) {
      props.onMaskCommit(
        fillPolygon(props.mask, cached.frame.width, cached.frame.height, active.points, value),
      );
    }
  };

  return (
    <div
      ref={viewportEl!}
      class={cn("relative h-full min-h-0 w-full overflow-hidden bg-background", props.class)}
    >
      <Show when={!props.frame && props.emptyText}>
        <div class="flex h-full items-center justify-center text-muted-foreground text-sm">
          {props.emptyText}
        </div>
      </Show>
      <canvas
        ref={canvasEl!}
        class="block touch-none"
        style={{
          cursor: props.disabled || !props.frame ? "default" : "crosshair",
        }}
        onPointerDown={(event) => {
          if (props.disabled || !props.frame || event.pointerType !== "mouse") return;
          const point = framePointFromEvent(event);
          if (!point) return;
          if (smartToolMode()) {
            if (event.button !== 0 && event.button !== 2) return;
            if (activeLabelValue() <= 0) return;
            event.preventDefault();
            if (smartEraseMode()) {
              if (event.button !== 0) return;
              props.onSmartEraseClick?.({ x: point.x, y: point.y });
              return;
            }
            props.onSmartSegmentClick?.({
              x: point.x,
              y: point.y,
              negative: event.button === 2,
            });
            return;
          }
          if (event.button !== 0) return;
          if (!eraseMode() && activeLabelValue() <= 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          lassoRef.current = {
            pointerId: event.pointerId,
            points: [point],
          };
          setLassoPoints([point]);
        }}
        onPointerMove={(event) => {
          if (smartToolMode()) return;
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
      <CanvasStatusMessageStack messages={props.messages} />
      <CanvasToastStack messages={props.toasts} />
    </div>
  );
}

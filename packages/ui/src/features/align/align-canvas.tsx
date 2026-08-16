import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import type { AlignGridToolMode, FrameLayout, FrameResult } from "@lisca/utils";
import { createFrameViewController, type CanvasStatusMessage } from "@lisca/ui-headless";
import {
  alignGridOverlayColors,
  buildAlignFrameHaloRect,
  buildAlignGridOverlayScene,
  frameViewWheelFactor,
  prepareFrameRgba,
  type AlignGridWheelViewport,
} from "@lisca/utils";
import { createEffect, onCleanup, onMount, Show } from "solid-js";
import { cn } from "../../lib/utils";
import { CanvasStatusMessageStack, CanvasToastStack } from "../canvas/canvas-status";
import { resolvedCanvasBackground, useCanvasThemeRerender } from "../canvas/canvas-theme";
export type {
  AlignCanvasFramePoint,
  AlignCanvasPointerEvent,
} from "@lisca/ui-headless/align-canvas-handlers";
import type {
  AlignCanvasFramePoint,
  AlignCanvasPointerEvent,
} from "@lisca/ui-headless/align-canvas-handlers";

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
  previewGridRef?: { current: AlignGridState | null };
  previewRedrawRef?: { current: (() => void) | null };
  excludedCells?: Iterable<AlignGridCellCoord>;
  emptyText?: string;
  messages?: CanvasStatusMessage[];
  alertMessages?: CanvasStatusMessage[];
  toasts?: CanvasStatusMessage[];
  class?: string;
  cursor?: string;
  toolMode?: AlignGridToolMode;
  onVirtualPointerDown?: (event: AlignCanvasPointerEvent) => void;
  onVirtualPointerMove?: (event: AlignCanvasPointerEvent) => void;
  onVirtualPointerUp?: (event: AlignCanvasPointerEvent) => void;
  onVirtualPointerCancel?: (event: AlignCanvasPointerEvent) => void;
  onVirtualWheel?: (event: AlignCanvasWheelEvent) => void;
};

function frameBitmapCacheKey(frame: FrameResult): string {
  const contrast = frame.appliedContrast ?? frame.suggestedContrast ?? frame.contrastDomain;
  const contrastKey = contrast ? `${contrast.min}:${contrast.max}` : "none";
  return `${frame.width}x${frame.height}:${frame.pixelType ?? "uint8"}:${contrastKey}:${frame.pixels.length}`;
}

function createPreparedFrameBitmap(frame: FrameResult): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const rgba = prepareFrameRgba(frame);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), frame.width, frame.height), 0, 0);
  return canvas;
}

const preparedBitmapCache = { key: "", bitmap: null as HTMLCanvasElement | null };

function getPreparedFrameBitmap(frame: FrameResult | null): HTMLCanvasElement | null {
  if (!frame) return null;
  const key = frameBitmapCacheKey(frame);
  if (preparedBitmapCache.key === key) return preparedBitmapCache.bitmap;
  const bitmap = createPreparedFrameBitmap(frame);
  preparedBitmapCache.key = key;
  preparedBitmapCache.bitmap = bitmap;
  return bitmap;
}

function drawFrameHalo(ctx: CanvasRenderingContext2D, frameLayout: FrameLayout) {
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
  ctx.strokeStyle = alignGridOverlayColors.spacingA;
  ctx.beginPath();
  ctx.moveTo(scene.spacingA.start.x, scene.spacingA.start.y);
  ctx.lineTo(scene.spacingA.end.x, scene.spacingA.end.y);
  ctx.stroke();
  ctx.strokeStyle = alignGridOverlayColors.spacingB;
  ctx.beginPath();
  ctx.moveTo(scene.spacingB.start.x, scene.spacingB.start.y);
  ctx.lineTo(scene.spacingB.end.x, scene.spacingB.end.y);
  ctx.stroke();
}

export function AlignCanvas(props: AlignCanvasProps) {
  let frameCanvasEl: HTMLCanvasElement | undefined;
  let overlayCanvasEl: HTMLCanvasElement | undefined;
  let viewportEl: HTMLDivElement | undefined;

  const frameRafRef = { current: null as number | null };
  const overlayRafRef = { current: null as number | null };
  const resizeRafRef = { current: null as number | null };
  const gridRef = { current: props.grid };
  const frameRef = { current: props.frame };
  const dprRef = { current: 1 };
  const excludedCellKeysRef = { current: new Set<string>() };
  const frameView = createFrameViewController();

  createEffect(() => {
    gridRef.current = props.grid;
  });

  createEffect(() => {
    frameRef.current = props.frame;
    frameView.syncFrame(props.frame);
  });

  createEffect(() => {
    excludedCellKeysRef.current = new Set(
      Array.from(props.excludedCells ?? [], (cell: AlignGridCellCoord) => `${cell.i}:${cell.j}`),
    );
  });

  const renderFrameLayer = () => {
    frameRafRef.current = null;
    const canvas = frameCanvasEl;
    const view = viewportEl;
    const currentFrame = frameRef.current;
    const bitmap = getPreparedFrameBitmap(currentFrame);
    if (!canvas || !view) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cssWidth = view.clientWidth;
    const cssHeight = view.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dprRef.current, dprRef.current);
    ctx.fillStyle = resolvedCanvasBackground(view ?? undefined);
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    if (currentFrame && bitmap) {
      const frameLayout = frameView.layout(cssWidth, cssHeight, currentFrame);
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
    const canvas = overlayCanvasEl;
    const view = viewportEl;
    const currentFrame = frameRef.current;
    if (!canvas || !view) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cssWidth = view.clientWidth;
    const cssHeight = view.clientHeight;
    const activeGrid = props.previewGridRef?.current ?? gridRef.current;
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
      frameView.layout(cssWidth, cssHeight, currentFrame),
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

  createEffect(() => {
    getPreparedFrameBitmap(props.frame);
    scheduleFrameRender();
    scheduleOverlayRender();
  });

  createEffect(() => {
    props.grid;
    props.excludedCells;
    scheduleOverlayRender();
  });

  createEffect(() => {
    frameView.view();
    scheduleAllRender();
  });

  createEffect(() => {
    if (!props.previewRedrawRef) return;
    props.previewRedrawRef.current = scheduleOverlayRender;
    onCleanup(() => {
      if (props.previewRedrawRef) props.previewRedrawRef.current = null;
    });
  });

  useCanvasThemeRerender(scheduleFrameRender);

  onMount(() => {
    const view = viewportEl;
    const frameCanvas = frameCanvasEl;
    const overlayCanvas = overlayCanvasEl;
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
      scheduleAllRender();
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

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(view);
    resize();

    onCleanup(() => {
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
      resizeObserver.disconnect();
    });
  });

  const getFramePointFromClient = (
    clientX: number,
    clientY: number,
  ): AlignCanvasFramePoint | null => {
    const currentFrame = frameRef.current;
    const view = viewportEl;
    if (!currentFrame || !view) return null;
    const bounds = view.getBoundingClientRect();
    const frameLayout = frameView.layout(bounds.width, bounds.height, currentFrame);
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
    const view = viewportEl;
    const currentFrame = frameRef.current;
    if (!view || !currentFrame) return null;
    return {
      displayWidth: view.clientWidth,
      displayHeight: view.clientHeight,
      modelWidth: currentFrame.width,
      modelHeight: currentFrame.height,
      scale: frameView.layout(view.clientWidth, view.clientHeight, currentFrame).scale,
    };
  };

  const toVirtualPointerEvent = (event: PointerEvent): AlignCanvasPointerEvent => ({
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    button: event.button,
    buttons: event.buttons,
    altKey: event.altKey,
    clientX: event.clientX,
    clientY: event.clientY,
    framePoint: getFramePointFromClient(event.clientX, event.clientY),
    viewport: getViewport(),
    preventDefault: () => event.preventDefault(),
    capturePointer: () => (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId),
    releasePointer: () => {
      const target = event.currentTarget as HTMLElement;
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
    },
  });

  const toVirtualWheelEvent = (event: WheelEvent): AlignCanvasWheelEvent => ({
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

  const zoomAtFramePoint = (factor: number, point: AlignCanvasFramePoint) => {
    const view = viewportEl;
    const currentFrame = frameRef.current;
    if (!view || !currentFrame) return;
    frameView.zoomAtFramePoint(factor, point, view.clientWidth, view.clientHeight, currentFrame);
  };

  createEffect(() => {
    if (props.toolMode !== "magnifier") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (event.target instanceof HTMLElement &&
          Boolean(event.target.closest("input, textarea, select, [contenteditable='true']")))
      ) {
        return;
      }
      const view = viewportEl;
      const currentFrame = frameRef.current;
      if (!view || !currentFrame) return;
      if (event.key === "0") {
        event.preventDefault();
        frameView.reset(currentFrame);
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        frameView.zoomAtCenter(2, view.clientWidth, view.clientHeight, currentFrame);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        frameView.zoomAtCenter(0.5, view.clientWidth, view.clientHeight, currentFrame);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  return (
    <div
      ref={viewportEl!}
      data-frame-view-zoom={frameView.view().zoom}
      class={cn("relative h-full min-h-0 w-full flex-1 overflow-hidden bg-background", props.class)}
    >
      <Show when={!props.frame && props.emptyText}>
        <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
          {props.emptyText}
        </div>
      </Show>
      <div
        class="absolute inset-0"
        style={{
          cursor: props.cursor ?? "default",
          "touch-action": "none",
        }}
        onContextMenu={(event) => event.preventDefault()}
        onPointerCancel={(event) => {
          props.onVirtualPointerCancel?.(toVirtualPointerEvent(event));
        }}
        onPointerDown={(event) => {
          const virtualEvent = toVirtualPointerEvent(event);
          if (props.toolMode === "magnifier") {
            if (!virtualEvent.framePoint) return;
            if (event.button !== 0 && event.button !== 2) return;
            event.preventDefault();
            zoomAtFramePoint(event.altKey || event.button === 2 ? 0.5 : 2, virtualEvent.framePoint);
            return;
          }
          props.onVirtualPointerDown?.(virtualEvent);
        }}
        onPointerMove={(event) => {
          if (props.toolMode === "magnifier") return;
          props.onVirtualPointerMove?.(toVirtualPointerEvent(event));
        }}
        onPointerUp={(event) => {
          const virtualEvent = toVirtualPointerEvent(event);
          if (props.toolMode === "magnifier") {
            props.onVirtualPointerCancel?.(virtualEvent);
            return;
          }
          props.onVirtualPointerUp?.(virtualEvent);
        }}
        onWheel={(event) => {
          if (props.toolMode === "magnifier") {
            const point = getFramePointFromClient(event.clientX, event.clientY);
            const view = viewportEl;
            if (!point || !view) return;
            event.preventDefault();
            zoomAtFramePoint(
              frameViewWheelFactor(event.deltaY, event.deltaMode, view.clientHeight),
              point,
            );
            return;
          }
          props.onVirtualWheel?.(toVirtualWheelEvent(event));
        }}
      >
        <canvas ref={frameCanvasEl!} class="absolute inset-0 block h-full w-full select-none" />
        <canvas
          ref={overlayCanvasEl!}
          class="pointer-events-none absolute inset-0 block h-full w-full select-none"
        />
      </div>

      <CanvasStatusMessageStack messages={props.messages} />
      <CanvasStatusMessageStack align="right" messages={props.alertMessages} />
      <CanvasToastStack messages={props.toasts} />
    </div>
  );
}

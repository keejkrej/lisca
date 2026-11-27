import { Component, Mount } from "@effect/ui";
import type { Html } from "@effect/ui/html";
import type { AlignGridPatternCoord, AlignGridState } from "@lisca/contracts";
import { cn } from "@lisca/ui/cn";
import { createFrameViewController, type CanvasStatusMessage } from "@lisca/ui-headless";
import type {
  AlignCanvasFramePoint,
  AlignCanvasPointerEvent,
} from "@lisca/ui-headless/align-canvas-handlers";
import {
  alignGridOverlayColors,
  buildAlignFrameHaloRect,
  buildAlignGridOverlayScene,
  frameViewWheelFactor,
  prepareFrameRgba,
  type AlignGridToolMode,
  type AlignGridWheelViewport,
  type FrameLayout,
  type FrameResult,
} from "@lisca/utils";
import { Effect, Schema, Stream } from "effect";

import { CanvasStatusMessageStack, CanvasToastStack } from "../canvas/canvas-status";
import { observeCanvasThemeRerender, resolvedCanvasBackground } from "../canvas/canvas-theme";

export type {
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

export type AlignCanvasOptions = {
  readonly frame: FrameResult | null;
  readonly grid: AlignGridState;
  readonly previewGridRef?: { current: AlignGridState | null } | undefined;
  readonly previewRedrawRef?: { current: (() => void) | null } | undefined;
  readonly excludedPatterns?: Iterable<AlignGridPatternCoord> | undefined;
  readonly emptyText?: string | undefined;
  readonly messages?: readonly CanvasStatusMessage[] | undefined;
  readonly alertMessages?: readonly CanvasStatusMessage[] | undefined;
  readonly toasts?: readonly CanvasStatusMessage[] | undefined;
  readonly class?: string | undefined;
  readonly cursor?: string | undefined;
  readonly toolMode?: AlignGridToolMode | undefined;
  readonly onVirtualPointerDown?: ((event: AlignCanvasPointerEvent) => void) | undefined;
  readonly onVirtualPointerMove?: ((event: AlignCanvasPointerEvent) => void) | undefined;
  readonly onVirtualPointerUp?: ((event: AlignCanvasPointerEvent) => void) | undefined;
  readonly onVirtualPointerCancel?: ((event: AlignCanvasPointerEvent) => void) | undefined;
  readonly onVirtualWheel?: ((event: AlignCanvasWheelEvent) => void) | undefined;
};

export type AlignCanvasProps = AlignCanvasOptions;

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

const preparedBitmapCache = {
  key: "",
  pixels: null as FrameResult["pixels"] | null,
  bitmap: null as HTMLCanvasElement | null,
};

function getPreparedFrameBitmap(frame: FrameResult | null): HTMLCanvasElement | null {
  if (!frame) return null;
  const key = frameBitmapCacheKey(frame);
  if (preparedBitmapCache.pixels === frame.pixels && preparedBitmapCache.key === key) {
    return preparedBitmapCache.bitmap;
  }
  const bitmap = createPreparedFrameBitmap(frame);
  preparedBitmapCache.key = key;
  preparedBitmapCache.pixels = frame.pixels;
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

function drawAxisLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  origin: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
) {
  const dx = end.x - origin.x;
  const dy = end.y - origin.y;
  const length = Math.hypot(dx, dy) || 1;
  ctx.fillStyle = color;
  ctx.font = "600 12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, end.x + (dx / length) * 12, end.y + (dy / length) * 12);
}

function drawGridOverlayFromScene(
  ctx: CanvasRenderingContext2D,
  scene: NonNullable<ReturnType<typeof buildAlignGridOverlayScene>>,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(scene.clipRect.x, scene.clipRect.y, scene.clipRect.w, scene.clipRect.h);
  ctx.clip();
  for (const pattern of scene.patterns) {
    const rgb = pattern.excluded
      ? alignGridOverlayColors.excludedRgb
      : alignGridOverlayColors.includedRgb;
    ctx.fillStyle = `rgba(${rgb}, ${scene.fillOpacity})`;
    ctx.strokeStyle = `rgba(${rgb}, ${scene.strokeOpacity})`;
    ctx.lineWidth = 1;
    ctx.fillRect(pattern.x, pattern.y, pattern.w, pattern.h);
    ctx.strokeRect(
      pattern.x + 0.5,
      pattern.y + 0.5,
      Math.max(0, pattern.w - 1),
      Math.max(0, pattern.h - 1),
    );
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
  drawAxisLabel(ctx, "X", scene.origin, scene.spacingA.end, alignGridOverlayColors.spacingA);
  drawAxisLabel(ctx, "Y", scene.origin, scene.spacingB.end, alignGridOverlayColors.spacingB);
}

type AlignCanvasMountArgs = {
  readonly frame: FrameResult | null;
  readonly grid: AlignGridState;
  readonly excludedPatterns: Iterable<AlignGridPatternCoord> | undefined;
  readonly previewGridRef: { current: AlignGridState | null } | undefined;
  readonly previewRedrawRef: { current: (() => void) | null } | undefined;
  readonly toolMode: AlignGridToolMode | undefined;
  readonly onVirtualPointerDown: ((event: AlignCanvasPointerEvent) => void) | undefined;
  readonly onVirtualPointerMove: ((event: AlignCanvasPointerEvent) => void) | undefined;
  readonly onVirtualPointerUp: ((event: AlignCanvasPointerEvent) => void) | undefined;
  readonly onVirtualPointerCancel: ((event: AlignCanvasPointerEvent) => void) | undefined;
  readonly onVirtualWheel: ((event: AlignCanvasWheelEvent) => void) | undefined;
};

const MountAlignCanvas = Mount.make(
  "LiscaAlignCanvasMount",
  {
    args: {
      frame: Schema.Any,
      grid: Schema.Any,
      excludedPatterns: Schema.Any,
      previewGridRef: Schema.Any,
      previewRedrawRef: Schema.Any,
      toolMode: Schema.Any,
      onVirtualPointerDown: Schema.Any,
      onVirtualPointerMove: Schema.Any,
      onVirtualPointerUp: Schema.Any,
      onVirtualPointerCancel: Schema.Any,
      onVirtualWheel: Schema.Any,
    },
  },
  (viewport: HTMLDivElement, initialRaw, changes) =>
    Effect.scoped(
      Effect.gen(function* () {
        let current = initialRaw as AlignCanvasMountArgs;

        const stage = viewport.querySelector<HTMLDivElement>("[data-align-canvas-stage]");
        const frameCanvas = viewport.querySelector<HTMLCanvasElement>("canvas[data-layer='frame']");
        const overlayCanvas = viewport.querySelector<HTMLCanvasElement>(
          "canvas[data-layer='overlay']",
        );

        let dpr = 1;
        let frameRaf: number | null = null;
        let overlayRaf: number | null = null;
        let resizeRaf: number | null = null;
        let excludedPatternKeys = new Set<string>();
        const frameView = createFrameViewController();

        const syncExcluded = (excluded: Iterable<AlignGridPatternCoord> | undefined) => {
          excludedPatternKeys = new Set(
            Array.from(excluded ?? [], (pattern) => `${pattern.i}:${pattern.j}`),
          );
        };

        const syncZoomAttr = () => {
          viewport.dataset.frameViewZoom = String(frameView.view().zoom);
        };

        const renderFrameLayer = () => {
          frameRaf = null;
          if (!frameCanvas) return;
          const ctx = frameCanvas.getContext("2d");
          if (!ctx || typeof ctx.clearRect !== "function") return;
          const currentFrame = current.frame;
          const bitmap = getPreparedFrameBitmap(currentFrame);
          const cssWidth = viewport.clientWidth;
          const cssHeight = viewport.clientHeight;
          ctx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.fillStyle = resolvedCanvasBackground(viewport);
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
          overlayRaf = null;
          if (!overlayCanvas) return;
          const ctx = overlayCanvas.getContext("2d");
          if (!ctx || typeof ctx.clearRect !== "function") return;
          const currentFrame = current.frame;
          const cssWidth = viewport.clientWidth;
          const cssHeight = viewport.clientHeight;
          const activeGrid = current.previewGridRef?.current ?? current.grid;
          ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
          if (!currentFrame) return;
          ctx.save();
          ctx.scale(dpr, dpr);
          const scene = buildAlignGridOverlayScene(
            currentFrame,
            activeGrid,
            cssWidth,
            cssHeight,
            excludedPatternKeys,
            frameView.layout(cssWidth, cssHeight, currentFrame),
          );
          if (scene) {
            drawGridOverlayFromScene(ctx, scene);
          }
          ctx.restore();
        };

        const scheduleFrameRender = () => {
          if (frameRaf !== null) return;
          frameRaf = window.requestAnimationFrame(renderFrameLayer);
        };

        const scheduleOverlayRender = () => {
          if (overlayRaf !== null) return;
          overlayRaf = window.requestAnimationFrame(renderOverlayLayer);
        };

        const scheduleAllRender = () => {
          scheduleFrameRender();
          scheduleOverlayRender();
        };

        const resizeCanvases = () => {
          if (!frameCanvas || !overlayCanvas) return;
          const nextDpr = window.devicePixelRatio || 1;
          const width = Math.max(1, Math.floor(viewport.clientWidth * nextDpr));
          const height = Math.max(1, Math.floor(viewport.clientHeight * nextDpr));
          dpr = nextDpr;
          for (const canvas of [frameCanvas, overlayCanvas]) {
            if (canvas.width !== width) canvas.width = width;
            if (canvas.height !== height) canvas.height = height;
            const cssWidth = `${viewport.clientWidth}px`;
            const cssHeight = `${viewport.clientHeight}px`;
            if (canvas.style.width !== cssWidth) canvas.style.width = cssWidth;
            if (canvas.style.height !== cssHeight) canvas.style.height = cssHeight;
          }
          scheduleAllRender();
        };

        const scheduleResize = () => {
          if (resizeRaf !== null) {
            window.cancelAnimationFrame(resizeRaf);
          }
          resizeRaf = window.requestAnimationFrame(() => {
            resizeRaf = null;
            resizeCanvases();
          });
        };

        const getFramePointFromClient = (
          clientX: number,
          clientY: number,
        ): AlignCanvasFramePoint | null => {
          const currentFrame = current.frame;
          if (!currentFrame) return null;
          const bounds = viewport.getBoundingClientRect();
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
          const currentFrame = current.frame;
          if (!currentFrame) return null;
          return {
            displayWidth: viewport.clientWidth,
            displayHeight: viewport.clientHeight,
            modelWidth: currentFrame.width,
            modelHeight: currentFrame.height,
            scale: frameView.layout(viewport.clientWidth, viewport.clientHeight, currentFrame)
              .scale,
          };
        };

        const toVirtualPointerEvent = (event: PointerEvent): AlignCanvasPointerEvent => {
          const target = (event.currentTarget as HTMLElement | null) ?? stage;
          return {
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
            capturePointer: () => target?.setPointerCapture?.(event.pointerId),
            releasePointer: () => {
              if (target?.hasPointerCapture?.(event.pointerId)) {
                target.releasePointerCapture?.(event.pointerId);
              }
            },
          };
        };

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
          const currentFrame = current.frame;
          if (!currentFrame) return;
          frameView.zoomAtFramePoint(
            factor,
            point,
            viewport.clientWidth,
            viewport.clientHeight,
            currentFrame,
          );
        };

        const onContextMenu = (event: Event) => {
          event.preventDefault();
        };

        const onPointerCancel = (event: Event) => {
          current.onVirtualPointerCancel?.(toVirtualPointerEvent(event as PointerEvent));
        };

        const onPointerDown = (event: Event) => {
          const pointerEvent = event as PointerEvent;
          const virtualEvent = toVirtualPointerEvent(pointerEvent);
          if (current.toolMode === "magnifier") {
            if (!virtualEvent.framePoint) return;
            if (pointerEvent.button !== 0 && pointerEvent.button !== 2) return;
            pointerEvent.preventDefault();
            zoomAtFramePoint(
              pointerEvent.altKey || pointerEvent.button === 2 ? 0.5 : 2,
              virtualEvent.framePoint,
            );
            return;
          }
          current.onVirtualPointerDown?.(virtualEvent);
        };

        const onPointerMove = (event: Event) => {
          if (current.toolMode === "magnifier") return;
          current.onVirtualPointerMove?.(toVirtualPointerEvent(event as PointerEvent));
        };

        const onPointerUp = (event: Event) => {
          const virtualEvent = toVirtualPointerEvent(event as PointerEvent);
          if (current.toolMode === "magnifier") {
            current.onVirtualPointerCancel?.(virtualEvent);
            return;
          }
          current.onVirtualPointerUp?.(virtualEvent);
        };

        const onWheel = (event: Event) => {
          const wheelEvent = event as WheelEvent;
          if (current.toolMode === "magnifier") {
            const point = getFramePointFromClient(wheelEvent.clientX, wheelEvent.clientY);
            if (!point) return;
            wheelEvent.preventDefault();
            zoomAtFramePoint(
              frameViewWheelFactor(wheelEvent.deltaY, wheelEvent.deltaMode, viewport.clientHeight),
              point,
            );
            return;
          }
          current.onVirtualWheel?.(toVirtualWheelEvent(wheelEvent));
        };

        const onKeyDown = (event: KeyboardEvent) => {
          if (current.toolMode !== "magnifier") return;
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.altKey ||
            (event.target instanceof HTMLElement &&
              Boolean(event.target.closest("input, textarea, select, [contenteditable='true']")))
          ) {
            return;
          }
          const currentFrame = current.frame;
          if (!currentFrame) return;
          if (event.key === "0") {
            event.preventDefault();
            frameView.reset(currentFrame);
          } else if (event.key === "+" || event.key === "=") {
            event.preventDefault();
            frameView.zoomAtCenter(2, viewport.clientWidth, viewport.clientHeight, currentFrame);
          } else if (event.key === "-" || event.key === "_") {
            event.preventDefault();
            frameView.zoomAtCenter(0.5, viewport.clientWidth, viewport.clientHeight, currentFrame);
          }
        };

        yield* Effect.acquireRelease(
          Effect.sync(() => {
            syncExcluded(current.excludedPatterns);
            frameView.syncFrame(current.frame);
            syncZoomAttr();
            getPreparedFrameBitmap(current.frame);
            if (current.previewRedrawRef) {
              current.previewRedrawRef.current = scheduleOverlayRender;
            }

            const unsubscribeView = frameView.subscribe(() => {
              syncZoomAttr();
              scheduleAllRender();
            });

            stage?.addEventListener("contextmenu", onContextMenu);
            stage?.addEventListener("pointercancel", onPointerCancel);
            stage?.addEventListener("pointerdown", onPointerDown);
            stage?.addEventListener("pointermove", onPointerMove);
            stage?.addEventListener("pointerup", onPointerUp);
            stage?.addEventListener("wheel", onWheel);
            window.addEventListener("keydown", onKeyDown);

            const resizeObserver =
              typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => scheduleResize())
                : null;
            resizeObserver?.observe(viewport);
            scheduleResize();

            const stopThemeObserver =
              typeof MutationObserver !== "undefined"
                ? observeCanvasThemeRerender(scheduleFrameRender)
                : () => {};

            return { unsubscribeView, resizeObserver, stopThemeObserver };
          }),
          ({ unsubscribeView, resizeObserver, stopThemeObserver }) =>
            Effect.sync(() => {
              unsubscribeView();
              stage?.removeEventListener("contextmenu", onContextMenu);
              stage?.removeEventListener("pointercancel", onPointerCancel);
              stage?.removeEventListener("pointerdown", onPointerDown);
              stage?.removeEventListener("pointermove", onPointerMove);
              stage?.removeEventListener("pointerup", onPointerUp);
              stage?.removeEventListener("wheel", onWheel);
              window.removeEventListener("keydown", onKeyDown);
              resizeObserver?.disconnect();
              stopThemeObserver();
              if (current.previewRedrawRef) {
                current.previewRedrawRef.current = null;
              }
              if (resizeRaf !== null) {
                window.cancelAnimationFrame(resizeRaf);
                resizeRaf = null;
              }
              if (frameRaf !== null) {
                window.cancelAnimationFrame(frameRaf);
                frameRaf = null;
              }
              if (overlayRaf !== null) {
                window.cancelAnimationFrame(overlayRaf);
                overlayRaf = null;
              }
            }),
        );

        yield* Stream.runForEach(changes, (nextRaw) =>
          Effect.sync(() => {
            const prev = current;
            const next = nextRaw as AlignCanvasMountArgs;
            current = next;

            if (prev.previewRedrawRef !== next.previewRedrawRef) {
              if (prev.previewRedrawRef) prev.previewRedrawRef.current = null;
              if (next.previewRedrawRef) next.previewRedrawRef.current = scheduleOverlayRender;
            }

            if (prev.excludedPatterns !== next.excludedPatterns) {
              syncExcluded(next.excludedPatterns);
            }

            const frameChanged = prev.frame !== next.frame;
            const overlayChanged =
              prev.grid !== next.grid || prev.excludedPatterns !== next.excludedPatterns;

            if (frameChanged) {
              frameView.syncFrame(next.frame);
              getPreparedFrameBitmap(next.frame);
              scheduleAllRender();
            } else if (overlayChanged) {
              scheduleOverlayRender();
            }
          }),
        );

        return Component.noop;
      }),
    ),
);

export function AlignCanvas<M>(h: Html.H<M>, options: AlignCanvasOptions) {
  return h.div
    .class(cn("relative h-full min-h-0 w-full flex-1 overflow-hidden bg-paper", options.class))
    .onMount(
      MountAlignCanvas({
        frame: options.frame,
        grid: options.grid,
        excludedPatterns: options.excludedPatterns,
        previewGridRef: options.previewGridRef,
        previewRedrawRef: options.previewRedrawRef,
        toolMode: options.toolMode,
        onVirtualPointerDown: options.onVirtualPointerDown,
        onVirtualPointerMove: options.onVirtualPointerMove,
        onVirtualPointerUp: options.onVirtualPointerUp,
        onVirtualPointerCancel: options.onVirtualPointerCancel,
        onVirtualWheel: options.onVirtualWheel,
      }),
    )
    .children(
      !options.frame && options.emptyText
        ? h.div
            .class(
              "pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm text-muted-foreground",
            )
            .children(options.emptyText)
        : undefined,
      h.div
        .attr("data-align-canvas-stage", "")
        .class("absolute inset-0")
        .style({
          cursor: options.cursor ?? "default",
          touchAction: "none",
        })
        .children(
          h.canvas
            .attr("data-layer", "frame")
            .class("absolute inset-0 block h-full w-full select-none"),
          h.canvas
            .attr("data-layer", "overlay")
            .class("pointer-events-none absolute inset-0 block h-full w-full select-none"),
        ),
      CanvasStatusMessageStack(h, { messages: options.messages }),
      CanvasStatusMessageStack(h, { align: "right", messages: options.alertMessages }),
      CanvasToastStack(h, { messages: options.toasts }),
    );
}

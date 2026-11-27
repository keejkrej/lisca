import { Mount, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { AnnotationLabelSchema, type AnnotationLabel } from "@lisca/contracts";
import { createAnnotationCanvasHandlers } from "@lisca/ui-headless/annotation-canvas-handlers";
import { createFrameViewController } from "@lisca/ui-headless/frame-view-controller";
import type { CanvasStatusMessage } from "@lisca/ui-headless/types";
import { cn } from "@lisca/ui/cn";
import {
  clamp,
  frameViewWheelFactor,
  hexToRgb,
  isMagnifierAnnotationTool,
  isSmartAnnotationTool,
  prepareFrameRgba,
  smartSegmentPromptRadius,
  type AnnotationTool,
  type FrameResult,
} from "@lisca/utils";
import { Effect, Queue, Schema, Stream } from "effect";

import { CanvasStatusMessageStack, CanvasToastStack } from "../canvas/canvas-status";
import { resolvedCanvasBackground } from "../canvas/canvas-theme";

export type { AnnotationTool } from "@lisca/utils";

export type SmartSegmentPrompt = {
  readonly x: number;
  readonly y: number;
  readonly label: 0 | 1;
};

type FramePoint = {
  readonly x: number;
  readonly y: number;
};

type PreparedFrame = {
  readonly frame: FrameResult;
  readonly prepared: HTMLCanvasElement;
};

const AnnotationToolSchema = Schema.Literals([
  "brush",
  "brush-erase",
  "lasso",
  "lasso-erase",
  "smart",
  "smart-erase",
  "magnifier",
]);

const SmartSegmentPromptSchema = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  label: Schema.Literals([0, 1]),
});

const CanvasStatusMessageSchema = Schema.Struct({
  text: Schema.String,
  tone: Schema.optional(Schema.Literals(["default", "success", "error"])),
});

function prepareFrameCanvas(frame: FrameResult): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const rgba = prepareFrameRgba(frame);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), frame.width, frame.height), 0, 0);
  return canvas;
}

function prepareMaskCanvas(
  width: number,
  height: number,
  labels: readonly AnnotationLabel[],
  mask: Uint8Array,
): HTMLCanvasElement {
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

const CanvasMountArgsSchema = {
  frame: Schema.NullOr(Schema.Any),
  labels: Schema.Array(AnnotationLabelSchema),
  mask: Schema.Any,
  activeLabelId: Schema.NullOr(Schema.String),
  tool: AnnotationToolSchema,
  brushSize: Schema.Number,
  overlayOpacity: Schema.Number,
  disabled: Schema.Boolean,
  smartSegmentPrompts: Schema.Array(SmartSegmentPromptSchema),
};

const CanvasMountEvent = UiSchema.TaggedEnum({
  ZoomChanged: { zoom: Schema.Number },
  MaskCommitted: { mask: Schema.Any },
  SmartSegmentClicked: { x: Schema.Number, y: Schema.Number, negative: Schema.Boolean },
  SmartEraseClicked: { x: Schema.Number, y: Schema.Number },
});

type CanvasMountEventType = typeof CanvasMountEvent.Type;

const AttachAnnotationCanvas = Mount.makeStream(
  "LiscaAnnotationCanvas",
  { args: CanvasMountArgsSchema },
  (canvas: HTMLCanvasElement, initialArgs, changes) =>
    Stream.unwrap(
      Effect.sync(() => {
        let latestArgs = initialArgs;
        let dpr = 1;
        let latestFrame: PreparedFrame | null = null;
        let cachedMask: {
          width: number;
          height: number;
          labelsKey: string;
          mask: Uint8Array;
          canvas: HTMLCanvasElement;
        } | null = null;
        let renderRaf: number | null = null;
        let resizeRaf: number | null = null;
        let themeRaf: number | null = null;
        let activePointerId: number | null = null;
        let emitEvent: ((event: CanvasMountEventType) => void) | null = null;

        const frameView = createFrameViewController();
        const viewportEl = () => canvas.parentElement;

        const drawRectFor = (width: number, height: number, frame: FrameResult) => {
          const layout = frameView.layout(width, height, frame);
          return {
            x: layout.drawX,
            y: layout.drawY,
            width: layout.drawWidth,
            height: layout.drawHeight,
            scale: layout.scale,
          };
        };

        const getMaskCanvas = (
          width: number,
          height: number,
          labels: readonly AnnotationLabel[],
          mask: Uint8Array,
        ) => {
          const labelsKey = labels.map((label) => `${label.id}:${label.color}`).join("|");
          if (
            cachedMask &&
            cachedMask.width === width &&
            cachedMask.height === height &&
            cachedMask.labelsKey === labelsKey &&
            cachedMask.mask === mask
          ) {
            return cachedMask.canvas;
          }
          const nextCanvas = prepareMaskCanvas(width, height, labels, mask);
          cachedMask = { width, height, labelsKey, mask, canvas: nextCanvas };
          return nextCanvas;
        };

        const handlers = createAnnotationCanvasHandlers(() => {
          const viewport = viewportEl();
          const frame = (latestArgs.frame ?? null) as FrameResult | null;
          if (!viewport || !frame) {
            return {
              frame: null,
              viewportWidth: 0,
              viewportHeight: 0,
              viewportX: 0,
              viewportY: 0,
              mask: latestArgs.mask as Uint8Array,
              labels: [...latestArgs.labels],
              activeLabelId: latestArgs.activeLabelId,
              tool: latestArgs.tool,
              brushSize: latestArgs.brushSize,
              disabled: latestArgs.disabled,
              onMaskCommit: (mask) => emitEvent?.(CanvasMountEvent.MaskCommitted({ mask })),
              onSmartSegmentClick: (click) =>
                emitEvent?.(CanvasMountEvent.SmartSegmentClicked(click)),
              onSmartEraseClick: (click) => emitEvent?.(CanvasMountEvent.SmartEraseClicked(click)),
              onStateChange: scheduleRender,
            };
          }
          const bounds = viewport.getBoundingClientRect();
          const rect = drawRectFor(bounds.width, bounds.height, frame);
          return {
            frame,
            viewportWidth: rect.width,
            viewportHeight: rect.height,
            viewportX: bounds.left + rect.x,
            viewportY: bounds.top + rect.y,
            mask: latestArgs.mask as Uint8Array,
            labels: [...latestArgs.labels],
            activeLabelId: latestArgs.activeLabelId,
            tool: latestArgs.tool,
            brushSize: latestArgs.brushSize,
            disabled: latestArgs.disabled,
            onMaskCommit: (mask) => emitEvent?.(CanvasMountEvent.MaskCommitted({ mask })),
            onSmartSegmentClick: (click) =>
              emitEvent?.(CanvasMountEvent.SmartSegmentClicked(click)),
            onSmartEraseClick: (click) => emitEvent?.(CanvasMountEvent.SmartEraseClicked(click)),
            onStateChange: scheduleRender,
          };
        });

        const releasePointerIfCaptured = (pointerId: number) => {
          if (
            typeof canvas.hasPointerCapture === "function" &&
            canvas.hasPointerCapture(pointerId)
          ) {
            canvas.releasePointerCapture(pointerId);
          }
        };

        const cancelActiveStroke = () => {
          if (activePointerId === null) return;
          const pointerId = activePointerId;
          activePointerId = null;
          handlers.handlePointerCancel({
            pointerId,
            pointerType: "mouse",
            button: 0,
            clientX: 0,
            clientY: 0,
            preventDefault: () => {},
            capturePointer: () => {},
            releasePointer: () => releasePointerIfCaptured(pointerId),
          });
        };

        const renderNow = () => {
          renderRaf = null;
          const viewport = viewportEl();
          if (!viewport) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          const width = viewport.clientWidth;
          const height = viewport.clientHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.fillStyle = resolvedCanvasBackground(viewport);
          ctx.fillRect(0, 0, width, height);

          if (latestFrame) {
            const rect = drawRectFor(width, height, latestFrame.frame);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(latestFrame.prepared, rect.x, rect.y, rect.width, rect.height);
            const maskCanvas = getMaskCanvas(
              latestFrame.frame.width,
              latestFrame.frame.height,
              latestArgs.labels,
              latestArgs.mask as Uint8Array,
            );
            ctx.globalAlpha = clamp(latestArgs.overlayOpacity, 0, 1);
            ctx.drawImage(maskCanvas, rect.x, rect.y, rect.width, rect.height);
            ctx.globalAlpha = 1;

            const points = handlers.lassoPoints();
            if (points.length > 1) {
              ctx.strokeStyle = handlers.eraseMode()
                ? "rgba(248,113,113,0.95)"
                : "rgba(250,204,21,0.95)";
              ctx.lineWidth = handlers.brushMode() ? latestArgs.brushSize * 2 * rect.scale : 2;
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

            const prompts = latestArgs.smartSegmentPrompts;
            if (prompts.length > 0) {
              const promptAlpha = isSmartAnnotationTool(latestArgs.tool) ? 1 : 0.65;
              for (const prompt of prompts) {
                const centerX = rect.x + prompt.x * rect.scale;
                const centerY = rect.y + prompt.y * rect.scale;
                const radius = smartSegmentPromptRadius(
                  latestFrame.frame.width,
                  latestFrame.frame.height,
                  rect.scale,
                );
                ctx.beginPath();
                ctx.globalAlpha = promptAlpha;
                ctx.fillStyle =
                  prompt.label === 1 ? "rgba(34,197,94,0.95)" : "rgba(248,113,113,0.95)";
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

        function scheduleRender() {
          if (renderRaf !== null) return;
          renderRaf = window.requestAnimationFrame(renderNow);
        }

        const fractionalFramePointFromEvent = (event: {
          clientX: number;
          clientY: number;
        }): FramePoint | null => {
          const viewport = viewportEl();
          if (!viewport || !latestFrame) return null;
          const bounds = viewport.getBoundingClientRect();
          const rect = drawRectFor(bounds.width, bounds.height, latestFrame.frame);
          const x = event.clientX - bounds.left;
          const y = event.clientY - bounds.top;
          if (x < rect.x || y < rect.y || x > rect.x + rect.width || y > rect.y + rect.height) {
            return null;
          }
          return {
            x: clamp((x - rect.x) / rect.scale, 0, latestFrame.frame.width),
            y: clamp((y - rect.y) / rect.scale, 0, latestFrame.frame.height),
          };
        };

        const zoomAtFramePoint = (factor: number, point: FramePoint) => {
          const viewport = viewportEl();
          if (!viewport || !latestFrame) return;
          frameView.zoomAtFramePoint(
            factor,
            point,
            viewport.clientWidth,
            viewport.clientHeight,
            latestFrame.frame,
          );
        };

        const syncFrame = (nextFrame: FrameResult | null) => {
          const prevFrame = latestFrame?.frame ?? null;
          if (prevFrame === nextFrame) return;
          cancelActiveStroke();
          frameView.syncFrame(nextFrame);
          if (nextFrame) {
            latestFrame = {
              frame: nextFrame,
              prepared: prepareFrameCanvas(nextFrame),
            };
          } else {
            latestFrame = null;
          }
        };

        const applyArgs = (next: typeof initialArgs) => {
          latestArgs = next;
          syncFrame((next.frame ?? null) as FrameResult | null);
          if (next.disabled) {
            cancelActiveStroke();
          }
          scheduleRender();
        };

        const toPointerEvent = (event: PointerEvent) => ({
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          button: event.button,
          clientX: event.clientX,
          clientY: event.clientY,
          preventDefault: () => event.preventDefault(),
          capturePointer: () => {
            if (typeof canvas.setPointerCapture === "function") {
              canvas.setPointerCapture(event.pointerId);
            }
          },
          releasePointer: () => releasePointerIfCaptured(event.pointerId),
        });

        const eventsStream = Stream.callback<CanvasMountEventType>((queue) => {
          emitEvent = (event) => {
            Queue.offerUnsafe(queue, event);
          };

          const unsubscribeView = frameView.subscribe((view) => {
            const viewport = viewportEl();
            if (viewport) {
              viewport.dataset.frameViewZoom = String(view.zoom);
            }
            emitEvent?.(CanvasMountEvent.ZoomChanged({ zoom: view.zoom }));
            scheduleRender();
          });

          syncFrame((initialArgs.frame ?? null) as FrameResult | null);

          const resize = () => {
            const viewport = viewportEl();
            if (!viewport) return;
            if (resizeRaf !== null) {
              window.cancelAnimationFrame(resizeRaf);
            }
            resizeRaf = window.requestAnimationFrame(() => {
              resizeRaf = null;
              const nextDpr = window.devicePixelRatio || 1;
              const width = Math.max(1, Math.floor(viewport.clientWidth * nextDpr));
              const height = Math.max(1, Math.floor(viewport.clientHeight * nextDpr));
              dpr = nextDpr;
              if (canvas.width !== width) canvas.width = width;
              if (canvas.height !== height) canvas.height = height;
              const cssWidth = `${viewport.clientWidth}px`;
              const cssHeight = `${viewport.clientHeight}px`;
              if (canvas.style.width !== cssWidth) canvas.style.width = cssWidth;
              if (canvas.style.height !== cssHeight) canvas.style.height = cssHeight;
              scheduleRender();
            });
          };

          const viewport = viewportEl();
          const resizeObserver =
            typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => resize()) : null;
          if (viewport && resizeObserver) {
            resizeObserver.observe(viewport);
          }
          resize();

          const themeObserver =
            typeof MutationObserver !== "undefined"
              ? new MutationObserver(() => {
                  if (themeRaf !== null) return;
                  themeRaf = window.requestAnimationFrame(() => {
                    themeRaf = null;
                    scheduleRender();
                  });
                })
              : null;
          if (themeObserver && typeof document !== "undefined") {
            themeObserver.observe(document.documentElement, {
              attributes: true,
              attributeFilter: ["class", "style"],
            });
          }

          const onPointerDown = (event: PointerEvent) => {
            if (!latestFrame) return;
            if (isMagnifierAnnotationTool(latestArgs.tool)) {
              const point = fractionalFramePointFromEvent(event);
              if (!point) return;
              if (event.button !== 0 && event.button !== 2) return;
              event.preventDefault();
              zoomAtFramePoint(event.altKey || event.button === 2 ? 0.5 : 2, point);
              return;
            }
            if (latestArgs.disabled || event.pointerType !== "mouse") return;
            const started = handlers.handlePointerDown(toPointerEvent(event));
            if (started && handlers.drawing()) {
              activePointerId = event.pointerId;
            }
          };

          const onPointerMove = (event: PointerEvent) => {
            handlers.handlePointerMove(toPointerEvent(event));
          };

          const onPointerFinish = (event: PointerEvent) => {
            if (activePointerId === event.pointerId) {
              activePointerId = null;
            }
            handlers.handlePointerEnd(toPointerEvent(event));
          };

          const onContextMenu = (event: MouseEvent) => {
            event.preventDefault();
          };

          const onWheel = (event: WheelEvent) => {
            if (!isMagnifierAnnotationTool(latestArgs.tool)) return;
            const point = fractionalFramePointFromEvent(event);
            const currentViewport = viewportEl();
            if (!point || !currentViewport) return;
            event.preventDefault();
            zoomAtFramePoint(
              frameViewWheelFactor(event.deltaY, event.deltaMode, currentViewport.clientHeight),
              point,
            );
          };

          const onKeyDown = (event: KeyboardEvent) => {
            if (!isMagnifierAnnotationTool(latestArgs.tool)) return;
            if (
              event.metaKey ||
              event.ctrlKey ||
              event.altKey ||
              (event.target instanceof HTMLElement &&
                Boolean(event.target.closest("input, textarea, select, [contenteditable='true']")))
            ) {
              return;
            }
            const currentViewport = viewportEl();
            if (!currentViewport || !latestFrame) return;
            if (event.key === "0") {
              event.preventDefault();
              frameView.reset(latestFrame.frame);
            } else if (event.key === "+" || event.key === "=") {
              event.preventDefault();
              frameView.zoomAtCenter(
                2,
                currentViewport.clientWidth,
                currentViewport.clientHeight,
                latestFrame.frame,
              );
            } else if (event.key === "-" || event.key === "_") {
              event.preventDefault();
              frameView.zoomAtCenter(
                0.5,
                currentViewport.clientWidth,
                currentViewport.clientHeight,
                latestFrame.frame,
              );
            }
          };

          canvas.addEventListener("pointerdown", onPointerDown);
          canvas.addEventListener("pointermove", onPointerMove);
          canvas.addEventListener("pointerup", onPointerFinish);
          canvas.addEventListener("pointercancel", onPointerFinish);
          canvas.addEventListener("lostpointercapture", onPointerFinish);
          canvas.addEventListener("contextmenu", onContextMenu);
          canvas.addEventListener("wheel", onWheel, { passive: false });
          window.addEventListener("keydown", onKeyDown);

          scheduleRender();

          return Effect.addFinalizer(() =>
            Effect.sync(() => {
              emitEvent = null;
              cancelActiveStroke();
              unsubscribeView();
              canvas.removeEventListener("pointerdown", onPointerDown);
              canvas.removeEventListener("pointermove", onPointerMove);
              canvas.removeEventListener("pointerup", onPointerFinish);
              canvas.removeEventListener("pointercancel", onPointerFinish);
              canvas.removeEventListener("lostpointercapture", onPointerFinish);
              canvas.removeEventListener("contextmenu", onContextMenu);
              canvas.removeEventListener("wheel", onWheel);
              window.removeEventListener("keydown", onKeyDown);
              if (resizeRaf !== null) {
                window.cancelAnimationFrame(resizeRaf);
                resizeRaf = null;
              }
              if (renderRaf !== null) {
                window.cancelAnimationFrame(renderRaf);
                renderRaf = null;
              }
              if (themeRaf !== null) {
                window.cancelAnimationFrame(themeRaf);
                themeRaf = null;
              }
              resizeObserver?.disconnect();
              themeObserver?.disconnect();
            }),
          );
        });

        const changesStream = changes.pipe(
          Stream.tap((next) => Effect.sync(() => applyArgs(next))),
          Stream.drain,
        );

        return Stream.merge(eventsStream, changesStream);
      }),
    ),
);

const AnnotationCanvasMessage = UiSchema.TaggedEnum({
  ZoomChanged: { zoom: Schema.Number },
  MaskCommitted: { mask: Schema.Any },
  SmartSegmentClicked: { x: Schema.Number, y: Schema.Number, negative: Schema.Boolean },
  SmartEraseClicked: { x: Schema.Number, y: Schema.Number },
});

export const AnnotationCanvasEvents = UiSchema.TaggedEnum({
  MaskCommitted: { mask: Schema.Any },
  SmartSegmentClicked: { x: Schema.Number, y: Schema.Number, negative: Schema.Boolean },
  SmartEraseClicked: { x: Schema.Number, y: Schema.Number },
});

const AnnotationCanvasComponent = Html.component({
  name: "LiscaAnnotationCanvas",
  props: Schema.Struct({
    frame: Schema.NullOr(Schema.Any),
    labels: Schema.Array(AnnotationLabelSchema),
    mask: Schema.Any,
    activeLabelId: Schema.NullOr(Schema.String),
    tool: AnnotationToolSchema,
    brushSize: Schema.Number,
    overlayOpacity: Schema.Number,
    messages: Schema.optional(Schema.Array(CanvasStatusMessageSchema)),
    toasts: Schema.optional(Schema.Array(CanvasStatusMessageSchema)),
    disabled: Schema.Boolean,
    class: Schema.optional(Schema.String),
    emptyText: Schema.optional(Schema.String),
    smartSegmentPrompts: Schema.Array(SmartSegmentPromptSchema),
  }),
  model: Schema.Struct({
    zoom: Schema.Number,
  }),
  message: AnnotationCanvasMessage,
  events: AnnotationCanvasEvents,
}).make({
  init: () => ({ zoom: 1 }),
  update: {
    ZoomChanged: ($, { zoom }) => $.evolve({ zoom }),
    MaskCommitted: ($, { mask }) => $.emit(AnnotationCanvasEvents.MaskCommitted({ mask })),
    SmartSegmentClicked: ($, click) =>
      $.emit(
        AnnotationCanvasEvents.SmartSegmentClicked({
          x: click.x,
          y: click.y,
          negative: click.negative,
        }),
      ),
    SmartEraseClicked: ($, click) =>
      $.emit(AnnotationCanvasEvents.SmartEraseClicked({ x: click.x, y: click.y })),
  },
  view: (h, model) => {
    const { props } = h;
    const cursor = !props.frame
      ? "default"
      : isMagnifierAnnotationTool(props.tool)
        ? "zoom-in"
        : props.disabled
          ? "default"
          : "crosshair";

    return h.div
      .attr("data-frame-view-zoom", String(model.zoom))
      .class(cn("relative h-full min-h-0 w-full overflow-hidden bg-paper", props.class))
      .children(
        !props.frame && props.emptyText
          ? h.div
              .class("flex h-full items-center justify-center text-muted-foreground text-sm")
              .children(props.emptyText)
          : undefined,
        h.canvas
          .class("block touch-none")
          .style({ cursor })
          .onMount(
            AttachAnnotationCanvas({
              frame: props.frame,
              labels: props.labels,
              mask: props.mask,
              activeLabelId: props.activeLabelId,
              tool: props.tool,
              brushSize: props.brushSize,
              overlayOpacity: props.overlayOpacity,
              disabled: props.disabled,
              smartSegmentPrompts: props.smartSegmentPrompts,
            }).pipe(
              Mount.map((event) => {
                switch (event._tag) {
                  case "ZoomChanged":
                    return AnnotationCanvasMessage.ZoomChanged({ zoom: event.zoom });
                  case "MaskCommitted":
                    return AnnotationCanvasMessage.MaskCommitted({ mask: event.mask });
                  case "SmartSegmentClicked":
                    return AnnotationCanvasMessage.SmartSegmentClicked({
                      x: event.x,
                      y: event.y,
                      negative: event.negative,
                    });
                  case "SmartEraseClicked":
                    return AnnotationCanvasMessage.SmartEraseClicked({
                      x: event.x,
                      y: event.y,
                    });
                }
              }),
            ),
          ),
        CanvasStatusMessageStack(h, {
          messages: props.messages?.map((m) =>
            m.tone !== undefined ? { text: m.text, tone: m.tone } : { text: m.text },
          ),
        }),
        CanvasToastStack(h, {
          messages: props.toasts?.map((m) =>
            m.tone !== undefined ? { text: m.text, tone: m.tone } : { text: m.text },
          ),
        }),
      );
  },
});

export type AnnotationCanvasOptions<M> = {
  readonly key?: string | undefined;
  readonly frame: FrameResult | null;
  readonly labels: readonly AnnotationLabel[];
  readonly mask: Uint8Array;
  readonly activeLabelId: string | null;
  readonly tool: AnnotationTool;
  readonly brushSize: number;
  readonly overlayOpacity: number;
  readonly messages?: readonly CanvasStatusMessage[] | undefined;
  readonly toasts?: readonly CanvasStatusMessage[] | undefined;
  readonly disabled?: boolean | undefined;
  readonly class?: string | undefined;
  readonly emptyText?: string | undefined;
  readonly smartSegmentPrompts?: readonly SmartSegmentPrompt[] | undefined;
  readonly onMaskCommit: (mask: Uint8Array) => M;
  readonly onSmartSegmentClick?:
    | ((click: { readonly x: number; readonly y: number; readonly negative: boolean }) => M)
    | undefined;
  readonly onSmartEraseClick?:
    | ((click: { readonly x: number; readonly y: number }) => M)
    | undefined;
};

export type AnnotationCanvasProps<M = never> = AnnotationCanvasOptions<M>;

export function AnnotationCanvas<M>(h: Html.H<M>, options: AnnotationCanvasOptions<M>) {
  return AnnotationCanvasComponent(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      frame: options.frame,
      labels: options.labels,
      mask: options.mask,
      activeLabelId: options.activeLabelId,
      tool: options.tool,
      brushSize: options.brushSize,
      overlayOpacity: options.overlayOpacity,
      ...(options.messages !== undefined ? { messages: options.messages } : {}),
      ...(options.toasts !== undefined ? { toasts: options.toasts } : {}),
      disabled: options.disabled ?? false,
      ...(options.class !== undefined ? { class: options.class } : {}),
      ...(options.emptyText !== undefined ? { emptyText: options.emptyText } : {}),
      smartSegmentPrompts: options.smartSegmentPrompts ?? [],
    },
    onEmit: {
      MaskCommitted: ({ mask }) => options.onMaskCommit(mask as Uint8Array),
      SmartSegmentClicked: (click) => options.onSmartSegmentClick?.(click),
      SmartEraseClicked: (click) => options.onSmartEraseClick?.(click),
    },
  });
}

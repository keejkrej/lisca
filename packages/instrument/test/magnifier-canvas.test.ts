import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { AlignGridState } from "@lisca/contracts";
import { ShellThemeProvider } from "@lisca/ui/shell";
import { Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { AlignCanvas } from "../src/align/align-canvas";
import { AnnotationCanvas } from "../src/annotate/annotation-canvas";
import { cleanupMounted, flushMicrotasks, mountTest } from "./render-helper";

const frame = {
  width: 100,
  height: 100,
  pixels: new Uint8Array(10_000),
};

const canvasContext = {
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  clip: vi.fn(),
  drawImage: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  putImageData: vi.fn(),
  rect: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  scale: vi.fn(),
  stroke: vi.fn(),
  strokeRect: vi.fn(),
};

function magnifierPointerDown(
  target: Element,
  options: { altKey?: boolean; button?: number; clientX?: number; clientY?: number } = {},
) {
  const event = new MouseEvent("pointerdown", {
    ...(options.altKey !== undefined ? { altKey: options.altKey } : {}),
    bubbles: true,
    button: options.button ?? 0,
    buttons: 1,
    clientX: options.clientX ?? 50,
    clientY: options.clientY ?? 50,
  });
  Object.defineProperty(event, "pointerId", { value: 1 });
  Object.defineProperty(event, "pointerType", { value: "mouse" });
  target.dispatchEvent(event);
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    bottom: 100,
    height: 100,
    left: 0,
    right: 100,
    top: 0,
    width: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    canvasContext as unknown as CanvasRenderingContext2D,
  );
  vi.stubGlobal(
    "ImageData",
    class ImageData {
      constructor(
        public data: Uint8ClampedArray,
        public width: number,
        public height: number,
      ) {}
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserver {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
});

afterEach(async () => {
  await cleanupMounted();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Magnifier canvas integration", () => {
  it("zooms Align view without falling through to edit/grid callbacks", async () => {
    const onVirtualPointerDown = vi.fn();
    const grid: AlignGridState = {
      enabled: false,
      shape: "rect",
      tx: 0,
      ty: 0,
      rotation: 0,
      spacingA: 20,
      spacingB: 20,
      patternWidth: 16,
      patternHeight: 16,
      opacity: 0.35,
    };

    const AlignHost = Html.component({
      name: "MagnifierAlignHost",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        ShellThemeProvider(h, {
          props: { storageKey: "magnifier-align-test" },
          view: () =>
            AlignCanvas(h, {
              frame,
              grid,
              toolMode: "magnifier",
              onVirtualPointerDown,
            }),
        }),
    });

    const result = await mountTest(AlignHost, {});
    await flushMicrotasks();

    const viewport = result.container.querySelector<HTMLElement>("[data-frame-view-zoom]")!;
    const eventTarget = viewport.querySelector("canvas")!.parentElement!;

    magnifierPointerDown(eventTarget);

    expect(viewport.dataset.frameViewZoom).toBe("2");
    expect(onVirtualPointerDown).not.toHaveBeenCalled();
    expect(grid.enabled).toBe(false);

    magnifierPointerDown(eventTarget, { altKey: true });
    expect(viewport.dataset.frameViewZoom).toBe("1");

    magnifierPointerDown(eventTarget);
    magnifierPointerDown(eventTarget, { button: 2 });
    expect(viewport.dataset.frameViewZoom).toBe("1");

    magnifierPointerDown(eventTarget);
    eventTarget.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        clientX: 50,
        clientY: 50,
        deltaY: -120,
      }),
    );
    expect(Number(viewport.dataset.frameViewZoom)).toBeGreaterThan(2);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "0", bubbles: true }));
    expect(viewport.dataset.frameViewZoom).toBe("1");
  });

  it("zooms Annotation view even when editing is disabled and never commits", async () => {
    const onMaskCommit = vi.fn();
    const onSmartSegmentClick = vi.fn();
    const onSmartEraseClick = vi.fn();

    const Msg = UiSchema.TaggedEnum({
      MaskCommit: {},
      SmartSegment: {},
      SmartErase: {},
    });

    const AnnotationHost = Html.component({
      name: "MagnifierAnnotationHost",
      model: Schema.Struct({}),
      message: Msg,
    }).make({
      init: () => ({}),
      update: {
        MaskCommit: ($) => {
          onMaskCommit();
          return $.model;
        },
        SmartSegment: ($) => {
          onSmartSegmentClick();
          return $.model;
        },
        SmartErase: ($) => {
          onSmartEraseClick();
          return $.model;
        },
      },
      view: (h) =>
        ShellThemeProvider(h, {
          props: { storageKey: "magnifier-annotation-test" },
          view: () =>
            AnnotationCanvas(h, {
              activeLabelId: null,
              brushSize: 4,
              disabled: true,
              frame,
              labels: [],
              mask: new Uint8Array(10_000),
              overlayOpacity: 0.35,
              tool: "magnifier",
              onMaskCommit: () => Msg.MaskCommit(),
              onSmartEraseClick: () => Msg.SmartErase(),
              onSmartSegmentClick: () => Msg.SmartSegment(),
            }),
        }),
    });

    const result = await mountTest(AnnotationHost, {});
    await flushMicrotasks();

    const viewport = result.container.querySelector<HTMLElement>("[data-frame-view-zoom]")!;
    const canvas = viewport.querySelector("canvas")!;

    magnifierPointerDown(canvas, { clientX: 50.25, clientY: 49.75 });
    await flushMicrotasks();

    expect(viewport.dataset.frameViewZoom).toBe("2");
    expect(onMaskCommit).not.toHaveBeenCalled();
    expect(onSmartSegmentClick).not.toHaveBeenCalled();
    expect(onSmartEraseClick).not.toHaveBeenCalled();
  });
});

import type { AlignGridState } from "@lisca/contracts";
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AlignCanvas } from "../src/features/align/align-canvas";
import { AnnotationCanvas } from "../src/features/annotate/annotation-canvas";
import { ShellThemeProvider } from "../src/shell/theme/shell-theme";

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
    altKey: options.altKey,
    bubbles: true,
    button: options.button ?? 0,
    buttons: 1,
    clientX: options.clientX ?? 50,
    clientY: options.clientY ?? 50,
  });
  Object.defineProperty(event, "pointerId", { value: 1 });
  Object.defineProperty(event, "pointerType", { value: "mouse" });
  fireEvent(target, event);
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Magnifier canvas integration", () => {
  it("zooms Align view without falling through to edit/grid callbacks", () => {
    const onVirtualPointerDown = vi.fn();
    const grid: AlignGridState = {
      enabled: false,
      shape: "rect",
      tx: 0,
      ty: 0,
      rotation: 0,
      spacingA: 20,
      spacingB: 20,
      cellWidth: 16,
      cellHeight: 16,
      opacity: 0.35,
    };
    const result = render(() => (
      <ShellThemeProvider storageKey="magnifier-align-test">
        <AlignCanvas
          frame={frame}
          grid={grid}
          toolMode="magnifier"
          onVirtualPointerDown={onVirtualPointerDown}
        />
      </ShellThemeProvider>
    ));
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
    fireEvent(
      eventTarget,
      new WheelEvent("wheel", {
        bubbles: true,
        clientX: 50,
        clientY: 50,
        deltaY: -120,
      }),
    );
    expect(Number(viewport.dataset.frameViewZoom)).toBeGreaterThan(2);

    fireEvent.keyDown(window, { key: "0" });
    expect(viewport.dataset.frameViewZoom).toBe("1");
  });

  it("zooms Annotation view even when editing is disabled and never commits", () => {
    const onMaskCommit = vi.fn();
    const onSmartSegmentClick = vi.fn();
    const onSmartEraseClick = vi.fn();
    const result = render(() => (
      <ShellThemeProvider storageKey="magnifier-annotation-test">
        <AnnotationCanvas
          activeLabelId={null}
          brushSize={4}
          disabled
          frame={frame}
          labels={[]}
          mask={new Uint8Array(10_000)}
          overlayOpacity={0.35}
          tool="magnifier"
          onMaskCommit={onMaskCommit}
          onSmartEraseClick={onSmartEraseClick}
          onSmartSegmentClick={onSmartSegmentClick}
        />
      </ShellThemeProvider>
    ));
    const viewport = result.container.querySelector<HTMLElement>("[data-frame-view-zoom]")!;
    const canvas = viewport.querySelector("canvas")!;

    magnifierPointerDown(canvas, { clientX: 50.25, clientY: 49.75 });

    expect(viewport.dataset.frameViewZoom).toBe("2");
    expect(onMaskCommit).not.toHaveBeenCalled();
    expect(onSmartSegmentClick).not.toHaveBeenCalled();
    expect(onSmartEraseClick).not.toHaveBeenCalled();
  });
});

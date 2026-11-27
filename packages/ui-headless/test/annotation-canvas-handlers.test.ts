import { describe, expect, it, vi } from "vite-plus/test";

import {
  activeLabelValueForId,
  createAnnotationCanvasHandlers,
  framePointFromViewport,
} from "../src/annotation-canvas-handlers";

describe("framePointFromViewport", () => {
  it("maps center of letterboxed viewport to frame center", () => {
    const point = framePointFromViewport(100, 50, 200, 100, 0, 0, 100, 100);
    expect(point).toEqual({ x: 50, y: 50 });
  });

  it("returns null outside drawn frame bounds", () => {
    expect(framePointFromViewport(5, 5, 200, 100, 0, 0, 100, 100)).toBeNull();
  });
});

describe("activeLabelValueForId", () => {
  it("returns 1-based label index", () => {
    expect(
      activeLabelValueForId(
        [
          { id: "a", name: "A", color: "#ff0000" },
          { id: "b", name: "B", color: "#00ff00" },
        ],
        "b",
      ),
    ).toBe(2);
  });

  it("returns 0 when label is missing", () => {
    expect(activeLabelValueForId([], "missing")).toBe(0);
  });
});

describe("createAnnotationCanvasHandlers", () => {
  it("never falls through to mask or smart-segment mutations in magnifier mode", () => {
    const onMaskCommit = vi.fn();
    const onSmartSegmentClick = vi.fn();
    const capturePointer = vi.fn();
    const handlers = createAnnotationCanvasHandlers(() => ({
      frame: { width: 10, height: 10, pixels: new Uint8Array(100) },
      viewportWidth: 100,
      viewportHeight: 100,
      mask: new Uint8Array(100),
      labels: [{ id: "a", name: "A", color: "#ff0000" }],
      activeLabelId: "a",
      tool: "magnifier",
      brushSize: 2,
      onMaskCommit,
      onSmartSegmentClick,
    }));

    expect(handlers.cursor()).toBe("zoom-in");
    expect(handlers.activeLabelValue()).toBe(1);

    const handled = handlers.handlePointerDown({
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientX: 50,
      clientY: 50,
      preventDefault: vi.fn(),
      capturePointer,
      releasePointer: vi.fn(),
    });

    expect(handled).toBe(false);
    expect(capturePointer).not.toHaveBeenCalled();
    expect(onMaskCommit).not.toHaveBeenCalled();
    expect(onSmartSegmentClick).not.toHaveBeenCalled();
  });

  it("tracks brush stroke state, notifies onStateChange, and commits mask on end", () => {
    const onMaskCommit = vi.fn();
    const onStateChange = vi.fn();
    const handlers = createAnnotationCanvasHandlers(() => ({
      frame: { width: 10, height: 10, pixels: new Uint8Array(100) },
      viewportWidth: 100,
      viewportHeight: 100,
      mask: new Uint8Array(100),
      labels: [{ id: "a", name: "A", color: "#ff0000" }],
      activeLabelId: "a",
      tool: "brush",
      brushSize: 2,
      onMaskCommit,
      onStateChange,
    }));

    expect(handlers.brushMode()).toBe(true);
    expect(handlers.eraseMode()).toBe(false);
    expect(handlers.smartToolMode()).toBe(false);
    expect(handlers.smartEraseMode()).toBe(false);
    expect(handlers.cursor()).toBe("crosshair");

    const basePointer = {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      preventDefault: vi.fn(),
      capturePointer: vi.fn(),
      releasePointer: vi.fn(),
    };

    expect(handlers.handlePointerDown({ ...basePointer, clientX: 20, clientY: 20 })).toBe(true);
    expect(handlers.drawing()).toBe(true);
    expect(handlers.lassoPoints()).toEqual([{ x: 2, y: 2 }]);
    expect(onStateChange).toHaveBeenCalledTimes(1);

    expect(handlers.handlePointerMove({ ...basePointer, clientX: 60, clientY: 60 })).toBe(true);
    expect(handlers.lassoPoints()).toEqual([
      { x: 2, y: 2 },
      { x: 6, y: 6 },
    ]);
    expect(onStateChange).toHaveBeenCalledTimes(2);

    expect(handlers.handlePointerEnd({ ...basePointer, clientX: 60, clientY: 60 })).toBe(true);
    expect(handlers.drawing()).toBe(false);
    expect(handlers.lassoPoints()).toEqual([]);
    expect(onStateChange).toHaveBeenCalledTimes(3);
    expect(onMaskCommit).toHaveBeenCalledOnce();
  });
});

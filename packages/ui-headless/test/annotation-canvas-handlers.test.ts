import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";

import {
  activeLabelValueForId,
  framePointFromViewport,
  useAnnotationCanvasHandlers,
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

describe("magnifier annotation guard", () => {
  it("never falls through to mask or smart-segment mutations", () => {
    const onMaskCommit = vi.fn();
    const onSmartSegmentClick = vi.fn();
    const capturePointer = vi.fn();
    let handlers!: ReturnType<typeof useAnnotationCanvasHandlers>;
    render(() => {
      handlers = useAnnotationCanvasHandlers(() => ({
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
      return null;
    });

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
});

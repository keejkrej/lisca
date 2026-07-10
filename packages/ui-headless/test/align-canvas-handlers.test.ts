import { createDefaultAlignGrid } from "@lisca/utils";
import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";

import { cursorForAlignTool, useAlignCanvasGridHandlers } from "../src/align-canvas-handlers";

describe("cursorForAlignTool", () => {
  it("returns default when grid is disabled", () => {
    expect(cursorForAlignTool("pan", false, false)).toBe("default");
  });

  it("returns grabbing while dragging", () => {
    expect(cursorForAlignTool("pan", true, true)).toBe("grabbing");
  });

  it("maps tool modes", () => {
    expect(cursorForAlignTool("pan", true, false)).toBe("grab");
    expect(cursorForAlignTool("rotate", true, false)).toBe("crosshair");
    expect(cursorForAlignTool("zoom-spacing", true, false)).toBe("zoom-in");
  });
});

describe("useAlignCanvasGridHandlers", () => {
  it("updates preview in a ref during drag and commits on release", () => {
    const setGrid = vi.fn();
    const onPreviewGridChange = vi.fn();
    const grid = { ...createDefaultAlignGrid(), enabled: true, tx: 0, ty: 0 };
    const viewport = {
      displayWidth: 400,
      displayHeight: 400,
      modelWidth: 200,
      modelHeight: 200,
    };
    const pointer = {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      buttons: 1,
      clientX: 100,
      clientY: 100,
      framePoint: { x: 50, y: 50 },
      viewport,
      preventDefault: vi.fn(),
      capturePointer: vi.fn(),
      releasePointer: vi.fn(),
    };

    let handlers!: ReturnType<typeof useAlignCanvasGridHandlers>;
    render(() => {
      handlers = useAlignCanvasGridHandlers(() => ({
        grid,
        setGrid,
        toolMode: "pan",
        onPreviewGridChange,
      }));
      return null;
    });

    handlers.handlePointerDown(pointer);
    expect(handlers.dragging()).toBe(true);
    expect(handlers.previewGridRef.current).toBeNull();

    handlers.handlePointerMove({
      ...pointer,
      clientX: 140,
      clientY: 120,
    });
    const previewTx = handlers.previewGridRef.current?.tx;
    expect(previewTx).toBeGreaterThan(0);
    expect(setGrid).not.toHaveBeenCalled();
    expect(onPreviewGridChange).toHaveBeenCalled();

    handlers.handlePointerEnd(pointer);
    expect(handlers.dragging()).toBe(false);
    expect(setGrid).toHaveBeenCalledWith(expect.objectContaining({ tx: previewTx }));
    expect(handlers.previewGridRef.current).toBeNull();
  });
});
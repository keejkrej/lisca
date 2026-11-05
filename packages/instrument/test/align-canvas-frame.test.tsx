import { cleanup, render } from "@solidjs/testing-library";
import { createDefaultAlignGrid, type FrameResult } from "@lisca/utils";
import { ShellThemeProvider } from "@lisca/ui/shell";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { AlignCanvas } from "../src/align/align-canvas";

function frame(value: number): FrameResult {
  return {
    width: 1,
    height: 1,
    pixels: new Uint8Array([value]),
    appliedContrast: { min: 0, max: 255 },
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AlignCanvas frame rendering", () => {
  it("prepares a new bitmap when only the frame pixels change", () => {
    const putImageData = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => ({ putImageData }) as unknown as CanvasRenderingContext2D,
    );
    vi.stubGlobal(
      "ImageData",
      class {
        constructor(
          readonly data: Uint8ClampedArray,
          readonly width: number,
          readonly height: number,
        ) {}
      },
    );
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const [currentFrame, setCurrentFrame] = createSignal(frame(10));

    render(() => (
      <ShellThemeProvider storageKey="align-canvas-frame-test">
        <AlignCanvas frame={currentFrame()} grid={createDefaultAlignGrid()} />
      </ShellThemeProvider>
    ));
    expect(putImageData).toHaveBeenCalledTimes(1);
    expect(putImageData.mock.calls[0]?.[0].data[0]).toBe(10);

    setCurrentFrame(frame(200));

    expect(putImageData).toHaveBeenCalledTimes(2);
    expect(putImageData.mock.calls[1]?.[0].data[0]).toBe(200);
  });
});

import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { ShellThemeProvider } from "@lisca/ui/shell";
import { createDefaultAlignGrid, type FrameResult } from "@lisca/utils";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { AlignCanvas } from "../src/align/align-canvas";
import { cleanupMounted, flushMicrotasks, mountTest } from "./render-helper";

function frame(value: number): FrameResult {
  return {
    width: 1,
    height: 1,
    pixels: new Uint8Array([value]),
    appliedContrast: { min: 0, max: 255 },
  };
}

afterEach(async () => {
  await cleanupMounted();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AlignCanvas frame rendering", () => {
  it("prepares a new bitmap when only the frame pixels change", async () => {
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

    const grid = createDefaultAlignGrid();
    const firstFrame = frame(10);
    const secondFrame = frame(200);
    const Msg = UiSchema.TaggedEnum({
      SetFrameIndex: { index: Schema.Number },
    });

    const Host = Html.component({
      name: "AlignCanvasFrameTestHost",
      model: Schema.Struct({ frameIndex: Schema.Number }),
      message: Msg,
    }).make({
      init: () => ({ frameIndex: 0 }),
      update: {
        SetFrameIndex: ($, { index }) => $.evolve({ frameIndex: index }),
      },
      view: (h, model) =>
        ShellThemeProvider(h, {
          props: { storageKey: "align-canvas-frame-test" },
          view: () =>
            AlignCanvas(h, {
              frame: model.frameIndex === 0 ? firstFrame : secondFrame,
              grid,
            }),
        }),
    });

    const mounted = await mountTest(Host, {});
    await flushMicrotasks();

    expect(putImageData).toHaveBeenCalledTimes(1);
    expect(putImageData.mock.calls[0]?.[0].data[0]).toBe(10);

    mounted.root.send(Msg.SetFrameIndex({ index: 1 }));
    await flushMicrotasks();

    expect(putImageData).toHaveBeenCalledTimes(2);
    expect(putImageData.mock.calls[1]?.[0].data[0]).toBe(200);
  });
});

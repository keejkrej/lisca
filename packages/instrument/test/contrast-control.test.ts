import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { ContrastWindow } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { ContrastControl } from "../src/contrast/contrast-control";
import { cleanupMounted, clickElement, flushMicrotasks, mountTest } from "./render-helper";

afterEach(cleanupMounted);

const frame: FrameResult = {
  width: 1,
  height: 1,
  pixels: new Uint8Array([0]),
  contrastDomain: { min: 0, max: 255 },
  suggestedContrast: { min: 10, max: 200 },
  appliedContrast: { min: 0, max: 255 },
};

describe("ContrastControl", () => {
  it("says contrast is display-only", async () => {
    const Msg = UiSchema.TaggedEnum({
      Contrast: { contrast: Schema.Any },
    });

    const Host = Html.component({
      name: "ContrastDisplayOnlyHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Msg,
    }).make({
      init: () => ({}),
      update: {
        Contrast: ($) => $.model,
      },
      view: (h) =>
        ContrastControl(h, {
          contrast: null,
          frame,
          onContrastChange: (contrast) => Msg.Contrast({ contrast }),
        }),
    });

    const { container } = await mountTest(Host, {});
    expect(container.textContent).toContain(
      "Display only. Analysis uses the original intensities.",
    );
  });

  it("locks when Min, Max, or Auto is committed", async () => {
    const onContrastChange = vi.fn();
    const onContrastLockedChange = vi.fn();

    const Msg = UiSchema.TaggedEnum({
      Contrast: { contrast: Schema.Any, lock: Schema.Boolean },
      Lock: { locked: Schema.Boolean },
    });

    const Host = Html.component({
      name: "ContrastLockHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Msg,
    }).make({
      init: () => ({}),
      update: {
        Contrast: ($, { contrast, lock }) => {
          if (lock) onContrastLockedChange(true);
          onContrastChange(contrast as ContrastWindow | null);
          return $.model;
        },
        Lock: ($, { locked }) => {
          onContrastLockedChange(locked);
          return $.model;
        },
      },
      view: (h) =>
        ContrastControl(h, {
          contrast: null,
          contrastLocked: false,
          frame,
          onContrastChange: (contrast, meta) =>
            Msg.Contrast({ contrast, lock: Boolean(meta?.lock) }),
          onContrastLockedChange: (locked) => Msg.Lock({ locked }),
        }),
    });

    const { container } = await mountTest(Host, {});
    const autoButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.trim() === "Auto",
    );
    expect(autoButton).toBeTruthy();

    clickElement(autoButton!);
    await flushMicrotasks();

    expect(onContrastLockedChange).toHaveBeenCalledWith(true);
    expect(onContrastChange).toHaveBeenCalledWith({ min: 10, max: 200 });
  });
});

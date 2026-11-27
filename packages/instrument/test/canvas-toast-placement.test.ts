import { Html } from "@effect/ui/html";
import { StageCanvas } from "@lisca/ui/shell";
import { Schema } from "effect";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { CanvasToastStack } from "../src/canvas/canvas-status";
import { cleanupMounted, mountTest } from "./render-helper";

afterEach(cleanupMounted);

describe("StageCanvas caption status", () => {
  it("sends transient notices to the bottom-left of the window", async () => {
    const Host = Html.component({
      name: "CanvasToastPlacementHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: {},
      view: (h) =>
        StageCanvas(h, {
          notice: CanvasToastStack(h, { messages: [{ text: "Saved Pos67" }] }),
          captionLeft: "Position 90",
          captionRight: "2048 × 2044 px",
          children: h.div.attr("data-testid", "stage-child").children("canvas"),
        }),
    });

    await mountTest(Host, {});

    const toast = document.body.querySelector('[role="status"]') as HTMLElement | null;
    expect(toast).not.toBeNull();
    expect(toast!.textContent).toBe("Saved Pos67");
    expect(toast!.className).toMatch(/rounded-none/);
    const stack = toast!.parentElement!;
    expect(stack.className).toMatch(/\bfixed\b/);
    expect(stack.className).toMatch(/\bbottom-4\b/);
    expect(stack.className).toMatch(/\bleft-4\b/);
    expect(document.body.contains(toast)).toBe(true);

    const stageChild = document.body.querySelector('[data-testid="stage-child"]') as HTMLElement;
    const well = stageChild.parentElement!;
    expect(well.contains(toast)).toBe(false);
    const caption = well.parentElement!.lastElementChild!;
    expect(caption.contains(toast)).toBe(false);
    expect(caption.classList.contains("h-7")).toBe(true);
  });
});

import { cleanup, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { CanvasToastStack } from "../src/canvas/canvas-status";
import { StageCanvas } from "@lisca/ui/shell";

afterEach(cleanup);

describe("StageCanvas caption status", () => {
  it("sends transient notices to the bottom-left of the window", () => {
    render(() => (
      <StageCanvas
        notice={<CanvasToastStack messages={[{ text: "Saved Pos67" }]} />}
        captionLeft="Position 90"
        captionRight="2048 × 2044 px"
      >
        <div data-testid="stage-child">canvas</div>
      </StageCanvas>
    ));
    const toast = screen.getByRole("status");
    expect(toast.textContent).toBe("Saved Pos67");
    expect(toast.className).toMatch(/rounded-none/);
    const stack = toast.parentElement!;
    expect(stack.className).toMatch(/\bfixed\b/);
    expect(stack.className).toMatch(/\bbottom-4\b/);
    expect(stack.className).toMatch(/\bleft-4\b/);
    expect(document.body.contains(toast)).toBe(true);
    const well = screen.getByTestId("stage-child").parentElement!;
    expect(well.contains(toast)).toBe(false);
    const caption = well.parentElement!.lastElementChild!;
    expect(caption.contains(toast)).toBe(false);
    expect(caption.classList.contains("h-7")).toBe(true);
  });
});

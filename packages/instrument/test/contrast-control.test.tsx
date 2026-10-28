import type { FrameResult } from "@lisca/utils";
import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { ContrastControl } from "../src/contrast/contrast-control";

afterEach(cleanup);

const frame: FrameResult = {
  width: 1,
  height: 1,
  pixels: new Uint8Array([0]),
  contrastDomain: { min: 0, max: 255 },
  suggestedContrast: { min: 10, max: 200 },
  appliedContrast: { min: 0, max: 255 },
};

describe("ContrastControl", () => {
  it("says contrast is display-only", () => {
    render(() => (
      <ContrastControl contrast={null} frame={frame} onContrastChange={() => undefined} />
    ));
    expect(screen.getByText("Display only. Analysis uses the original intensities.")).toBeTruthy();
  });

  it("locks when Min, Max, or Auto is committed", () => {
    const onContrastChange = vi.fn();
    const onContrastLockedChange = vi.fn();
    render(() => (
      <ContrastControl
        contrast={null}
        contrastLocked={false}
        frame={frame}
        onContrastChange={onContrastChange}
        onContrastLockedChange={onContrastLockedChange}
      />
    ));

    fireEvent.click(screen.getByRole("button", { name: "Auto" }));
    expect(onContrastLockedChange).toHaveBeenCalledWith(true);
    expect(onContrastChange).toHaveBeenCalledWith({ min: 10, max: 200 });
  });
});

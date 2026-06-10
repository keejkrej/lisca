import type { FrameResult } from "@lisca/utils";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ContrastControl, type ContrastControlState } from "../src/contrast-control";

const frame: FrameResult = {
  width: 1,
  height: 1,
  pixels: new Uint8Array([0]),
  contrastDomain: { min: 0, max: 65535 },
  suggestedContrast: { min: 100, max: 40000 },
  appliedContrast: { min: 100, max: 40000 },
};

describe("ContrastControl", () => {
  it("uses auto contrast when contrast is unset", () => {
    let state: ContrastControlState | null = null;

    render(
      <ContrastControl frame={frame} contrast={null} onContrastChange={vi.fn()}>
        {(next) => {
          state = next;
          return null;
        }}
      </ContrastControl>,
    );

    expect(state?.minValue).toBe(100);
    expect(state?.maxValue).toBe(40000);
    expect(state?.domainMax).toBe(65535);
  });

  it("commits manual min and max updates", () => {
    const onContrastChange = vi.fn();
    let state: ContrastControlState | null = null;

    render(
      <ContrastControl
        frame={frame}
        contrast={{ min: 200, max: 30000 }}
        onContrastChange={onContrastChange}
      >
        {(next) => {
          state = next;
          return null;
        }}
      </ContrastControl>,
    );

    state?.onMinCommit(250);
    state?.onMaxCommit(35000);
    state?.onAutoRange();

    expect(onContrastChange).toHaveBeenNthCalledWith(1, { min: 250, max: 30000 });
    expect(onContrastChange).toHaveBeenNthCalledWith(2, { min: 200, max: 35000 });
    expect(onContrastChange).toHaveBeenNthCalledWith(3, { min: 100, max: 40000 });
  });

  it("disables when frame is missing", () => {
    let state: ContrastControlState | null = null;

    render(
      <ContrastControl frame={null} contrast={null} onContrastChange={vi.fn()}>
        {(next) => {
          state = next;
          return null;
        }}
      </ContrastControl>,
    );

    expect(state?.disabled).toBe(true);
    expect(state?.domainMax).toBe(255);
  });
});

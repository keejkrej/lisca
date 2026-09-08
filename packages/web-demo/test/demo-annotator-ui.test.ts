import { describe, expect, it } from "vitest";

import {
  createInitialDemoAnnotatorUiState,
  demoAnnotatorUiActions,
  type DemoAnnotatorUiState,
} from "../src/atoms/demo-annotator-ui";
import type { StateUpdater } from "../src/atoms/state-utils";
import type { ContrastWindow } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";

function uint16Frame(): FrameResult {
  return {
    width: 2,
    height: 1,
    pixels: new Uint16Array([10000, 50000]),
    pixelType: "uint16",
    contrastDomain: { min: 0, max: 65535 },
    suggestedContrast: { min: 10000, max: 50000 },
    appliedContrast: { min: 10000, max: 50000 },
  };
}

function driveSetContrast(
  initial: DemoAnnotatorUiState,
  contrast: ContrastWindow | null,
): DemoAnnotatorUiState {
  let state = initial;
  const set = (updater: StateUpdater<DemoAnnotatorUiState>) => {
    state =
      typeof updater === "function"
        ? (updater as (s: DemoAnnotatorUiState) => DemoAnnotatorUiState)(state)
        : updater;
  };
  demoAnnotatorUiActions.setContrast(set, contrast);
  return state;
}

describe("demoAnnotatorUiActions.setContrast", () => {
  it("orders an inverted contrast before persisting it", () => {
    const state = {
      ...createInitialDemoAnnotatorUiState(),
      frame: uint16Frame(),
    };
    const next = driveSetContrast(state, { min: 50000, max: 10000 });
    expect(next.contrast).toEqual({ min: 10000, max: 50000 });
  });

  it("expands a zero-width contrast before persisting it", () => {
    const state = {
      ...createInitialDemoAnnotatorUiState(),
      frame: uint16Frame(),
    };
    const next = driveSetContrast(state, { min: 30000, max: 30000 });
    expect(next.contrast).toEqual({ min: 30000, max: 30001 });
  });

  it("persists null contrast unchanged", () => {
    const state = {
      ...createInitialDemoAnnotatorUiState(),
      frame: uint16Frame(),
    };
    const next = driveSetContrast(state, null);
    expect(next.contrast).toBeNull();
  });

  it("leaves an ordered contrast ordered (rounded to integers)", () => {
    const state = {
      ...createInitialDemoAnnotatorUiState(),
      frame: uint16Frame(),
    };
    const next = driveSetContrast(state, { min: 10000.4, max: 50000.6 });
    expect(next.contrast).toEqual({ min: 10000, max: 50001 });
  });

  it("always persists min < max for degenerate inputs", () => {
    const state = {
      ...createInitialDemoAnnotatorUiState(),
      frame: uint16Frame(),
    };
    for (const contrast of [
      { min: 50000, max: 10000 },
      { min: 30000, max: 30000 },
      { min: 65535, max: 65535 },
      { min: 0, max: 0 },
      { min: 65535, max: 0 },
    ]) {
      const next = driveSetContrast(state, contrast);
      expect(next.contrast!.min).toBeLessThan(next.contrast!.max);
      expect(next.contrast!.min).toBeGreaterThanOrEqual(0);
      expect(next.contrast!.max).toBeLessThanOrEqual(65535);
    }
  });

  it("does not alter unrelated state", () => {
    const state = {
      ...createInitialDemoAnnotatorUiState(),
      frame: uint16Frame(),
      brushSize: 12,
      overlayOpacity: 0.7,
    };
    const next = driveSetContrast(state, { min: 50000, max: 10000 });
    expect(next.brushSize).toBe(12);
    expect(next.overlayOpacity).toBe(0.7);
    expect(next.frame).toBe(state.frame);
  });
});

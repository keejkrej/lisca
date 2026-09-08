import { describe, expect, it } from "vitest";

import {
  createInitialDemoAlignUiState,
  demoAlignUiActions,
  mergeDemoAlignSession,
  normalizePersistedAlignToolMode,
  selectDemoAlignSession,
  type DemoAlignUiState,
} from "../src/atoms/demo-align-ui";
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
  initial: DemoAlignUiState,
  contrast: ContrastWindow | null,
): DemoAlignUiState {
  let state = initial;
  const set = (updater: StateUpdater<DemoAlignUiState>) => {
    state =
      typeof updater === "function"
        ? (updater as (s: DemoAlignUiState) => DemoAlignUiState)(state)
        : updater;
  };
  demoAlignUiActions.setContrast(set, contrast);
  return state;
}

describe("persisted align tool migration", () => {
  it("migrates the retired zoom mode to Magnifier", () => {
    const current = createInitialDemoAlignUiState();
    const session = {
      ...selectDemoAlignSession(current),
      toolMode: "zoom",
    } as unknown as Parameters<typeof mergeDemoAlignSession>[0];

    expect(mergeDemoAlignSession(session, current).toolMode).toBe("magnifier");
  });

  it("falls back to Pan for an unknown persisted mode", () => {
    expect(normalizePersistedAlignToolMode("future-tool")).toBe("pan");
    expect(normalizePersistedAlignToolMode(null)).toBe("pan");
  });
});

describe("demoAlignUiActions.setContrast", () => {
  it("orders an inverted contrast before persisting it", () => {
    const state = { ...createInitialDemoAlignUiState(), frame: uint16Frame() };
    expect(driveSetContrast(state, { min: 50000, max: 10000 }).contrast).toEqual({
      min: 10000,
      max: 50000,
    });
  });

  it("expands a zero-width contrast before persisting it", () => {
    const state = { ...createInitialDemoAlignUiState(), frame: uint16Frame() };
    expect(driveSetContrast(state, { min: 30000, max: 30000 }).contrast).toEqual({
      min: 30000,
      max: 30001,
    });
  });

  it("persists null contrast unchanged", () => {
    const state = { ...createInitialDemoAlignUiState(), frame: uint16Frame() };
    expect(driveSetContrast(state, null).contrast).toBeNull();
  });

  it("always persists min < max for degenerate inputs", () => {
    const state = { ...createInitialDemoAlignUiState(), frame: uint16Frame() };
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
});

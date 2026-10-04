import { cleanup, render, screen } from "@solidjs/testing-library";
import { createDefaultAlignGrid } from "@lisca/utils";
import { createSignal, type Accessor, type JSX } from "solid-js";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { StudioAlignInstrumentStack } from "../src/components/studio-align-instrument-stack";
import {
  StudioAlignPageContext,
  type StudioAlignPageContextValue,
} from "../src/state/studio-align-page-context";
import type { StudioAlignState } from "../src/state/use-studio-align-state";

const positions = [61, 62, 63, 64];

function pageValue(pos: Accessor<number>): StudioAlignPageContextValue {
  const state = {
    get alignPositions() {
      return positions;
    },
    get selection() {
      return { pos: pos(), channel: 0, time: 20, z: 0 };
    },
    get frame() {
      return { width: 8, height: 8 };
    },
    get scan() {
      return {
        positions,
        channels: [0],
        times: [0, 10, 20],
        zSlices: [0],
      };
    },
    get contrast() {
      return null;
    },
    get grid() {
      return createDefaultAlignGrid();
    },
    get effectiveGrid() {
      return createDefaultAlignGrid();
    },
    get toolMode() {
      return "pan" as const;
    },
    get spacingZoomLocked() {
      return true;
    },
    get patternZoomLocked() {
      return true;
    },
    get manualExclusionEnabled() {
      return false;
    },
    get currentExcludedPatterns() {
      return [];
    },
    get visibleCounts() {
      return { included: 1, excluded: 0 };
    },
    get variationExcludePreview() {
      return null;
    },
    get saving() {
      return false;
    },
    get preparingCrop() {
      return false;
    },
    get cropping() {
      return false;
    },
    setSelection: () => {},
    changePosition: () => {},
    setContrast: () => {},
    setGrid: () => {},
    setToolMode: () => {},
    setSpacingZoomLocked: () => {},
    setPatternZoomLocked: () => {},
    setManualExclusionEnabled: () => {},
    setExcludedPatternsForCurrentPosition: () => {},
    setVariationExcludeThreshold: () => {},
    saveCurrentPosition: async () => true,
    goBack: () => {},
    goNext: () => {},
    requestCrop: async () => {},
  } as unknown as StudioAlignState;

  return {
    state,
    smartExclude: { active: () => false, request: async () => {} },
    varExclude: { active: () => false },
    excludeActive: () => false,
    requestVarExclude: async () => {},
    applyExcludePreview: () => {},
    cancelExcludePreview: () => {},
  } as StudioAlignPageContextValue;
}

function renderStack(pos: Accessor<number>, expert = false): void {
  const value = pageValue(pos);
  const view = (props: { children: JSX.Element }) => (
    <StudioAlignPageContext.Provider value={value}>
      {props.children}
    </StudioAlignPageContext.Provider>
  );
  render(() => <StudioAlignInstrumentStack expert={expert} />, { wrapper: view });
}

afterEach(cleanup);

describe("Studio Align position buttons", () => {
  it("enables Next on the first position and shows the frame slider", () => {
    const [pos] = createSignal(61);
    renderStack(pos);

    expect(screen.getByRole("button", { name: "Back" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Next" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByText("20 (3/3)")).toBeTruthy();
    expect(screen.queryByText("Contrast")).toBeNull();
  });

  it("enables Back and disables Next on the last position", () => {
    const [pos, setPos] = createSignal(61);
    renderStack(pos);
    setPos(64);

    expect(screen.getByRole("button", { name: "Back" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Next" }).hasAttribute("disabled")).toBe(true);
  });

  it("keeps full navigation in expert mode", () => {
    const [pos] = createSignal(62);
    renderStack(pos, true);

    expect(screen.getByText("Navigation")).toBeTruthy();
    expect(screen.getByText("Contrast")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Back" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Next" }).hasAttribute("disabled")).toBe(false);
  });
});

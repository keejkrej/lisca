import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { createDefaultAlignGrid } from "@lisca/utils";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AlignEditToggle } from "../src/features/align/align-edit-toggle";
import { AlignGrid } from "../src/features/align/align-grid";
import { AlignSelectionRail } from "../src/features/align/align-selection-rail";

afterEach(cleanup);

describe("instrument rail state toggles", () => {
  it("keeps a persistent indicator and pressed semantics on Show", () => {
    const onReset = vi.fn();

    function Harness() {
      const [visible, setVisible] = createSignal(false);

      return (
        <div class="lisca-instrument-shell">
          <AlignGrid
            offsetX={0}
            offsetY={0}
            overlayOpacity={0.65}
            overlayVisible={visible()}
            patternHeight={128}
            patternWidth={128}
            rotationDegrees={0}
            sectionAppearance="rail"
            shape="rect"
            spacingA={160}
            spacingB={160}
            onOffsetXChange={() => undefined}
            onOffsetYChange={() => undefined}
            onOverlayOpacityChange={() => undefined}
            onOverlayVisibleChange={setVisible}
            onPatternHeightChange={() => undefined}
            onPatternWidthChange={() => undefined}
            onReset={onReset}
            onRotationDegreesChange={() => undefined}
            onShapeChange={() => undefined}
            onSpacingAChange={() => undefined}
            onSpacingBChange={() => undefined}
          />
        </div>
      );
    }

    render(() => <Harness />);

    const show = screen.getByRole("button", { name: "Show grid overlay" });
    const indicator = show.querySelector('[data-slot="instrument-toggle-indicator"]');
    const reset = screen.getByRole("button", { name: "Reset" });

    expect(show.getAttribute("aria-pressed")).toBe("false");
    expect(indicator?.getAttribute("data-state")).toBe("off");
    expect(indicator?.querySelector("svg")).toBeNull();
    expect(reset.hasAttribute("data-instrument-state-toggle")).toBe(false);
    expect(reset.querySelector('[data-slot="instrument-toggle-indicator"]')).toBeNull();

    fireEvent.click(show);

    expect(show.getAttribute("aria-pressed")).toBe("true");
    expect(indicator?.getAttribute("data-state")).toBe("on");
    expect(indicator?.querySelector("svg")).toBeTruthy();
  });

  it("uses the same explicit off/on affordance for Edit", () => {
    function Harness() {
      const [enabled, setEnabled] = createSignal(false);
      return (
        <div class="lisca-instrument-shell">
          <AlignEditToggle enabled={enabled()} onEnabledChange={setEnabled} />
        </div>
      );
    }

    render(() => <Harness />);

    const edit = screen.getByRole("button", { name: "Edit site exclusions" });
    const indicator = edit.querySelector('[data-slot="instrument-toggle-indicator"]');

    expect(edit.getAttribute("aria-pressed")).toBe("false");
    expect(indicator?.getAttribute("data-state")).toBe("off");

    fireEvent.click(edit);

    expect(edit.getAttribute("aria-pressed")).toBe("true");
    expect(indicator?.getAttribute("data-state")).toBe("on");
    expect(indicator?.querySelector("svg")).toBeTruthy();
  });

  it("omits selection counts from the compact rail while preserving classic output", () => {
    const selectionProps = {
      excludedCells: [],
      frame: null,
      grid: createDefaultAlignGrid(),
      manualExclusionEnabled: false,
      showVariationExcludeDialog: false,
      variationExcludePreview: null,
      visibleCounts: { included: 24, excluded: 3 },
      onApplyVariationExclude: () => undefined,
      onCancelVariationExclude: () => undefined,
      onExcludedCellsChange: () => undefined,
      onManualExclusionEnabledChange: () => undefined,
      onSmartExclude: () => undefined,
      onVariationExclude: () => undefined,
      onVariationExcludeThresholdChange: () => undefined,
    };

    const classic = render(() => <AlignSelectionRail {...selectionProps} />);
    expect(screen.getByText("Included cells")).toBeTruthy();
    expect(screen.getByText("Excluded cells")).toBeTruthy();
    classic.unmount();

    render(() => <AlignSelectionRail {...selectionProps} sectionAppearance="rail" />);
    expect(screen.queryByText("Included cells")).toBeNull();
    expect(screen.queryByText("Excluded cells")).toBeNull();
  });
});

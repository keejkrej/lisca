import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { createDefaultAlignGrid } from "@lisca/utils";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { AlignEditToggle } from "../src/align/align-edit-toggle";
import { AlignGrid } from "../src/align/align-grid";
import { AlignSelectionRail } from "../src/align/align-selection-rail";
import { cleanupMounted, clickElement, flushMicrotasks, mountTest } from "./render-helper";

afterEach(cleanupMounted);

function getButton(root: ParentNode, name: string): HTMLButtonElement {
  const button = [...root.querySelectorAll("button")].find(
    (el) => (el.getAttribute("aria-label") ?? el.textContent?.trim()) === name,
  );
  if (!button) throw new Error(`Button not found: ${name}`);
  return button;
}

describe("instrument rail state toggles", () => {
  it("keeps a persistent indicator and pressed semantics on Show", async () => {
    const onReset = vi.fn();
    const Msg = UiSchema.TaggedEnum({
      SetVisible: { visible: Schema.Boolean },
      Reset: {},
      Noop: {},
    });

    const Harness = Html.component({
      name: "AlignGridToggleHarness",
      model: Schema.Struct({ visible: Schema.Boolean }),
      message: Msg,
    }).make({
      init: () => ({ visible: false }),
      update: {
        SetVisible: ($, { visible }) => $.evolve({ visible }),
        Reset: ($) => {
          onReset();
          return $.model;
        },
        Noop: ($) => $.model,
      },
      view: (h, model) =>
        h.div.class("lisca-instrument-shell").children(
          AlignGrid(h, {
            offsetX: 0,
            offsetY: 0,
            overlayOpacity: 0.65,
            overlayVisible: model.visible,
            patternHeight: 128,
            patternWidth: 128,
            rotationDegrees: 0,
            sectionAppearance: "rail",
            shape: "rect",
            spacingA: 160,
            spacingB: 160,
            onOffsetXChange: () => undefined,
            onOffsetYChange: () => undefined,
            onOverlayOpacityChange: () => undefined,
            onOverlayVisibleChange: (visible) => Msg.SetVisible({ visible }),
            onPatternHeightChange: () => undefined,
            onPatternWidthChange: () => undefined,
            onReset: Msg.Reset(),
            onRotationDegreesChange: () => undefined,
            onShapeChange: () => undefined,
            onSpacingAChange: () => undefined,
            onSpacingBChange: () => undefined,
          }),
        ),
    });

    const { container } = await mountTest(Harness, {});

    const show = getButton(container, "Show grid overlay");
    const indicator = show.querySelector('[data-slot="instrument-toggle-indicator"]');
    const reset = getButton(container, "Reset");

    expect(show.getAttribute("aria-pressed")).toBe("false");
    expect(indicator?.getAttribute("data-state")).toBe("off");
    expect(indicator?.querySelector("svg")).toBeNull();
    expect(reset.hasAttribute("data-instrument-state-toggle")).toBe(false);
    expect(reset.querySelector('[data-slot="instrument-toggle-indicator"]')).toBeNull();

    clickElement(show);
    await flushMicrotasks();

    const updatedIndicator = show.querySelector('[data-slot="instrument-toggle-indicator"]');
    expect(show.getAttribute("aria-pressed")).toBe("true");
    expect(updatedIndicator?.getAttribute("data-state")).toBe("on");
    expect(updatedIndicator?.querySelector("svg")).toBeTruthy();
  });

  it("uses the same explicit off/on affordance for Edit", async () => {
    const Msg = UiSchema.TaggedEnum({
      SetEnabled: { enabled: Schema.Boolean },
    });

    const Harness = Html.component({
      name: "AlignEditToggleHarness",
      model: Schema.Struct({ enabled: Schema.Boolean }),
      message: Msg,
    }).make({
      init: () => ({ enabled: false }),
      update: {
        SetEnabled: ($, { enabled }) => $.evolve({ enabled }),
      },
      view: (h, model) =>
        h.div.class("lisca-instrument-shell").children(
          AlignEditToggle(h, {
            enabled: model.enabled,
            onEnabledChange: (enabled) => Msg.SetEnabled({ enabled }),
          }),
        ),
    });

    const { container } = await mountTest(Harness, {});

    const edit = getButton(container, "Edit pattern exclusions");
    const indicator = edit.querySelector('[data-slot="instrument-toggle-indicator"]');

    expect(edit.getAttribute("aria-pressed")).toBe("false");
    expect(indicator?.getAttribute("data-state")).toBe("off");

    clickElement(edit);
    await flushMicrotasks();

    const updatedIndicator = edit.querySelector('[data-slot="instrument-toggle-indicator"]');
    expect(edit.getAttribute("aria-pressed")).toBe("true");
    expect(updatedIndicator?.getAttribute("data-state")).toBe("on");
    expect(updatedIndicator?.querySelector("svg")).toBeTruthy();
  });

  it("omits selection counts from the compact rail while preserving classic output", async () => {
    const Msg = UiSchema.TaggedEnum({ Noop: {} });

    const makeHost = (appearance?: "framed" | "rail") =>
      Html.component({
        name: `AlignSelectionRailHost_${appearance ?? "classic"}`,
        model: Schema.Struct({}),
        message: Msg,
      }).make({
        init: () => ({}),
        update: { Noop: ($) => $.model },
        view: (h) =>
          AlignSelectionRail(h, {
            excludedPatterns: [],
            frame: null,
            grid: createDefaultAlignGrid(),
            manualExclusionEnabled: false,
            showVariationExcludeDialog: false,
            variationExcludePreview: null,
            visibleCounts: { included: 24, excluded: 3 },
            onApplyVariationExclude: Msg.Noop(),
            onCancelVariationExclude: Msg.Noop(),
            onExcludedPatternsChange: () => undefined,
            onManualExclusionEnabledChange: () => undefined,
            onVariationExclude: Msg.Noop(),
            onVariationExcludeThresholdChange: () => undefined,
            ...(appearance !== undefined ? { sectionAppearance: appearance } : {}),
          }),
      });

    const classic = await mountTest(makeHost(), {});
    expect(classic.container.textContent).toContain("Included patterns");
    expect(classic.container.textContent).toContain("Excluded patterns");
    await classic.unmount();

    const rail = await mountTest(makeHost("rail"), {});
    expect(rail.container.textContent).not.toContain("Included patterns");
    expect(rail.container.textContent).not.toContain("Excluded patterns");
  });
});

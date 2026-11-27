import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { createDefaultAlignGrid } from "@lisca/utils";
import { Schema } from "effect";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { StudioAlignInstrumentStack } from "../src/components/studio-align-instrument-stack";
import type { StudioAlignState } from "../src/state/use-studio-align-state";
import { cleanupMounted, flushMicrotasks, keyDownElement, mountTest } from "./render-helper";

const positions = [61, 62, 63, 64];

function makeAlignState(pos: number, time: number): StudioAlignState {
  return {
    alignPositions: positions,
    selection: { pos, channel: 0, time, z: 0 },
    frame: { width: 8, height: 8 },
    scan: {
      positions,
      channels: [0],
      times: [0, 10, 20],
      zSlices: [0],
    },
    contrast: null,
    contrastLocked: false,
    grid: createDefaultAlignGrid(),
    effectiveGrid: createDefaultAlignGrid(),
    drift: null,
    assayDefaultTime: 0,
    toolMode: "pan" as const,
    spacingZoomLocked: true,
    patternZoomLocked: true,
    manualExclusionEnabled: false,
    currentExcludedPatterns: [],
    visibleCounts: { included: 1, excluded: 0 },
    variationExcludePreview: null,
    saving: false,
    preparingCrop: false,
    cropping: false,
    detecting: false,
    detectReport: null,
    detectLowConfidence: false,
  } as unknown as StudioAlignState;
}

const StackHostMsg = UiSchema.TaggedEnum({
  Noop: {},
  SetPos: { pos: Schema.Number },
  SetTime: { time: Schema.Number },
});

const StackHost = Html.component({
  name: "StudioAlignPositionNavHost",
  props: Schema.Struct({
    initialPos: Schema.Number,
    initialTime: Schema.Number,
    expert: Schema.Boolean,
  }),
  model: Schema.Struct({
    pos: Schema.Number,
    time: Schema.Number,
  }),
  message: StackHostMsg,
}).make({
  init: ($) => $.set({ pos: $.props.initialPos, time: $.props.initialTime }),
  update: {
    Noop: ($) => $.model,
    SetPos: ($, { pos }) => $.evolve({ pos }),
    SetTime: ($, { time }) => $.evolve({ time }),
  },
  view: (h, model) =>
    StudioAlignInstrumentStack(h, {
      state: makeAlignState(model.pos, model.time),
      expert: h.props.expert,
      varExcludeActive: false,
      onChangePosition: (pos) => StackHostMsg.SetPos({ pos }),
      onSelectionChange: (patch) =>
        typeof patch.time === "number"
          ? StackHostMsg.SetTime({ time: patch.time })
          : StackHostMsg.Noop(),
      onContrastChange: () => StackHostMsg.Noop(),
      onContrastLockedChange: () => StackHostMsg.Noop(),
      onDetectGrid: () => StackHostMsg.Noop(),
      onGridChange: () => StackHostMsg.Noop(),
      onTranslationDelta: () => StackHostMsg.Noop(),
      onClearDrift: StackHostMsg.Noop(),
      onClearKeyframe: StackHostMsg.Noop(),
      onDeltaChange: () => StackHostMsg.Noop(),
      onSetKeyframe: StackHostMsg.Noop(),
      onSetReference: StackHostMsg.Noop(),
      onToolModeChange: () => StackHostMsg.Noop(),
      onSpacingZoomLockedChange: () => StackHostMsg.Noop(),
      onPatternZoomLockedChange: () => StackHostMsg.Noop(),
      onManualExclusionEnabledChange: () => StackHostMsg.Noop(),
      onExcludedPatternsChange: () => StackHostMsg.Noop(),
      onVariationExclude: StackHostMsg.Noop(),
      onApplyVariationExclude: StackHostMsg.Noop(),
      onCancelVariationExclude: StackHostMsg.Noop(),
      onVariationExcludeThresholdChange: () => StackHostMsg.Noop(),
      onSave: StackHostMsg.Noop(),
      onBack: StackHostMsg.Noop(),
      onNext: StackHostMsg.Noop(),
      onCrop: StackHostMsg.Noop(),
    }),
});

function findButton(root: ParentNode, name: string): HTMLButtonElement | null {
  return (
    (Array.from(root.querySelectorAll("button")).find(
      (btn) => btn.textContent?.trim() === name || btn.getAttribute("aria-label") === name,
    ) as HTMLButtonElement | undefined) ?? null
  );
}

afterEach(cleanupMounted);

describe("Studio Align position buttons", () => {
  it("enables Next on the first position and shows Channel, Frame, and Contrast", async () => {
    const { container } = await mountTest(StackHost, {
      initialPos: 61,
      initialTime: 20,
      expert: false,
    });

    expect(findButton(container, "Back")?.hasAttribute("disabled")).toBe(true);
    expect(findButton(container, "Next")?.hasAttribute("disabled")).toBe(false);
    expect(container.textContent).toContain("Navigation");
    expect(container.textContent).toContain("Channel");
    expect(container.textContent).toContain("Frame");
    expect(container.textContent).toContain("20 (3/3)");
    expect(container.textContent).toContain("Contrast");
    expect(container.textContent).not.toContain("Position");
    expect(container.textContent).not.toContain("Z plane");
    expect(findButton(container, "Drift")).toBeNull();
    expect(findButton(container, "Auto-detect")).not.toBeNull();
  });

  it("enables Back and disables Next on the last position", async () => {
    const { container, root } = await mountTest(StackHost, {
      initialPos: 61,
      initialTime: 20,
      expert: false,
    });

    root.send(StackHostMsg.SetPos({ pos: 64 }));
    await flushMicrotasks();

    expect(findButton(container, "Back")?.hasAttribute("disabled")).toBe(false);
    expect(findButton(container, "Next")?.hasAttribute("disabled")).toBe(true);
  });

  it("keeps full navigation in expert mode", async () => {
    const { container } = await mountTest(StackHost, {
      initialPos: 62,
      initialTime: 20,
      expert: true,
    });

    expect(container.textContent).toContain("Navigation");
    expect(container.textContent).toContain("Position");
    expect(container.textContent).toContain("Channel");
    expect(container.textContent).toContain("Frame");
    expect(container.textContent).toContain("Z plane");
    expect(container.textContent).toContain("Contrast");
    expect(findButton(container, "Drift")).not.toBeNull();
    expect(container.querySelector('input[type="number"][aria-label="dx"]')).not.toBeNull();
    expect(findButton(container, "Back")?.hasAttribute("disabled")).toBe(false);
    expect(findButton(container, "Next")?.hasAttribute("disabled")).toBe(false);
  });

  it("steps Frame globally via [/] outside inputs", async () => {
    const { container } = await mountTest(StackHost, {
      initialPos: 61,
      initialTime: 10,
      expert: false,
    });
    await flushMicrotasks();

    expect(container.textContent).toContain("10 (2/3)");

    keyDownElement(document, "]");
    await flushMicrotasks();
    expect(container.textContent).toContain("20 (3/3)");

    keyDownElement(document, "[");
    await flushMicrotasks();
    expect(container.textContent).toContain("10 (2/3)");

    keyDownElement(document, "[");
    await flushMicrotasks();
    expect(container.textContent).toContain("0 (1/3)");

    keyDownElement(document, "]");
    await flushMicrotasks();
    expect(container.textContent).toContain("10 (2/3)");

    const input = document.createElement("input");
    document.body.appendChild(input);
    keyDownElement(input, "]");
    keyDownElement(input, "[");
    await flushMicrotasks();
    expect(container.textContent).toContain("10 (2/3)");
    input.remove();
  });
});
